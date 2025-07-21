// Next.js中间件 - 处理请求路由
import { NextRequest, NextResponse } from 'next/server';
import { subdomainRouter } from './lib/subdomain-router';

// 简化的管理域名检查（避免在Edge Runtime中使用Node.js模块）
function isAdminDomain(host: string): boolean {
  const hostname = host.split(':')[0];
  // 默认管理域名配置
  const adminDomains = ['admin.localhost', 'admin.yourdomain.com'];
  return adminDomains.includes(hostname);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get('host') || '';

  // 首先检查是否为管理域名
  const isAdmin = isAdminDomain(host);

  // 对于管理域名，只允许访问管理界面和API
  if (isAdmin) {
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.') ||
      pathname === '/'
    ) {
      return NextResponse.next();
    }

    // 管理域名的其他路径重定向到首页
    return NextResponse.redirect(new URL('/', request.url));
  }

  // 检查是否为配置的子域名（排除管理域名）
  const siteId = subdomainRouter.getSiteIdByHost(host);

  // 对于主域名，跳过API路由和静态资源
  if (!siteId) {
    if (
      pathname.startsWith('/api/') ||
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/favicon.ico') ||
      pathname.includes('.')
    ) {
      return NextResponse.next();
    }

    // 检查是否为WebSocket升级请求
    const upgrade = request.headers.get('upgrade');
    if (upgrade === 'websocket') {
      // 重定向到WebSocket API
      return NextResponse.rewrite(new URL('/api/websocket', request.url));
    }

    // 如果是主域名，显示管理界面
    if (pathname === '/') {
      return NextResponse.next();
    }

    // 其他情况返回404
    return new NextResponse('Not Found', { status: 404 });
  }

  // 对于子域名，所有路径都应该被代理（除了内部资源）
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // 这是一个代理请求，重定向到代理API
  const proxyUrl = new URL('/api/proxy', request.url);
  proxyUrl.search = request.nextUrl.search;
  return NextResponse.rewrite(proxyUrl);
}

export const config = {
  matcher: [
    /*
     * 匹配所有请求路径，除了：
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
