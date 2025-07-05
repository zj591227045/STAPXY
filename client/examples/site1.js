#!/usr/bin/env node

// 站点1的客户端配置示例
import ProxyClient from '../index.js';

const client = new ProxyClient({
  proxyUrl: 'ws://localhost:3000/ws',             // 直接连接到WebSocket服务器
  siteId: 'site1',                                // 站点唯一标识
  subdomain: 'site1.localhost:3000',              // 子域名
  targetUrl: 'http://100.64.0.10:8080',             // 内网站点地址
  accessKey: 'sk-universal-access-key',           // 单密钥模式：使用通用密钥
  reconnectInterval: 5000,                        // 重连间隔（毫秒）
  heartbeatInterval: 60000                        // 心跳间隔（毫秒）- 增加到60秒
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n正在停止站点1客户端...');
  client.stop();
  process.exit(0);
});

// 启动客户端
client.start().catch(console.error);
