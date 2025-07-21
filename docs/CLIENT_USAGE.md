# 客户端使用指南

本文档说明如何使用static-proxy客户端连接到代理服务器。

## 架构概述

Static-proxy支持两种通信模式：

1. **WebSocket模式**（开发环境）：使用长连接，实时性好
2. **HTTP轮询模式**（生产环境/Vercel）：使用短连接+轮询，适合serverless环境

## 客户端自动检测

客户端会自动检测服务器环境并选择合适的通信模式：

```javascript
// 检测服务器是否支持WebSocket
const wsSupported = await checkWebSocketSupport();

if (wsSupported) {
  // 使用WebSocket模式
  useWebSocketClient();
} else {
  // 使用HTTP轮询模式
  usePollingClient();
}
```

## HTTP轮询模式客户端

### 基本使用

```javascript
const StaticProxyClient = require('./examples/client-polling');

const client = new StaticProxyClient({
  proxyUrl: 'https://your-proxy.vercel.app',
  siteId: 'my-site',
  subdomain: 'mysite',
  targetUrl: 'http://localhost:3000',
  accessKey: 'your-access-key',
  pollInterval: 1000 // 轮询间隔（毫秒）
});

// 启动客户端
await client.start();

// 停止客户端
await client.stop();
```

### 环境变量配置

创建 `.env` 文件：

```bash
PROXY_URL=https://your-proxy.vercel.app
SITE_ID=my-site
SUBDOMAIN=mysite
TARGET_URL=http://localhost:3000
ACCESS_KEY=your-access-key
POLL_INTERVAL=1000
```

然后运行：

```bash
node examples/client-polling.js
```

### 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `proxyUrl` | string | - | 代理服务器URL |
| `siteId` | string | - | 站点唯一标识符 |
| `subdomain` | string | - | 子域名 |
| `targetUrl` | string | - | 本地服务器URL |
| `accessKey` | string | - | 访问密钥 |
| `pollInterval` | number | 1000 | 轮询间隔（毫秒） |

## WebSocket模式客户端

### 基本使用

```javascript
const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:8080/ws');

ws.on('open', () => {
  // 注册站点
  ws.send(JSON.stringify({
    type: 'register',
    siteId: 'my-site',
    subdomain: 'mysite',
    targetUrl: 'http://localhost:3000',
    accessKey: 'your-access-key'
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  
  switch (message.type) {
    case 'registered':
      console.log('站点注册成功');
      break;
      
    case 'request':
      // 处理代理请求
      handleProxyRequest(message.data);
      break;
      
    case 'heartbeat':
      // 响应心跳
      ws.send(JSON.stringify({
        type: 'heartbeat_ack',
        timestamp: Date.now()
      }));
      break;
  }
});
```

## 工作流程

### HTTP轮询模式

1. **注册阶段**：
   ```
   客户端 -> PUT /api/client/poll -> 服务器
   服务器将站点信息存储到KV数据库
   ```

2. **轮询阶段**：
   ```
   客户端 -> POST /api/client/poll -> 服务器
   服务器检查是否有待处理请求
   如果有请求，返回请求详情
   ```

3. **处理请求**：
   ```
   客户端接收到请求
   转发到本地服务器
   获取响应
   ```

4. **提交响应**：
   ```
   客户端 -> POST /api/client/response -> 服务器
   服务器将响应存储到KV数据库
   等待的用户请求获取响应并返回
   ```

### WebSocket模式

1. **连接建立**：
   ```
   客户端 -> WebSocket连接 -> 服务器
   ```

2. **站点注册**：
   ```
   客户端 -> register消息 -> 服务器
   服务器 -> registered确认 -> 客户端
   ```

3. **请求处理**：
   ```
   用户请求 -> 服务器 -> request消息 -> 客户端
   客户端处理请求 -> response消息 -> 服务器 -> 用户
   ```

## 错误处理

### 常见错误

1. **连接失败**
   ```javascript
   try {
     await client.start();
   } catch (error) {
     if (error.message.includes('ECONNREFUSED')) {
       console.log('无法连接到代理服务器');
     }
   }
   ```

2. **认证失败**
   ```javascript
   // 检查访问密钥是否正确
   if (error.message.includes('Invalid access key')) {
     console.log('访问密钥无效');
   }
   ```

3. **子域名冲突**
   ```javascript
   if (error.message.includes('Subdomain already in use')) {
     console.log('子域名已被使用');
   }
   ```

### 重连机制

HTTP轮询模式自带重连机制：

```javascript
class StaticProxyClient {
  async poll() {
    try {
      // 执行轮询
    } catch (error) {
      console.error('轮询错误:', error.message);
      
      // 出错后延长轮询间隔
      if (this.isRunning) {
        this.pollTimer = setTimeout(() => this.startPolling(), this.pollInterval * 2);
      }
    }
  }
}
```

## 性能优化

### 轮询间隔调优

- **低延迟场景**：设置较短的轮询间隔（500-1000ms）
- **节省资源**：设置较长的轮询间隔（2000-5000ms）
- **动态调整**：根据请求频率动态调整间隔

### 批量处理

```javascript
// 一次轮询处理多个请求
async poll() {
  const requests = await this.getPendingRequests(); // 获取多个请求
  
  for (const request of requests) {
    await this.handleRequest(request);
  }
}
```

## 监控和日志

### 日志记录

```javascript
const client = new StaticProxyClient({
  // ... 其他配置
  logger: {
    info: (msg) => console.log(`[INFO] ${msg}`),
    error: (msg) => console.error(`[ERROR] ${msg}`),
    debug: (msg) => console.debug(`[DEBUG] ${msg}`)
  }
});
```

### 性能指标

- 轮询频率
- 请求处理时间
- 错误率
- 连接状态

## 部署建议

1. **使用进程管理器**：
   ```bash
   pm2 start examples/client-polling.js --name "proxy-client"
   ```

2. **Docker部署**：
   ```dockerfile
   FROM node:16
   COPY . /app
   WORKDIR /app
   RUN npm install
   CMD ["node", "examples/client-polling.js"]
   ```

3. **系统服务**：
   创建systemd服务文件，确保客户端自动启动和重启
