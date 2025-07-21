// 管理员登录API端点
import { NextRequest } from 'next/server';
import { configManager } from '../../../../lib/config-manager';
import { sessionManager, createErrorResponse, createSuccessResponse } from '../../../../lib/auth';

// 处理登录请求
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return createErrorResponse('密码不能为空', 400);
    }

    // 验证管理员密码
    if (!configManager.verifyAdminPassword(password)) {
      return createErrorResponse('密码错误', 401);
    }

    // 创建会话
    const sessionId = sessionManager.createSession('admin');

    // 设置Cookie
    const response = createSuccessResponse('登录成功', {
      sessionId,
      expiresAt: Date.now() + configManager.getProxyConfig().connectionTimeout
    });

    // 添加Set-Cookie头
    response.headers.set('Set-Cookie', 
      `admin_session=${sessionId}; HttpOnly; Path=/; Max-Age=${Math.floor(configManager.getProxyConfig().connectionTimeout / 1000)}; SameSite=Strict`
    );

    return response;
  } catch (error) {
    console.error('登录处理失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 处理退出登录请求
export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;
    
    if (sessionId) {
      sessionManager.deleteSession(sessionId);
    }

    const response = createSuccessResponse('退出成功');
    
    // 清除Cookie
    response.headers.set('Set-Cookie', 
      'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    );

    return response;
  } catch (error) {
    console.error('退出登录处理失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 处理会话验证请求
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;
    
    if (!sessionId) {
      return createErrorResponse('未登录', 401);
    }

    const userId = sessionManager.validateSession(sessionId);
    if (!userId || userId !== 'admin') {
      return createErrorResponse('会话已过期', 401);
    }

    return createSuccessResponse('会话有效', {
      userId,
      sessionId
    });
  } catch (error) {
    console.error('会话验证失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
