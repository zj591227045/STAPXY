// 管理员配置API
import { NextRequest } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { verifyAdminAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// 获取配置
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('未授权访问', 401);
    }

    const config = configManager.getPublicConfig();
    return createSuccessResponse('获取配置成功', config);

  } catch (error) {
    console.error('获取配置失败:', error);
    return createErrorResponse('获取配置失败', 500);
  }
}

// 更新配置
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('未授权访问', 401);
    }

    const body = await request.json();
    const { type, data } = body;

    switch (type) {
      case 'admin_password':
        if (!data.newPassword) {
          return createErrorResponse('新密码不能为空', 400);
        }
        configManager.updateAdminPassword(data.newPassword);
        return createSuccessResponse('密码更新成功');

      case 'proxy_config':
        configManager.updateProxyConfig(data);
        return createSuccessResponse('代理配置更新成功');

      default:
        return createErrorResponse('未知的配置类型', 400);
    }

  } catch (error) {
    console.error('更新配置失败:', error);
    return createErrorResponse('更新配置失败', 500);
  }
}
