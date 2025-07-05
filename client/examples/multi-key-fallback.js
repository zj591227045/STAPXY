// 多密钥模式示例 - 使用备用密钥
// 用于未预定义域名的连接

const { ProxyClient } = require('../index');

const client = new ProxyClient({
  proxyUrl: 'ws://localhost:3001/api/websocket',  // 代理服务器WebSocket地址
  siteId: 'newapp',                               // 站点唯一标识
  subdomain: 'newapp.localhost:3001',             // 未预定义的子域名
  targetUrl: 'http://localhost:3003',             // 内网站点地址
  accessKey: 'sk-fallback-access-key',            // 多密钥模式：备用密钥
  reconnectInterval: 5000,                        // 重连间隔（毫秒）
  heartbeatInterval: 30000                        // 心跳间隔（毫秒）
});

// 启动客户端
client.start().catch(console.error);

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n正在关闭客户端...');
  process.exit(0);
});
