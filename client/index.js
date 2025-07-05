#!/usr/bin/env node

import WebSocket from 'ws';
import fetch from 'node-fetch';
import { ClientAccessControl } from './lib/access-control.js';
import { URL } from 'url';

class ProxyClient {
  constructor(config) {
    this.config = {
      proxyUrl: 'ws://localhost:3000/api/websocket',
      siteId: 'site1',
      targetUrl: 'http://localhost:3001',
      subdomain: 'site1.localhost:3000',
      accessKey: '',
      reconnectInterval: 5000,
      heartbeatInterval: 30000,
      ...config
    };
    
    this.ws = null;
    this.isConnected = false;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.pendingRequests = new Map();

    // 初始化访问控制
    this.accessControl = new ClientAccessControl(`./config/access-control-${this.config.siteId}.json`);
    console.log('🛡️ 访问控制系统已初始化');
  }

  async start() {
    console.log(`启动代理客户端...`);
    console.log(`站点ID: ${this.config.siteId}`);
    console.log(`子域名: ${this.config.subdomain}`);
    console.log(`目标URL: ${this.config.targetUrl}`);
    console.log(`代理服务器: ${this.config.proxyUrl}`);

    // 验证必需配置
    if (!this.config.accessKey) {
      console.error('❌ 错误: 缺少访问密钥 (accessKey)');
      process.exit(1);
    }

    if (!this.config.subdomain) {
      console.error('❌ 错误: 缺少子域名 (subdomain)');
      process.exit(1);
    }

    await this.connect();
  }

  async connect() {
    try {
      console.log('正在连接到代理服务器...');
      
      this.ws = new WebSocket(this.config.proxyUrl);
      
      this.ws.on('open', () => {
        console.log('✅ 已连接到代理服务器');
        this.isConnected = true;
        this.register();
        // 心跳将在注册成功后启动

        // 清除重连定时器
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      });

      this.ws.on('message', (data) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', (code, reason) => {
        console.log(`❌ 与代理服务器的连接已断开: code=${code}, reason=${reason}`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        console.error('WebSocket错误:', error.message);
        this.isConnected = false;
      });

    } catch (error) {
      console.error('连接失败:', error.message);
      this.scheduleReconnect();
    }
  }

  register() {
    const message = {
      type: 'register',
      siteId: this.config.siteId,
      targetUrl: this.config.targetUrl,
      subdomain: this.config.subdomain,
      accessKey: this.config.accessKey
    };

    this.sendMessage(message);
    console.log(`📝 正在注册站点: ${this.config.siteId} (${this.config.subdomain})`);
  }

  startHeartbeat() {
    console.log(`💓 启动心跳，间隔: ${this.config.heartbeatInterval}ms`);
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected) {
        try {
          const message = {
            type: 'heartbeat',
            timestamp: Date.now(),
            siteId: this.config.siteId
          };
          this.sendMessage(message);
          console.log(`💓 发送心跳`);
        } catch (error) {
          console.error(`❌ 发送心跳失败: ${error.message}`);
        }
      }
    }, this.config.heartbeatInterval);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) {
      return; // 已经在重连中
    }
    
    console.log(`⏰ ${this.config.reconnectInterval / 1000}秒后尝试重连...`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.config.reconnectInterval);
  }

  async handleMessage(data) {
    try {
      const message = JSON.parse(data);
      
      switch (message.type) {
        case 'welcome':
          console.log('🎉 收到欢迎消息:', message.message);
          break;
          
        case 'registered':
          console.log(`✅ 站点注册成功: ${message.subdomain} -> ${message.targetUrl}`);
          // 注册成功后延迟启动心跳，避免立即发送导致连接问题
          setTimeout(() => {
            this.startHeartbeat();
          }, 2000); // 延迟2秒启动心跳
          break;
          
        case 'heartbeat_ack':
          // 心跳确认，无需处理
          break;
          
        case 'request':
          await this.handleProxyRequest(message.data);
          break;
          
        case 'error':
          console.error('❌ 服务器错误:', message.message);
          break;
          
        default:
          console.warn('⚠️ 未知消息类型:', message.type);
      }
    } catch (error) {
      console.error('处理消息失败:', error.message);
    }
  }

  async handleProxyRequest(request) {
    try {
      console.log(`🔄 处理请求: ${request.method} ${request.url}`);

      // 访问控制检查
      const accessResult = this.accessControl.checkAccess({
        clientIP: request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown',
        method: request.method,
        url: request.url,
        headers: request.headers
      });

      if (!accessResult.allowed) {
        console.log(`🚫 请求被拒绝: ${accessResult.reason}`);

        // 发送拒绝响应
        const errorResponse = {
          id: request.id,
          status: accessResult.statusCode || 403,
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: accessResult.reason || 'Access Denied',
          timestamp: Date.now()
        };

        const responseMessage = {
          type: 'response',
          data: errorResponse
        };

        this.sendMessage(responseMessage);
        return;
      }

      // 构建完整的目标URL
      const targetUrl = new URL(request.url, this.config.targetUrl);
      
      // 准备请求选项
      const options = {
        method: request.method,
        headers: { ...request.headers },
        timeout: 30000
      };

      // 添加请求体（如果有）
      if (request.body && request.method !== 'GET' && request.method !== 'HEAD') {
        options.body = request.body;
      }

      // 清理不需要的头部
      delete options.headers['host'];
      delete options.headers['connection'];
      
      // 发送请求到目标服务器
      const response = await fetch(targetUrl.toString(), options);
      
      // 读取响应体
      const responseBody = await response.text();
      
      // 构建响应对象
      const proxyResponse = {
        id: request.id,
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseBody,
        timestamp: Date.now()
      };

      // 发送响应回代理服务器
      const responseMessage = {
        type: 'response',
        data: proxyResponse
      };
      
      this.sendMessage(responseMessage);
      console.log(`✅ 请求处理完成: ${response.status} ${request.method} ${request.url}`);
      
    } catch (error) {
      console.error(`❌ 请求处理失败: ${request.method} ${request.url}`, error.message);
      
      // 发送错误响应
      const errorResponse = {
        id: request.id,
        status: 502,
        headers: { 'content-type': 'text/plain' },
        body: `Proxy Error: ${error.message}`,
        timestamp: Date.now()
      };

      const responseMessage = {
        type: 'response',
        data: errorResponse
      };
      
      this.sendMessage(responseMessage);
    }
  }

  sendMessage(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('⚠️ WebSocket未连接，无法发送消息');
    }
  }

  stop() {
    console.log('🛑 正在停止代理客户端...');
    
    this.stopHeartbeat();
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    console.log('✅ 代理客户端已停止');
  }
}

// 从命令行参数或环境变量读取配置
function getConfig() {
  const args = process.argv.slice(2);
  const config = {};
  
  // 解析命令行参数
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--proxy-url':
        config.proxyUrl = value;
        break;
      case '--site-id':
        config.siteId = value;
        break;
      case '--target-url':
        config.targetUrl = value;
        break;
      case '--subdomain':
        config.subdomain = value;
        break;
      case '--access-key':
        config.accessKey = value;
        break;
    }
  }
  
  // 从环境变量读取配置
  if (process.env.PROXY_URL) config.proxyUrl = process.env.PROXY_URL;
  if (process.env.SITE_ID) config.siteId = process.env.SITE_ID;
  if (process.env.TARGET_URL) config.targetUrl = process.env.TARGET_URL;
  if (process.env.SUBDOMAIN) config.subdomain = process.env.SUBDOMAIN;
  if (process.env.ACCESS_KEY) config.accessKey = process.env.ACCESS_KEY;
  
  return config;
}

// 主程序
async function main() {
  const config = getConfig();
  const client = new ProxyClient(config);
  
  // 处理进程退出
  process.on('SIGINT', () => {
    console.log('\n收到退出信号...');
    client.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n收到终止信号...');
    client.stop();
    process.exit(0);
  });
  
  // 启动客户端
  await client.start();
}

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default ProxyClient;
