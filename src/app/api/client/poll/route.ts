// 客户端轮询API端点 - 处理客户端轮询请求
import { NextRequest, NextResponse } from 'next/server';
import { getConnectionManager } from '../../../../lib/environment';
import { verifyAccessKey } from '../../../../lib/auth';

// 处理客户端轮询请求
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, accessKey, subdomain } = body;

    // 验证必需参数
    if (!siteId || !accessKey) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数: siteId, accessKey'
      }, { status: 400 });
    }

    // 验证访问密钥
    if (!verifyAccessKey(accessKey, subdomain)) {
      return NextResponse.json({
        success: false,
        message: '访问密钥无效'
      }, { status: 401 });
    }

    // 获取连接管理器
    const connManager = getConnectionManager();

    // 更新站点活跃状态
    if ('updateSiteActivity' in connManager) {
      await connManager.updateSiteActivity(siteId);
    }

    // 获取待处理请求
    let pendingRequest = null;
    if ('getPendingRequest' in connManager) {
      pendingRequest = await connManager.getPendingRequest(siteId);
    }

    if (pendingRequest) {
      return NextResponse.json({
        success: true,
        status: 'request_available',
        request: pendingRequest
      });
    } else {
      return NextResponse.json({
        success: true,
        status: 'no_requests'
      });
    }
  } catch (error) {
    console.error('客户端轮询处理失败:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  }
}

// 处理客户端注册请求
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, subdomain, targetUrl, accessKey } = body;

    // 验证必需参数
    if (!siteId || !subdomain || !targetUrl || !accessKey) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数: siteId, subdomain, targetUrl, accessKey'
      }, { status: 400 });
    }

    // 验证访问密钥
    if (!verifyAccessKey(accessKey, subdomain)) {
      return NextResponse.json({
        success: false,
        message: '访问密钥无效'
      }, { status: 401 });
    }

    // 获取连接管理器
    const connManager = getConnectionManager();

    // 注册站点
    let success = false;
    if ('registerSite' in connManager) {
      success = await connManager.registerSite(siteId, subdomain, targetUrl, accessKey);
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: '站点注册成功',
        siteId,
        subdomain,
        targetUrl,
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '站点注册失败，可能子域名已被使用'
      }, { status: 409 });
    }
  } catch (error) {
    console.error('客户端注册处理失败:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  }
}

// 处理客户端注销请求
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { siteId, accessKey, subdomain } = body;

    // 验证必需参数
    if (!siteId || !accessKey) {
      return NextResponse.json({
        success: false,
        message: '缺少必需参数: siteId, accessKey'
      }, { status: 400 });
    }

    // 验证访问密钥
    if (!verifyAccessKey(accessKey, subdomain)) {
      return NextResponse.json({
        success: false,
        message: '访问密钥无效'
      }, { status: 401 });
    }

    // 获取连接管理器
    const connManager = getConnectionManager();

    // 注销站点
    let success = false;
    if ('unregisterSite' in connManager) {
      success = await connManager.unregisterSite(siteId);
    }

    if (success) {
      return NextResponse.json({
        success: true,
        message: '站点注销成功',
        siteId,
        timestamp: Date.now()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: '站点注销失败'
      }, { status: 500 });
    }
  } catch (error) {
    console.error('客户端注销处理失败:', error);
    return NextResponse.json({
      success: false,
      message: '服务器内部错误'
    }, { status: 500 });
  }
}
