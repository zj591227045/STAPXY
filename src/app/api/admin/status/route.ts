// 管理员状态API端点
import { NextRequest } from 'next/server';
import { connectionManager } from '@/lib/connection-manager';
import { verifyAdminAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// 获取系统状态
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('需要管理员权限', 401);
    }

    // 获取连接统计信息
    const stats = connectionManager.getConnectionStats();
    
    // 构建状态响应
    const status = {
      connections: {
        total: stats.totalConnections,
        active: stats.totalConnections,
        sites: stats.connections.map((conn: any) => conn.siteId)
      },
      routes: {
        totalRoutes: stats.connections.length,
        routes: stats.connections.map((conn: any) => ({
          siteId: conn.siteId,
          subdomain: conn.subdomain,
          targetUrl: conn.targetUrl,
          description: `站点 ${conn.siteId} 的代理路由`,
          createdAt: conn.createdAt,
          lastActive: conn.lastActive
        }))
      },
      timestamp: Date.now(),
      serverInfo: {
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.version
      }
    };

    return createSuccessResponse('获取状态成功', status);
  } catch (error) {
    console.error('获取状态失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
