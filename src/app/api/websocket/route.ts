// WebSocket API端点 - 处理内网站点连接
import { NextRequest } from 'next/server';
import { connectionManager, DynamicRoute } from '@/lib/connection-manager';
import { subdomainRouter } from '@/lib/subdomain-router';
import { WebSocketMessage, RegisterMessage } from '@/types';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { configManager } from '@/lib/config-manager';
import { verifyAccessKey } from '@/lib/auth';

export async function GET(request: NextRequest) {
  // 检查是否为WebSocket升级请求
  const upgrade = request.headers.get('upgrade');
  if (upgrade !== 'websocket') {
    return new Response('Expected WebSocket upgrade', { status: 400 });
  }

  try {
    // 在Vercel Edge Runtime中，我们需要使用不同的方式处理WebSocket
    // 这里我们返回一个特殊的响应，实际的WebSocket处理会在Edge Function中进行
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

// 处理WebSocket连接的辅助函数
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function handleWebSocketConnection(websocket: WebSocket, request: Request) {
  let siteId: string | null = null;

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

          // 检查子域名是否可用
          if (!connectionManager.isSubdomainAvailable(subdomain, siteId)) {
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

          // 添加连接到管理器
          connectionManager.addConnection(siteId, websocket, route);

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
    if (siteId) {
      connectionManager.removeConnection(siteId);
      console.log(`Site ${siteId} disconnected`);
    }
  };

  websocket.onerror = (error) => {
    console.error('WebSocket error:', error);
    if (siteId) {
      connectionManager.removeConnection(siteId);
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
      // 从全局连接管理器获取状态
      const connectionManager = (global as any).connectionManager;

      if (connectionManager) {
        const stats = connectionManager.getConnectionStats();
        return Response.json({
          success: true,
          connections: {
            active: stats.totalConnections,
            total: stats.totalConnections,
            sites: stats.connections.map((conn: any) => conn.siteId)
          },
          routes: stats.connections.map((conn: any) => ({
            siteId: conn.siteId,
            subdomain: conn.subdomain,
            targetUrl: conn.targetUrl,
            createdAt: conn.createdAt,
            lastActive: conn.lastActive
          })),
          timestamp: Date.now()
        });
      } else {
        // 如果在 Vercel 环境中，返回空状态
        return Response.json({
          success: true,
          connections: {
            active: 0,
            total: 0,
            sites: []
          },
          routes: [],
          timestamp: Date.now(),
          note: 'Running in serverless environment'
        });
      }
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
