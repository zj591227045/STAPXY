// WebSocket API端点 - 处理内网站点连接（开发环境）或返回轮询信息（生产环境）
import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager, isServerlessEnvironment } from '@/lib/environment';
import { DynamicRoute } from '@/types';
import { WebSocketMessage, RegisterMessage } from '@/types';
import { verifyAccessKey } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // 在serverless环境中，返回轮询信息而不是WebSocket升级
  if (isServerlessEnvironment()) {
    return NextResponse.json({
      success: true,
      message: 'WebSocket not supported in serverless environment',
      alternative: {
        pollEndpoint: '/api/client/poll',
        responseEndpoint: '/api/client/response',
        method: 'Use HTTP polling instead of WebSocket'
      },
      timestamp: Date.now()
    });
  }

  // 检查是否为WebSocket升级请求
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }

  try {
    // 在开发环境中，返回WebSocket升级响应
    // 实际的WebSocket处理逻辑在server/server.js中
    return new Response(null, {
      status: 101,
      headers: {
        'Upgrade': 'websocket',
        'Connection': 'Upgrade',
      },
    });
  } catch (error) {
    console.error('WebSocket upgrade failed:', error);
    return new Response('WebSocket upgrade failed', { status: 500 });
  }
}

// 处理WebSocket连接的辅助函数（仅在开发环境中使用）

function handleWebSocketConnection(websocket: WebSocket, request: Request) {
  let siteId: string | null = null;
  const connManager = getConnectionManager();

  websocket.onmessage = async (event) => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'register':
          const registerMsg = message as RegisterMessage & {
            accessKey?: string;
            subdomain?: string;
            targetUrl?: string;
          };

          siteId = registerMsg.siteId;
          const targetUrl = registerMsg.targetUrl;
          const accessKey = registerMsg.accessKey;
          const subdomain = registerMsg.subdomain;

          // 验证必需字段
          if (!siteId || !targetUrl || !accessKey || !subdomain) {
            websocket.send(JSON.stringify({
              type: 'error',
              message: 'Missing required fields: siteId, targetUrl, accessKey, subdomain'
            }));
            return;
          }

          // 验证访问密钥（传入子域名用于多密钥模式验证）
          if (!verifyAccessKey(accessKey, subdomain)) {
            websocket.send(JSON.stringify({
              type: 'error',
              message: 'Invalid access key for this subdomain'
            }));
            return;
          }

          // 检查子域名是否可用（仅在传统连接管理器中）
          if ('isSubdomainAvailable' in connManager &&
              !connManager.isSubdomainAvailable(subdomain, siteId)) {
            websocket.send(JSON.stringify({
              type: 'error',
              message: 'Subdomain already in use'
            }));
            return;
          }

          // 创建动态路由
          const route: DynamicRoute = {
            siteId,
            subdomain,
            targetUrl,
            accessKey,
            createdAt: Date.now(),
            lastActive: Date.now()
          };

          // 添加连接到管理器（仅在传统连接管理器中）
          if ('addConnection' in connManager) {
            connManager.addConnection(siteId, websocket, route);
          }

          // 发送确认消息
          websocket.send(JSON.stringify({
            type: 'registered',
            siteId,
            subdomain,
            targetUrl,
            timestamp: Date.now()
          }));

          console.log(`Site ${siteId} registered: ${subdomain} -> ${targetUrl}`);
          break;

        case 'heartbeat':
          // 心跳响应
          websocket.send(JSON.stringify({
            type: 'heartbeat_ack',
            timestamp: Date.now()
          }));
          break;

        case 'response':
          // 响应消息由连接管理器处理
          break;

        default:
          console.warn('Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
      websocket.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format'
      }));
    }
  };

  websocket.onclose = () => {
    if (siteId && 'removeConnection' in connManager) {
      connManager.removeConnection(siteId);
      console.log(`Site ${siteId} disconnected`);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (siteId && 'removeConnection' in connManager) {
      connManager.removeConnection(siteId);
    }
  };

  // 发送欢迎消息
  websocket.send(JSON.stringify({
    type: 'welcome',
    message: 'Connected to static proxy server',
    timestamp: Date.now()
  }));
}

// POST方法用于非WebSocket请求的处理
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (body.action === 'status') {
      // 获取连接管理器
      const connManager = getConnectionManager();

      try {
        let stats: any;

        if ('getConnectionStats' in connManager && typeof connManager.getConnectionStats === 'function') {
          // Serverless连接管理器
          stats = await connManager.getConnectionStats();
        } else if ('getConnectionStats' in connManager) {
          // 传统连接管理器
          stats = (connManager as any).getConnectionStats();
        } else {
          // 备用方案
          stats = { totalConnections: 0, connections: [] };
        }

        return NextResponse.json({
          success: true,
          connections: {
            active: stats.totalConnections || 0,
            total: stats.totalConnections || 0,
            sites: stats.connections?.map((conn: any) => conn.siteId) || []
          },
          routes: stats.connections?.map((conn: any) => ({
            siteId: conn.siteId,
            subdomain: conn.subdomain,
            targetUrl: conn.targetUrl,
            createdAt: conn.createdAt,
            lastActive: conn.lastActive,
            isActive: conn.isActive
          })) || [],
          timestamp: Date.now(),
          environment: isServerlessEnvironment() ? 'serverless' : 'development'
        });
      } catch (statsError) {
        console.error('获取连接统计失败:', statsError);
        return NextResponse.json({
          success: true,
          connections: { active: 0, total: 0, sites: [] },
          routes: [],
          timestamp: Date.now(),
          environment: isServerlessEnvironment() ? 'serverless' : 'development',
          error: 'Failed to get connection stats'
        });
      }
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
