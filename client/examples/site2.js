#!/usr/bin/env node

// 站点2的客户端配置示例
import ProxyClient from '../index.js';

const client = new ProxyClient({
  proxyUrl: 'ws://localhost:3000/ws',             // 代理服务器WebSocket地址
  siteId: 'site2',                                // 站点唯一标识
  subdomain: 'site2.localhost:3000',              // 子域名
  targetUrl: 'http://10.255.0.75',               // 内网站点地址
  accessKey: 'sk-universal-access-key',           // 单密钥模式：使用通用密钥
  reconnectInterval: 5000,                        // 重连间隔（毫秒）
  heartbeatInterval: 60000                        // 心跳间隔（毫秒）- 增加到60秒
});

// 处理进程退出
process.on('SIGINT', () => {
  console.log('\n正在停止站点2客户端...');
  client.stop();
  process.exit(0);
});

// 启动客户端
client.start().catch(console.error);
