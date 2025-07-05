#!/usr/bin/env node

/**
 * 自定义 Next.js 服务器，集成 WebSocket 支持
 * 本地开发环境使用真实 WebSocket，生产环境兼容 Vercel
 */

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// 初始化 Next.js 应用
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// 连接管理
const connections = new Map(); // siteId -> { websocket, route }
const routes = new Map(); // subdomain -> route

// 配置管理
const CONFIG_PATH = path.join(__dirname, 'config.json');

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('加载配置文件失败:', error);
  }
  
  return {
    admin: {
      password: 'admin123',
      sessionTimeout: 3600000
    },
    auth: {
      mode: 'single',
      singleKey: {
        key: 'sk-universal-access-key',
        description: '通用访问密钥，所有客户端使用此密钥'
      }
    }
  };
}

function verifyAccessKey(accessKey, subdomain, config) {
  if (config.auth.mode === 'single') {
    return accessKey === config.auth.singleKey.key;
  } else if (config.auth.mode === 'multi') {
    const domainConfig = config.auth.multiKeys.domainMappings.find(d => 
      subdomain.includes(d.subdomain) || subdomain.startsWith(d.subdomain.split('.')[0])
    );
    if (domainConfig && accessKey === domainConfig.accessKey) {
      return true;
    }
    return accessKey === config.auth.multiKeys.fallbackKey.key;
  }
  return false;
}

function isSubdomainAvailable(subdomain, siteId) {
  const existingRoute = routes.get(subdomain);
  return !existingRoute || existingRoute.siteId === siteId;
}

// 导出连接管理器供 API 使用
global.connectionManager = {
  getConnections: () => connections,
  getRoutes: () => routes,
  getConnectionStats: () => ({
    totalConnections: connections.size,
    activeRoutes: routes.size,
    connections: Array.from(connections.entries()).map(([siteId, { route }]) => ({
      siteId,
      subdomain: route.subdomain,
      targetUrl: route.targetUrl,
      createdAt: route.createdAt,
      lastActive: route.lastActive
    }))
  })
};

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      
      // 检查是否是代理请求
      const host = req.headers.host;
      if (host && host !== `localhost:${port}` && host !== `127.0.0.1:${port}`) {
        // 这是一个代理请求
        await handleProxyRequest(req, res, host);
        return;
      }
      
      // 正常的 Next.js 请求
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // 创建 WebSocket 服务器
  const wss = new WebSocketServer({
    server,
    path: '/ws'
  });

  wss.on('connection', (ws, request) => {
    console.log('🔗 新的 WebSocket 连接');
    let siteId = null;
    const config = loadConfig();

    // 添加连接调试信息
    console.log(`🔍 WebSocket 连接详情: ${request.socket.remoteAddress}:${request.socket.remotePort}`);

    // 发送欢迎消息
    ws.send(JSON.stringify({
      type: 'welcome',
      message: 'Connected to static proxy server',
      timestamp: Date.now()
    }));

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        switch (message.type) {
          case 'register':
            siteId = handleRegister(message, ws, config);
            console.log(`🔍 注册结果: siteId = ${siteId}`);
            break;
            
          case 'heartbeat':
            console.log(`💓 收到心跳: ${siteId || 'unknown'}`);
            handleHeartbeat(ws);
            break;
            
          case 'response':
            handleProxyResponse(message);
            break;
            
          default:
            console.warn('未知消息类型:', message.type);
        }
      } catch (error) {
        console.error('处理消息错误:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', (code, reason) => {
      console.log(`🔌 WebSocket 连接关闭: code=${code}, reason=${reason.toString()}`);
      if (siteId) {
        console.log(`🔌 站点 ${siteId} 断开连接`);
        connections.delete(siteId);

        for (const [subdomain, route] of routes.entries()) {
          if (route.siteId === siteId) {
            routes.delete(subdomain);
            console.log(`🗑️  清理路由: ${subdomain}`);
          }
        }
      }
    });

    ws.on('error', (error) => {
      console.error(`❌ WebSocket 错误 (${siteId || 'unknown'}):`, error.message);
      if (siteId) {
        connections.delete(siteId);
      }
    });
  });

  function handleRegister(message, ws, config) {
    const { siteId: msgSiteId, targetUrl, accessKey, subdomain } = message;
    
    if (!msgSiteId || !targetUrl || !accessKey || !subdomain) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing required fields: siteId, targetUrl, accessKey, subdomain'
      }));
      return null;
    }

    if (!verifyAccessKey(accessKey, subdomain, config)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid access key for this subdomain'
      }));
      return null;
    }

    if (!isSubdomainAvailable(subdomain, msgSiteId)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Subdomain already in use'
      }));
      return null;
    }

    const route = {
      siteId: msgSiteId,
      subdomain,
      targetUrl,
      accessKey,
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    connections.set(msgSiteId, { websocket: ws, route });
    routes.set(subdomain, route);

    ws.send(JSON.stringify({
      type: 'registered',
      siteId: msgSiteId,
      subdomain,
      targetUrl,
      timestamp: Date.now()
    }));

    console.log(`✅ 站点 ${msgSiteId} 已注册: ${subdomain} -> ${targetUrl}`);
    console.log(`📊 当前活跃连接数: ${connections.size}`);

    return msgSiteId;
  }

  function handleHeartbeat(ws) {
    try {
      ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: Date.now()
      }));
      console.log(`💓 发送心跳确认`);
    } catch (error) {
      console.error(`❌ 发送心跳确认失败: ${error.message}`);
    }
  }

  function handleProxyResponse(message) {
    // 处理来自客户端的代理响应
    console.log('收到代理响应:', message);
  }

  // HTTP 代理处理函数
  async function handleProxyRequest(req, res, host) {
    console.log(`🔄 代理请求: ${host}${req.url}`);

    // 查找对应的路由
    const route = routes.get(host);
    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
        <html>
          <head><title>404 - 站点未找到</title></head>
          <body>
            <h1>404 - 站点未找到</h1>
            <p>子域名 <strong>${host}</strong> 没有对应的注册站点。</p>
            <p>请确保客户端已正确连接并注册。</p>
          </body>
        </html>
      `);
      return;
    }

    // 更新最后活跃时间
    route.lastActive = Date.now();

    // 获取对应的 WebSocket 连接
    const connection = connections.get(route.siteId);
    if (!connection || connection.websocket.readyState !== 1) {
      res.statusCode = 503;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
        <html>
          <head><title>503 - 服务不可用</title></head>
          <body>
            <h1>503 - 服务不可用</h1>
            <p>站点 <strong>${route.siteId}</strong> 的客户端连接已断开。</p>
            <p>请检查客户端是否正常运行。</p>
          </body>
        </html>
      `);
      return;
    }

    // 使用 http/https 模块实现代理
    try {
      const targetUrl = new URL(route.targetUrl);
      const proxyUrl = `${targetUrl.origin}${req.url}`;

      console.log(`📡 转发请求: ${proxyUrl}`);
      console.log(`🔍 请求方法: ${req.method}`);
      console.log(`🔍 目标主机: ${targetUrl.host}`);

      // 选择合适的模块
      const httpModule = targetUrl.protocol === 'https:' ? require('https') : require('http');

      // 准备请求选项
      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
        path: req.url,
        method: req.method,
        headers: {
          ...req.headers,
          'host': targetUrl.host,
          'x-forwarded-for': req.connection.remoteAddress || req.socket.remoteAddress,
          'x-forwarded-proto': req.connection.encrypted ? 'https' : 'http',
          'x-forwarded-host': host
        },
        timeout: 30000 // 30秒超时
      };

      // 删除可能导致问题的头部
      delete options.headers['connection'];
      delete options.headers['upgrade'];

      console.log(`🔍 代理选项:`, JSON.stringify(options, null, 2));

      const proxyReq = httpModule.request(options, (proxyRes) => {
        console.log(`✅ 收到响应: ${proxyRes.statusCode}`);
        console.log(`🔍 响应头:`, JSON.stringify(proxyRes.headers, null, 2));

        // 复制响应头，但需要处理重定向
        Object.keys(proxyRes.headers).forEach(key => {
          const lowerKey = key.toLowerCase();
          if (lowerKey !== 'transfer-encoding') {
            let value = proxyRes.headers[key];

            // 处理重定向头，将目标服务器的地址替换为代理地址
            if (lowerKey === 'location') {
              try {
                const locationUrl = new URL(value, route.targetUrl);
                const targetUrl = new URL(route.targetUrl);

                // 检查是否重定向到目标服务器（考虑端口号可能缺失的情况）
                const isTargetServer = (
                  locationUrl.hostname === targetUrl.hostname &&
                  (locationUrl.port === targetUrl.port ||
                   (locationUrl.port === '' && targetUrl.port === '80') ||
                   (locationUrl.port === '' && targetUrl.port === '443') ||
                   locationUrl.port === '' // 目标服务器可能省略端口号
                  )
                );

                if (isTargetServer) {
                  value = `http://${host}${locationUrl.pathname}${locationUrl.search}${locationUrl.hash}`;
                  console.log(`🔄 重定向地址转换: ${proxyRes.headers[key]} -> ${value}`);
                }
              } catch (error) {
                console.warn(`⚠️ 无法解析重定向地址: ${value}`);
              }
            }

            res.setHeader(key, value);
          }
        });

        // 设置状态码
        res.statusCode = proxyRes.statusCode;

        // 流式传输响应体
        proxyRes.pipe(res);
      });

      // 错误处理
      proxyReq.on('error', (error) => {
        console.error(`❌ 代理请求错误: ${error.message}`);
        if (!res.headersSent) {
          res.statusCode = 502;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`
            <html>
              <head><title>502 - 代理错误</title></head>
              <body>
                <h1>502 - 代理错误</h1>
                <p>无法连接到目标服务器: <strong>${route.targetUrl}</strong></p>
                <p>错误信息: ${error.message}</p>
                <p>请检查目标服务器是否正常运行。</p>
              </body>
            </html>
          `);
        }
      });

      // 超时处理
      proxyReq.on('timeout', () => {
        console.error(`⏰ 代理请求超时: ${proxyUrl}`);
        proxyReq.destroy();
        if (!res.headersSent) {
          res.statusCode = 504;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.end(`
            <html>
              <head><title>504 - 网关超时</title></head>
              <body>
                <h1>504 - 网关超时</h1>
                <p>目标服务器响应超时: <strong>${route.targetUrl}</strong></p>
                <p>请稍后重试。</p>
              </body>
            </html>
          `);
        }
      });

      // 如果有请求体，传输请求体
      if (req.method !== 'GET' && req.method !== 'HEAD') {
        req.pipe(proxyReq);
      } else {
        proxyReq.end();
      }

    } catch (error) {
      console.error(`❌ 代理设置错误: ${error.message}`);
      console.error(`❌ 错误堆栈: ${error.stack}`);
      res.statusCode = 502;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(`
        <html>
          <head><title>502 - 代理错误</title></head>
          <body>
            <h1>502 - 代理错误</h1>
            <p>代理配置错误: <strong>${route.targetUrl}</strong></p>
            <p>错误信息: ${error.message}</p>
          </body>
        </html>
      `);
    }
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 服务器启动成功！`);
    console.log(`📡 Next.js 应用: http://localhost:${port}`);
    console.log(`🔌 WebSocket 端点: ws://localhost:${port}/api/websocket`);
    console.log(`🌐 代理服务: http://*.localhost:${port}`);
    console.log('');
    console.log('🔧 使用 Ctrl+C 停止服务器');
  });
});
