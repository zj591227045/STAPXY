// 管理员访问密钥API端点
import { NextRequest } from 'next/server';
import { configManager } from '@/lib/config-manager';
import { verifyAdminAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth';

// 获取访问密钥列表
export async function GET(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('需要管理员权限', 401);
    }

    // 获取访问密钥列表
    const accessKeys = configManager.getAccessKeys();

    return createSuccessResponse('获取访问密钥成功', {
      keys: accessKeys,
      total: accessKeys.length
    });
  } catch (error) {
    console.error('获取访问密钥失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 切换访问密钥状态（仅在开发模式下可用）
export async function PATCH(request: NextRequest) {
  try {
    // 验证管理员身份
    if (!verifyAdminAuth(request)) {
      return createErrorResponse('需要管理员权限', 401);
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return createErrorResponse('缺少密钥ID', 400);
    }

    // 尝试切换密钥状态
    const success = configManager.toggleAccessKey(id);

    if (!success) {
      return createErrorResponse('无法切换密钥状态，可能是生产模式或新配置格式不支持', 400);
    }

    return createSuccessResponse('密钥状态切换成功');
  } catch (error) {
    console.error('切换密钥状态失败:', error);
    return createErrorResponse('服务器内部错误', 500);
  }
}

// 注意：在静态部署模式下，访问密钥通过配置文件预定义，不支持动态创建/删除
// 如需添加新密钥，请修改 config.json 文件并重启服务
