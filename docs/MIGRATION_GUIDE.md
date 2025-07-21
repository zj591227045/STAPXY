# Static Proxy 迁移指南

本文档详细说明如何将现有的static-proxy项目从传统WebSocket架构迁移到支持Vercel Edge Functions的新架构。

## 迁移概述

### 架构变化

| 组件 | 旧架构 | 新架构 |
|------|--------|--------|
| 状态管理 | 内存中的Map对象 | Vercel Edge Config + 内存存储 |
| 通信方式 | WebSocket长连接 | HTTP短连接+轮询 |
| 连接管理器 | 单一ConnectionManager | 环境自适应管理器 |
| 部署环境 | Node.js服务器 | Vercel Edge Functions |

### 兼容性

新架构完全向后兼容：
- 开发环境仍使用WebSocket模式
- 生产环境自动切换到轮询模式
- 现有客户端代码无需修改（使用智能客户端）

## 迁移步骤

### 1. 更新依赖

首先安装新的依赖：

```bash
npm install @vercel/edge-config
```

### 2. 环境变量配置

#### 开发环境

创建或更新 `.env.local` 文件：

```bash
# 代理路由配置
PROXY_ROUTES=site1:a1.yourdomain.com:http://localhost:3001,site2:a2.yourdomain.com:http://localhost:3002

# 开发环境标识
NODE_ENV=development
```

#### 生产环境（Vercel）

在Vercel项目设置中添加环境变量：

```bash
# 代理路由配置
PROXY_ROUTES=site1:a1.yourdomain.com:https://api1.example.com,site2:a2.yourdomain.com:https://api2.example.com

# Vercel Edge Config环境变量（自动设置）
# EDGE_CONFIG=your_edge_config_connection_string
```

### 3. 创建Vercel Edge Config

1. 在Vercel仪表板中，转到"Storage"选项卡
2. 创建新的Edge Config
3. 将Edge Config连接到您的项目
4. 环境变量会自动添加

### 4. 更新vercel.json配置

确保您的 `vercel.json` 包含以下配置：

```json
{
  "functions": {
    "src/app/api/websocket/route.ts": {
      "maxDuration": 300
    },
    "src/app/api/proxy/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/client/poll/route.ts": {
      "maxDuration": 30
    },
    "src/app/api/client/response/route.ts": {
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Access-Control-Allow-Origin", "value": "*" },
        { "key": "Access-Control-Allow-Methods", "value": "GET, POST, PUT, DELETE, OPTIONS" },
        { "key": "Access-Control-Allow-Headers", "value": "Content-Type, Authorization, X-Requested-With" }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/((?!api|_next|favicon.ico).*)",
      "destination": "/api/proxy"
    }
  ]
}
```

### 5. 配置域名

#### 主域名

在Vercel项目设置中添加您的主域名。

#### 子域名

1. 添加通配符子域名：`*.yourdomain.com`
2. 配置DNS记录：
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```

### 6. 更新客户端代码

#### 选项1：使用智能客户端（推荐）

替换现有客户端代码：

```javascript
// 旧代码
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:8080/ws');

// 新代码
const SmartStaticProxyClient = require('./examples/smart-client');
const client = new SmartStaticProxyClient({
  proxyUrl: 'https://your-proxy.vercel.app',
  siteId: 'my-site',
  subdomain: 'mysite',
  targetUrl: 'http://localhost:3000',
  accessKey: 'your-access-key'
});

await client.start();
```

#### 选项2：手动检测环境

```javascript
// 检测服务器环境
async function createClient() {
  const response = await fetch('/api/websocket');
  const data = await response.json();
  
  if (data.alternative) {
    // 使用轮询模式
    return new StaticProxyClient(config);
  } else {
    // 使用WebSocket模式
    return new WebSocketClient(config);
  }
}
```

### 7. 测试迁移

#### 本地测试

```bash
# 启动开发服务器
npm run dev

# 在另一个终端测试客户端
cd examples
node smart-client.js
```

#### 生产测试

```bash
# 部署到Vercel
vercel --prod

# 测试客户端连接
PROXY_URL=https://your-proxy.vercel.app node examples/smart-client.js
```

## 故障排除

### 常见问题

#### 1. Edge Config连接失败

**症状**：客户端无法注册或轮询失败

**解决方案**：
- 检查Vercel Edge Config是否已创建并连接到项目
- 确认环境变量 `EDGE_CONFIG` 已设置
- 查看Vercel函数日志

#### 2. 子域名无法访问

**症状**：访问子域名返回404错误

**解决方案**：
- 确认通配符域名 `*.yourdomain.com` 已添加到Vercel项目
- 检查DNS配置是否正确
- 验证 `vercel.json` 中的重写规则

#### 3. 客户端连接超时

**症状**：客户端无法连接或频繁超时

**解决方案**：
- 检查网络连接
- 调整轮询间隔（增加 `pollInterval`）
- 查看服务器日志确认请求是否到达

#### 4. 环境检测错误

**症状**：在错误的环境中使用了错误的通信模式

**解决方案**：
- 检查环境变量设置
- 使用智能客户端自动检测
- 手动指定通信模式

### 调试技巧

#### 1. 启用详细日志

```javascript
// 在客户端代码中添加
console.log('环境信息:', {
  proxyUrl: client.proxyUrl,
  mode: client.getMode(),
  isConnected: client.isConnected()
});
```

#### 2. 监控Edge Config使用情况

在Vercel仪表板中查看Edge Config的使用情况和性能指标。

#### 3. 查看函数日志

在Vercel项目页面的"Functions"选项卡中查看各个API端点的执行日志。

## 性能优化

### 1. 轮询间隔调优

根据使用场景调整轮询间隔：

```javascript
const client = new SmartStaticProxyClient({
  // 低延迟场景
  pollInterval: 500,
  
  // 节省资源场景
  pollInterval: 5000,
  
  // 其他配置...
});
```

### 2. 内存数据清理

合理设置内存数据的清理间隔以节省内存：

```javascript
// 在kv-store.ts中调整
const REQUEST_TTL = 30000; // 请求TTL 30秒
const RESPONSE_TTL = 30000; // 响应TTL 30秒
const CLIENT_STATUS_TTL = 60000; // 客户端状态TTL 60秒
const CLEANUP_INTERVAL = 60000; // 清理间隔 1分钟
```

### 3. 批量处理

实现批量请求处理以提高效率：

```javascript
// 一次轮询处理多个请求
async function handleMultipleRequests() {
  const requests = await client.getPendingRequests();
  await Promise.all(requests.map(req => client.handleRequest(req)));
}
```

## 回滚计划

如果迁移过程中遇到问题，可以按以下步骤回滚：

### 1. 临时回滚

```bash
# 回滚到上一个部署版本
vercel rollback
```

### 2. 完全回滚

1. 恢复旧的客户端代码
2. 移除新的API端点
3. 恢复原始的vercel.json配置
4. 重新部署

### 3. 数据迁移

如果需要从内存存储迁移数据：

```javascript
// 导出内存数据
const stats = await edgeConfigStore.getStats();
console.log('路由数据:', JSON.stringify(stats.routes, null, 2));
```

## 后续维护

### 1. 监控指标

定期检查以下指标：
- Edge Config使用量
- 内存使用情况
- 函数执行时间
- 错误率
- 客户端连接成功率

### 2. 更新策略

- 定期更新依赖包
- 监控Vercel平台更新
- 根据使用情况优化配置

### 3. 备份策略

- 定期备份Edge Config数据
- 保存配置文件副本
- 记录重要的环境变量

## 总结

新架构提供了以下优势：
- ✅ 支持Vercel Edge Functions全球部署
- ✅ 使用免费的Edge Config存储配置
- ✅ 自动环境检测和适配
- ✅ 向后兼容现有代码
- ✅ 更好的可扩展性和可靠性

迁移过程相对简单，大部分工作是配置和测试。如果遇到问题，请参考故障排除部分或查看项目文档。
