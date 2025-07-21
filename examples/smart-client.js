#!/usr/bin/env node

/**
 * Smart Static Proxy Client
 * 
 * 智能客户端，自动检测服务器环境并选择合适的通信模式：
 * - WebSocket模式（开发环境）
 * - HTTP轮询模式（生产环境/Vercel）
 */

const WebSocket = require('ws');
const StaticProxyClient = require('./client-polling');

class SmartStaticProxyClient {
  constructor(options) {
    this.options = options;
    this.proxyUrl = options.proxyUrl;
    this.siteId = options.siteId;
    this.subdomain = options.subdomain;
    this.targetUrl = options.targetUrl;
    this.accessKey = options.accessKey;
    
    this.mode = null; // 'websocket' 或 'polling'
    this.client = null;
    this.isRunning = false;
    
    console.log(`初始化智能客户端: ${this.siteId} -> ${this.subdomain} -> ${this.targetUrl}`);
  }

  // 启动客户端
  async start() {
    try {
      console.log('正在检测服务器环境...');
      
      // 检测服务器支持的通信模式
      const mode = await this.detectServerMode();
      this.mode = mode;
      
      console.log(`检测到服务器模式: ${mode}`);
      
      // 根据模式创建相应的客户端
      if (mode === 'websocket') {
        await this.startWebSocketClient();
      } else {
        await this.startPollingClient();
      }
      
      this.isRunning = true;
      console.log('客户端启动成功');
      
    } catch (error) {
      console.error('启动客户端失败:', error.message);
      throw error;
    }
  }

  // 停止客户端
  async stop() {
    if (!this.isRunning) return;
    
    console.log('正在停止客户端...');
    this.isRunning = false;
    
    try {
      if (this.client) {
        if (this.mode === 'websocket') {
          this.client.close();
        } else {
          await this.client.stop();
        }
      }
      console.log('客户端已停止');
    } catch (error) {
      console.error('停止客户端时出错:', error.message);
    }
  }

  // 检测服务器模式
  async detectServerMode() {
    try {
      // 首先尝试WebSocket连接
      const wsSupported = await this.testWebSocketConnection();
      if (wsSupported) {
        return 'websocket';
      }
      
      // 如果WebSocket不支持，检查HTTP轮询API
      const pollingSupported = await this.testPollingAPI();
      if (pollingSupported) {
        return 'polling';
      }
      
      throw new Error('服务器不支持任何已知的通信模式');
      
    } catch (error) {
      console.warn('WebSocket检测失败，回退到轮询模式:', error.message);
      return 'polling';
    }
  }

  // 测试WebSocket连接
  async testWebSocketConnection() {
    return new Promise((resolve) => {
      try {
        const wsUrl = this.proxyUrl.replace(/^https?/, 'ws') + '/api/websocket';
        const ws = new WebSocket(wsUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 5000);
        
        ws.on('open', () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        });
        
        ws.on('error', () => {
          clearTimeout(timeout);
          resolve(false);
        });
        
      } catch (error) {
        resolve(false);
      }
    });
  }

  // 测试轮询API
  async testPollingAPI() {
    try {
      const response = await this.makeHttpRequest('/api/websocket', 'GET');
      
      // 检查响应是否包含轮询信息
      return response && response.alternative && response.alternative.pollEndpoint;
      
    } catch (error) {
      return false;
    }
  }

  // 启动WebSocket客户端
  async startWebSocketClient() {
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = this.proxyUrl.replace(/^https?/, 'ws') + '/api/websocket';
        this.client = new WebSocket(wsUrl);
        
        this.client.on('open', () => {
          console.log('WebSocket连接已建立');
          
          // 发送注册消息
          this.client.send(JSON.stringify({
            type: 'register',
            siteId: this.siteId,
            subdomain: this.subdomain,
            targetUrl: this.targetUrl,
            accessKey: this.accessKey
          }));
        });
        
        this.client.on('message', (data) => {
          this.handleWebSocketMessage(JSON.parse(data.toString()));
        });
        
        this.client.on('close', () => {
          console.log('WebSocket连接已关闭');
          if (this.isRunning) {
            // 尝试重连
            setTimeout(() => this.startWebSocketClient(), 5000);
          }
        });
        
        this.client.on('error', (error) => {
          console.error('WebSocket错误:', error.message);
          reject(error);
        });
        
        // 等待注册确认
        const registrationTimeout = setTimeout(() => {
          reject(new Error('注册超时'));
        }, 10000);
        
        this.client.once('message', (data) => {
          const message = JSON.parse(data.toString());
          if (message.type === 'registered') {
            clearTimeout(registrationTimeout);
            resolve();
          }
        });
        
      } catch (error) {
        reject(error);
      }
    });
  }

  // 启动轮询客户端
  async startPollingClient() {
    this.client = new StaticProxyClient(this.options);
    await this.client.start();
  }

  // 处理WebSocket消息
  handleWebSocketMessage(message) {
    switch (message.type) {
      case 'registered':
        console.log('站点注册成功:', message);
        break;
        
      case 'request':
        this.handleWebSocketRequest(message.data);
        break;
        
      case 'heartbeat':
        // 响应心跳
        this.client.send(JSON.stringify({
          type: 'heartbeat_ack',
          timestamp: Date.now()
        }));
        break;
        
      case 'error':
        console.error('服务器错误:', message.message);
        break;
        
      default:
        console.log('未知消息类型:', message.type);
    }
  }

  // 处理WebSocket请求
  async handleWebSocketRequest(proxyRequest) {
    console.log(`处理WebSocket请求: ${proxyRequest.method} ${proxyRequest.url}`);
    
    try {
      // 这里可以复用轮询客户端的请求转发逻辑
      const pollingClient = new StaticProxyClient(this.options);
      const response = await pollingClient.forwardRequest(proxyRequest);
      
      // 发送响应
      this.client.send(JSON.stringify({
        type: 'response',
        data: response
      }));
      
      console.log(`WebSocket请求处理完成: ${proxyRequest.id}`);
      
    } catch (error) {
      console.error(`WebSocket请求处理失败: ${proxyRequest.id}`, error.message);
      
      // 发送错误响应
      this.client.send(JSON.stringify({
        type: 'response',
        data: {
          id: proxyRequest.id,
          status: 502,
          headers: { 'Content-Type': 'text/plain' },
          body: 'Bad Gateway',
          timestamp: Date.now()
        }
      }));
    }
  }

  // 发送HTTP请求（用于检测）
  async makeHttpRequest(path, method, data) {
    const https = require('https');
    const http = require('http');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.proxyUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const postData = data ? JSON.stringify(data) : '';
      
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', chunk => {
          body += chunk;
        });
        
        res.on('end', () => {
          try {
            const response = body ? JSON.parse(body) : {};
            resolve(response);
          } catch (error) {
            resolve({ statusCode: res.statusCode, body });
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }

  // 获取当前模式
  getMode() {
    return this.mode;
  }

  // 获取连接状态
  isConnected() {
    if (this.mode === 'websocket') {
      return this.client && this.client.readyState === WebSocket.OPEN;
    } else {
      return this.client && this.client.isRunning;
    }
  }
}

// 使用示例
if (require.main === module) {
  const client = new SmartStaticProxyClient({
    proxyUrl: process.env.PROXY_URL || 'http://localhost:3000',
    siteId: process.env.SITE_ID || 'my-site',
    subdomain: process.env.SUBDOMAIN || 'mysite',
    targetUrl: process.env.TARGET_URL || 'http://localhost:8080',
    accessKey: process.env.ACCESS_KEY || 'your-access-key',
    pollInterval: parseInt(process.env.POLL_INTERVAL) || 1000
  });

  // 处理进程退出
  process.on('SIGINT', async () => {
    console.log('\n收到退出信号，正在停止客户端...');
    await client.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\n收到终止信号，正在停止客户端...');
    await client.stop();
    process.exit(0);
  });

  // 启动客户端
  client.start().catch(error => {
    console.error('客户端启动失败:', error.message);
    process.exit(1);
  });
}

module.exports = SmartStaticProxyClient;
