// 管理员配置API端点
import { NextRequest } from 'next/server';
import { configManager } from '../../../../lib/config-manager';
import { verifyAdminAuth, createErrorResponse, createSuccessResponse } from '../../../../lib/auth';

// 获取配置信息
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('需要管理员权限', 401);
    }

    // 获取公开配置（隐藏敏感信息）
    const config = configManager.getPublicConfig();

    return createSuccessResponse('获取配置成功', config);
  } catch (error) {
    console.error('获取配置失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 更新配置
export async function PUT(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('需要管理员权限', 401);
    }

    const body = await request.json();
    const { type, config } = body;

    if (!type || !config) {
      return createErrorResponse('缺少必需参数', 400);
    }

    switch (type) {
      case 'proxy':
        configManager.updateProxyConfig(config);
        break;
      case 'admin_password':
        if (!config.newPassword) {
          return createErrorResponse('新密码不能为空', 400);
        }
        configManager.updateAdminPassword(config.newPassword);
        break;
      default:
        return createErrorResponse('不支持的配置类型', 400);
    }

    return createSuccessResponse('配置更新成功');
  } catch (error) {
    console.error('更新配置失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 重新加载配置
export async function POST(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('需要管理员权限', 401);
    }

    configManager.reloadConfig();

    return createSuccessResponse('配置重新加载成功');
  } catch (error) {
    console.error('重新加载配置失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}
