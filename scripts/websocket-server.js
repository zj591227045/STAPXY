#!/usr/bin/env node

/**
 * 独立的 WebSocket 服务器用于本地开发
 * 这个服务器处理客户端连接并管理代理路由
 */

const { WebSocketServer } = require('ws');
const { createServer } = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const WS_PORT = 3001;
const CONFIG_PATH = path.join(__dirname, '../config.json');

// 连接管理
const connections = new Map(); // siteId -> { websocket, route }
const routes = new Map(); // subdomain -> route

// 加载配置
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
      return JSON.parse(configData);
    }
  } catch (error) {
    console.error('加载配置文件失败:', error);
  }
  
  // 默认配置
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

// 验证访问密钥
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
    // 检查备用密钥
    return accessKey === config.auth.multiKeys.fallbackKey.key;
  }
  return false;
}

// 检查子域名是否可用
function isSubdomainAvailable(subdomain, siteId) {
  const existingRoute = routes.get(subdomain);
  return !existingRoute || existingRoute.siteId === siteId;
}

// 创建 HTTP 服务器
const server = createServer();

// 创建 WebSocket 服务器
const wss = new WebSocketServer({ 
  server,
  path: '/api/websocket'
});

console.log(`🚀 WebSocket 服务器启动在端口 ${WS_PORT}`);
console.log(`📡 WebSocket 端点: ws://localhost:${WS_PORT}/api/websocket`);

wss.on('connection', (ws, request) => {
  console.log('🔗 新的 WebSocket 连接');
  let siteId = null;
  const config = loadConfig();

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
          handleRegister(message, ws, config);
          break;
          
        case 'heartbeat':
          handleHeartbeat(ws);
          break;
          
        case 'response':
          // 处理代理响应
          console.log('收到响应消息:', message);
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

  ws.on('close', () => {
    if (siteId) {
      console.log(`🔌 站点 ${siteId} 断开连接`);
      connections.delete(siteId);
      
      // 清理路由
      for (const [subdomain, route] of routes.entries()) {
        if (route.siteId === siteId) {
          routes.delete(subdomain);
          console.log(`🗑️  清理路由: ${subdomain}`);
        }
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
    if (siteId) {
      connections.delete(siteId);
    }
  });

  function handleRegister(message, ws, config) {
    const { siteId: msgSiteId, targetUrl, accessKey, subdomain } = message;
    
    // 验证必需字段
    if (!msgSiteId || !targetUrl || !accessKey || !subdomain) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Missing required fields: siteId, targetUrl, accessKey, subdomain'
      }));
      return;
    }

    // 验证访问密钥
    if (!verifyAccessKey(accessKey, subdomain, config)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid access key for this subdomain'
      }));
      return;
    }

    // 检查子域名是否可用
    if (!isSubdomainAvailable(subdomain, msgSiteId)) {
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Subdomain already in use'
      }));
      return;
    }

    // 创建路由
    const route = {
      siteId: msgSiteId,
      subdomain,
      targetUrl,
      accessKey,
      createdAt: Date.now(),
      lastActive: Date.now()
    };

    // 保存连接和路由
    siteId = msgSiteId;
    connections.set(siteId, { websocket: ws, route });
    routes.set(subdomain, route);

    // 发送确认消息
    ws.send(JSON.stringify({
      type: 'registered',
      siteId,
      subdomain,
      targetUrl,
      timestamp: Date.now()
    }));

    console.log(`✅ 站点 ${siteId} 已注册: ${subdomain} -> ${targetUrl}`);
    console.log(`📊 当前活跃连接数: ${connections.size}`);
  }

  function handleHeartbeat(ws) {
    ws.send(JSON.stringify({
      type: 'heartbeat_ack',
      timestamp: Date.now()
    }));
  }
});

// 启动服务器
server.listen(WS_PORT, () => {
  console.log(`🚀 WebSocket 服务器启动在端口 ${WS_PORT}`);
  console.log(`📡 WebSocket 端点: ws://localhost:${WS_PORT}/api/websocket`);
  console.log(`✨ WebSocket 服务器运行在 http://localhost:${WS_PORT}`);
  console.log('📋 可用的路由:');
  console.log(`   - WebSocket: ws://localhost:${WS_PORT}/api/websocket`);
  console.log('');
  console.log('🔧 使用 Ctrl+C 停止服务器');
});

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭 WebSocket 服务器...');
  
  // 通知所有客户端
  for (const [siteId, { websocket }] of connections) {
    websocket.send(JSON.stringify({
      type: 'server_shutdown',
      message: 'Server is shutting down'
    }));
    websocket.close();
  }
  
  server.close(() => {
    console.log('✅ WebSocket 服务器已关闭');
    process.exit(0);
  });
});

// 定期清理非活跃连接
setInterval(() => {
  const now = Date.now();
  const timeout = 5 * 60 * 1000; // 5分钟超时
  
  for (const [siteId, { route, websocket }] of connections) {
    if (now - route.lastActive > timeout) {
      console.log(`⏰ 清理非活跃连接: ${siteId}`);
      websocket.close();
      connections.delete(siteId);
      routes.delete(route.subdomain);
    }
  }
}, 60000); // 每分钟检查一次
