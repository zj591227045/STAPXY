# Vercel部署指南

本文档详细说明如何将static-proxy项目部署到Vercel平台。

## 前置要求

1. Vercel账户
2. 域名（用于子域名路由）
3. Vercel Edge Config（用于配置管理，免费功能）

## 部署步骤

### 1. 准备项目

确保项目已经完成构建测试：

```bash
npm install
npm run build
```

### 2. 配置环境变量

在Vercel项目设置中添加以下环境变量：

#### 必需的环境变量

- `PROXY_ROUTES`: 代理路由配置
  ```
  site1:a1.yourdomain.com:https://api1.example.com,site2:a2.yourdomain.com:https://api2.example.com
  ```

#### Vercel Edge Config环境变量（自动设置）

当您创建Vercel Edge Config时，以下变量会自动添加：
- `EDGE_CONFIG`

### 3. 配置域名

#### 主域名设置

1. 在Vercel项目设置中添加您的主域名
2. 配置DNS记录指向Vercel

#### 子域名设置

为了支持子域名路由，您需要：

1. 添加通配符子域名到Vercel项目：
   - `*.yourdomain.com`

2. 配置DNS记录：
   ```
   Type: CNAME
   Name: *
   Value: cname.vercel-dns.com
   ```

### 4. 创建Vercel Edge Config

1. 在Vercel仪表板中，转到"Storage"选项卡
2. 创建新的Edge Config
3. 将Edge Config连接到您的项目

### 5. 部署项目

#### 通过Git部署（推荐）

1. 将代码推送到GitHub/GitLab/Bitbucket
2. 在Vercel中导入项目
3. 配置构建设置（通常自动检测）
4. 部署

#### 通过CLI部署

```bash
npm install -g vercel
vercel login
vercel --prod
```

## 配置文件说明

### vercel.json

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

### 配置说明

- **functions**: 配置各个API端点的超时时间
- **headers**: 设置CORS头部，允许跨域请求
- **rewrites**: 将所有非API请求重写到代理端点

## 架构差异

### 开发环境 vs 生产环境

| 特性 | 开发环境 | 生产环境（Vercel） |
|------|----------|-------------------|
| 连接管理 | 内存中的WebSocket连接 | Edge Config + 内存存储 |
| 通信方式 | WebSocket长连接 | HTTP短连接+轮询 |
| 状态存储 | 服务器内存 | Edge Config + 内存存储 |
| 扩展性 | 单实例 | 全球边缘网络 |

### 客户端适配

客户端需要检测环境并使用相应的通信方式：

```javascript
// 检测是否为Vercel环境
const isVercelEnv = window.location.hostname.includes('vercel.app') || 
                   window.location.hostname !== 'localhost';

if (isVercelEnv) {
  // 使用HTTP轮询模式
  usePollingMode();
} else {
  // 使用WebSocket模式
  useWebSocketMode();
}
```

## 监控和调试

### 查看日志

在Vercel仪表板中查看函数日志：
1. 转到项目页面
2. 点击"Functions"选项卡
3. 查看各个函数的执行日志

### 性能监控

- 监控函数执行时间
- 检查Edge Config使用情况
- 观察错误率和响应时间

## 故障排除

### 常见问题

1. **子域名无法访问**
   - 检查DNS配置
   - 确认通配符域名已添加到Vercel项目

2. **Edge Config连接失败**
   - 确认Edge Config已创建并连接到项目
   - 检查环境变量是否正确设置

3. **函数超时**
   - 检查vercel.json中的maxDuration设置
   - 优化代码以减少执行时间

4. **CORS错误**
   - 检查headers配置
   - 确认客户端请求包含正确的头部

## 成本考虑

- Vercel Edge Config免费使用（有使用限制）
- Edge Functions按执行时间计费
- 内存存储无额外费用

## 安全建议

1. 使用强访问密钥
2. 限制CORS来源（生产环境中不要使用"*"）
3. 定期轮换访问密钥
4. 监控异常访问模式
