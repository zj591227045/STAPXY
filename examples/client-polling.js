#!/usr/bin/env node

/**
 * Static Proxy 客户端示例 - HTTP轮询模式
 * 
 * 此示例展示如何在Vercel环境中使用HTTP轮询模式连接到代理服务器
 * 替代传统的WebSocket长连接模式
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');

class StaticProxyClient {
  constructor(options) {
    this.proxyUrl = options.proxyUrl || 'https://your-proxy.vercel.app';
    this.siteId = options.siteId;
    this.subdomain = options.subdomain;
    this.targetUrl = options.targetUrl;
    this.accessKey = options.accessKey;
    
    this.pollInterval = options.pollInterval || 1000; // 1秒轮询间隔
    this.isRunning = false;
    this.pollTimer = null;
    
    console.log(`初始化客户端: ${this.siteId} -> ${this.subdomain} -> ${this.targetUrl}`);
  }

  // 启动客户端
  async start() {
    try {
      console.log('正在注册站点...');
      
      // 注册站点
      const registerResult = await this.registerSite();
      if (!registerResult.success) {
        throw new Error(`站点注册失败: ${registerResult.message}`);
      }
      
      console.log('站点注册成功，开始轮询...');
      
      // 开始轮询
      this.isRunning = true;
      this.startPolling();
      
    } catch (error) {
      console.error('启动客户端失败:', error.message);
      throw error;
    }
  }

  // 停止客户端
  async stop() {
    console.log('正在停止客户端...');
    
    this.isRunning = false;
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    
    try {
      // 注销站点
      await this.unregisterSite();
      console.log('站点注销成功');
    } catch (error) {
      console.error('站点注销失败:', error.message);
    }
    
    console.log('客户端已停止');
  }

  // 注册站点
  async registerSite() {
    const response = await this.makeRequest('/api/client/poll', 'PUT', {
      siteId: this.siteId,
      subdomain: this.subdomain,
      targetUrl: this.targetUrl,
      accessKey: this.accessKey
    });
    
    return response;
  }

  // 注销站点
  async unregisterSite() {
    const response = await this.makeRequest('/api/client/poll', 'DELETE', {
      siteId: this.siteId,
      accessKey: this.accessKey,
      subdomain: this.subdomain
    });
    
    return response;
  }

  // 开始轮询
  startPolling() {
    if (!this.isRunning) return;
    
    this.poll()
      .then(() => {
        // 安排下次轮询
        if (this.isRunning) {
          this.pollTimer = setTimeout(() => this.startPolling(), this.pollInterval);
        }
      })
      .catch(error => {
        console.error('轮询错误:', error.message);
        
        // 出错后延长轮询间隔
        if (this.isRunning) {
          this.pollTimer = setTimeout(() => this.startPolling(), this.pollInterval * 2);
        }
      });
  }

  // 执行一次轮询
  async poll() {
    try {
      const response = await this.makeRequest('/api/client/poll', 'POST', {
        siteId: this.siteId,
        accessKey: this.accessKey,
        subdomain: this.subdomain
      });
      
      if (response.success && response.status === 'request_available') {
        // 处理请求
        await this.handleRequest(response.request);
      }
      
    } catch (error) {
      console.error('轮询请求失败:', error.message);
      throw error;
    }
  }

  // 处理代理请求
  async handleRequest(proxyRequest) {
    console.log(`处理请求: ${proxyRequest.method} ${proxyRequest.url}`);
    
    try {
      // 转发请求到本地服务器
      const response = await this.forwardRequest(proxyRequest);
      
      // 提交响应
      await this.submitResponse(proxyRequest.id, response);
      
      console.log(`请求处理完成: ${proxyRequest.id}`);
      
    } catch (error) {
      console.error(`请求处理失败: ${proxyRequest.id}`, error.message);
      
      // 提交错误响应
      await this.submitResponse(proxyRequest.id, {
        id: proxyRequest.id,
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
        body: 'Bad Gateway',
        timestamp: Date.now()
      });
    }
  }

  // 转发请求到本地服务器
  async forwardRequest(proxyRequest) {
    return new Promise((resolve, reject) => {
      const targetUrl = new URL(proxyRequest.url, this.targetUrl);
      const isHttps = targetUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (isHttps ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: proxyRequest.method,
        headers: proxyRequest.headers || {}
      };
      
      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', chunk => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            id: proxyRequest.id,
            status: res.statusCode,
            headers: res.headers,
            body: body,
            timestamp: Date.now()
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      // 发送请求体
      if (proxyRequest.body) {
        req.write(proxyRequest.body);
      }
      
      req.end();
    });
  }

  // 提交响应
  async submitResponse(requestId, response) {
    const result = await this.makeRequest('/api/client/response', 'POST', {
      siteId: this.siteId,
      accessKey: this.accessKey,
      subdomain: this.subdomain,
      requestId: requestId,
      response: response
    });
    
    if (!result.success) {
      throw new Error(`提交响应失败: ${result.message}`);
    }
    
    return result;
  }

  // 发送HTTP请求
  async makeRequest(path, method, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, this.proxyUrl);
      const isHttps = url.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const postData = JSON.stringify(data);
      
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
            const response = JSON.parse(body);
            resolve(response);
          } catch (error) {
            reject(new Error(`解析响应失败: ${error.message}`));
          }
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.write(postData);
      req.end();
    });
  }
}

// 使用示例
if (require.main === module) {
  const client = new StaticProxyClient({
    proxyUrl: process.env.PROXY_URL || 'https://your-proxy.vercel.app',
    siteId: process.env.SITE_ID || 'my-site',
    subdomain: process.env.SUBDOMAIN || 'mysite',
    targetUrl: process.env.TARGET_URL || 'http://localhost:3000',
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

module.exports = StaticProxyClient;

/*
使用方法:

1. 设置环境变量:
   export PROXY_URL="https://your-proxy.vercel.app"
   export SITE_ID="my-site"
   export SUBDOMAIN="mysite"
   export TARGET_URL="http://localhost:3000"
   export ACCESS_KEY="your-access-key"
   export POLL_INTERVAL="1000"

2. 运行客户端:
   node client-polling.js

3. 或者在代码中使用:
   const StaticProxyClient = require('./client-polling');

   const client = new StaticProxyClient({
     proxyUrl: 'https://your-proxy.vercel.app',
     siteId: 'my-site',
     subdomain: 'mysite',
     targetUrl: 'http://localhost:3000',
     accessKey: 'your-access-key',
     pollInterval: 1000
   });

   await client.start();
*/
