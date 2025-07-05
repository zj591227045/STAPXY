// 管理员登录API
import { NextRequest } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { sessionManager, createErrorResponse, createSuccessResponse } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return createErrorResponse('密码不能为空', 400);
    }

    // 验证密码
    if (!configManager.verifyAdminPassword(password)) {
      return createErrorResponse('密码错误', 401);
    }

    // 创建会话
    const sessionId = sessionManager.createSession('admin');

    // 创建响应
    const response = createSuccessResponse('登录成功', {
      sessionId,
      expiresIn: 3600000 // 1小时
    });

    // 设置Cookie
    response.headers.set(
      'Set-Cookie',
      `admin_session=${sessionId}; HttpOnly; Path=/; Max-Age=3600; SameSite=Strict`
    );

    return response;

  } catch (error) {
    console.error('登录失败:', error);
    return createErrorResponse('登录失败', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionId = request.cookies.get('admin_session')?.value;
    
    if (sessionId) {
      sessionManager.deleteSession(sessionId);
    }

    const response = createSuccessResponse('退出成功');
    
    // 清除Cookie
    response.headers.set(
      'Set-Cookie',
      'admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Strict'
    );

    return response;

  } catch (error) {
    console.error('退出失败:', error);
    return createErrorResponse('退出失败', 500);
  }
}
