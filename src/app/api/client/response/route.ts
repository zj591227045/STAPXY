// 客户端响应API端点 - 处理客户端提交的响应
import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '@/lib/environment';
import { verifyAccessKey } from '@/lib/auth';
import { ProxyResponse } from '@/types';

// 处理客户端提交响应
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, accessKey, subdomain, requestId, response } = body;

    // 验证必需参数
    if (!siteId || !accessKey || !requestId || !response) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数: siteId, accessKey, requestId, response'
      }, { status: 400 });
    }

    // 验证访问密钥
    if (!verifyAccessKey(accessKey, subdomain)) {
      return NextResponse.json({
        success: false,
        message: '访问密钥无效'
      }, { status: 401 });
    }

    // 验证响应格式
    if (!response.id || !response.status || !response.headers) {
      return NextResponse.json({
        success: false,
        message: '响应格式无效'
      }, { status: 400 });
    }

    // 构建标准响应对象
    const proxyResponse: ProxyResponse = {
      id: response.id,
      status: response.status,
      headers: response.headers,
      body: response.body,
      timestamp: Date.now()
    };

    // 获取连接管理器
    const connManager = getConnectionManager();

    // 提交响应
    let success = false;
    if ('submitResponse' in connManager) {
      success = await connManager.submitResponse(requestId, proxyResponse);
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: '响应提交成功',
        requestId,
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '响应提交失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('客户端响应处理失败:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  }
}
