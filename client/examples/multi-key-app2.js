// 多密钥模式示例 - 应用2
// 使用专用密钥连接到代理服务器

const { ProxyClient } = require('../index');

const client = new ProxyClient({
  proxyUrl: 'ws://localhost:3001/api/websocket',  // 代理服务器WebSocket地址
  siteId: 'app2',                                 // 站点唯一标识
  subdomain: 'app2.localhost:3001',               // 子域名
  targetUrl: 'http://localhost:3002',             // 内网站点地址
  accessKey: 'sk-app2-specific-key',              // 多密钥模式：应用2专用密钥
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
