// 访问密钥管理API
import { NextRequest } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { verifyAdminAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// 获取所有访问密钥
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('未授权访问', 401);
    }

    const keys = configManager.getAccessKeys();
    return createSuccessResponse('获取密钥列表成功', keys);

  } catch (error) {
    console.error('获取密钥列表失败:', error);
    return createErrorResponse('获取密钥列表失败', 500);
  }
}

// 静态部署模式下不支持动态创建密钥
export async function POST() {
  return createErrorResponse('静态部署模式下不支持创建新密钥，请在配置文件中预定义', 403);
}

// 静态部署模式下不支持删除密钥
export async function DELETE() {
  return createErrorResponse('静态部署模式下不支持删除密钥，请在配置文件中修改', 403);
}

// 启用/禁用访问密钥
export async function PATCH(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('未授权访问', 401);
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return createErrorResponse('密钥ID不能为空', 400);
    }

    const success = configManager.toggleAccessKey(id);
    if (!success) {
      return createErrorResponse('密钥不存在', 404);
    }

    return createSuccessResponse('密钥状态更新成功');

  } catch (error) {
    console.error('更新密钥状态失败:', error);
    return createErrorResponse('更新密钥状态失败', 500);
  }
}
