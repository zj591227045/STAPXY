// 代理API端点 - 处理用户请求转发
import { NextRequest } from 'next/server';
import { getConnectionManager } from '../../../lib/environment';
import { ProxyRequest } from '../../../types';
import { v4 as uuidv4 } from 'uuid';

// 处理所有HTTP方法
export async function GET(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function POST(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function PUT(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function DELETE(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function PATCH(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function HEAD(request: NextRequest) {
  return handleProxyRequest(request);
}

export async function OPTIONS(request: NextRequest) {
  return handleProxyRequest(request);
}

async function handleProxyRequest(request: NextRequest): Promise<Response> {
  try {
    // 获取Host头
    const host = request.headers.get('host');
    if (!host) {
      return new Response('Host header is required', { status: 400 });
    }

    // 获取连接管理器
    const connManager = getConnectionManager();

    // 根据子域名获取站点ID
    let siteId: string | null = null;
    if ('getSiteIdByHost' in connManager) {
      siteId = await connManager.getSiteIdByHost(host);
    }

    if (!siteId) {
      return new Response(`No route configured for host: ${host}`, { status: 404 });
    }

    // 构建代理请求
    const url = new URL(request.url);
    const proxyRequest: ProxyRequest = {
      id: uuidv4(),
      method: request.method,
      url: url.pathname + url.search,
      headers: Object.fromEntries(request.headers.entries()),
      body: request.method !== 'GET' && request.method !== 'HEAD' 
        ? await request.text() 
        : undefined,
      timestamp: Date.now()
    };

    // 清理不需要转发的头部
    delete proxyRequest.headers['host'];
    delete proxyRequest.headers['connection'];
    delete proxyRequest.headers['upgrade'];
    delete proxyRequest.headers['sec-websocket-key'];
    delete proxyRequest.headers['sec-websocket-version'];
    delete proxyRequest.headers['sec-websocket-extensions'];

    try {
      // 发送请求到内网站点
      const proxyResponse = await connManager.sendRequest(siteId, proxyRequest);

      // 构建响应头
      const responseHeaders = new Headers();
      
      // 添加CORS头
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      // 添加代理响应头
      Object.entries(proxyResponse.headers).forEach(([key, value]) => {
        // 跳过一些不应该转发的头部
        if (!['connection', 'transfer-encoding', 'content-encoding'].includes(key.toLowerCase())) {
          responseHeaders.set(key, value);
        }
      });

      // 添加代理标识头
      responseHeaders.set('X-Proxy-Site', siteId);
      responseHeaders.set('X-Proxy-Timestamp', proxyResponse.timestamp.toString());

      return new Response(proxyResponse.body, {
        status: proxyResponse.status,
        headers: responseHeaders
      });

    } catch (error) {
      console.error(`Proxy request failed for site ${siteId}:`, error);
      
      if (error instanceof Error && error.message.includes('timeout')) {
        return new Response('Gateway timeout', { status: 504 });
      }
      
      return new Response('Bad gateway', { status: 502 });
    }

  } catch (error) {
    console.error('Proxy handler error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}


