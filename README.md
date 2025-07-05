# 静态Web代理系统

一个可部署到Vercel等静态托管平台的Web代理服务，支持通过子域名访问内网站点。

## 🚀 功能特性

- **静态部署**: 可部署到Vercel、Netlify等静态托管平台
- **无数据库依赖**: 所有配置通过配置文件管理
- **身份验证**: 管理员密码保护和访问密钥验证
- **双密钥模式**: 支持单密钥模式和多密钥模式
- **动态路由**: 客户端动态注册子域名，无需硬编码
- **子域名路由**: 支持通过子域名访问不同的内网站点
- **NAT穿透**: 内网站点主动连接，无需公网IP
- **WebSocket隧道**: 基于WebSocket的长连接隧道
- **自动重连**: 客户端自动重连和心跳保活
- **实时监控**: Web管理界面实时显示连接状态和路由信息

## 🏗️ 系统架构

```
内网站点A1 ←→ WebSocket ←→ Vercel Edge Function ←→ 用户浏览器
内网站点A2 ←→ WebSocket ←→ Vercel Edge Function ←→ 用户浏览器
内网站点A3 ←→ WebSocket ←→ Vercel Edge Function ←→ 用户浏览器
```

**访问方式:**
- `A1.yourdomain.com` → 内网站点A1
- `A2.yourdomain.com` → 内网站点A2
- `A3.yourdomain.com` → 内网站点A3

## 📦 快速开始

### 1. 克隆项目

```bash
git clone <repository-url>
cd static-proxy
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置系统参数

选择并配置密钥模式：

**单密钥模式（推荐个人使用）：**
```bash
cp config.single-key.template.json config.json
```

**多密钥模式（推荐企业使用）：**
```bash
cp config.multi-key.template.json config.json
```

然后编辑 `config.json` 文件，设置管理员密码和访问密钥。

详细配置说明请参考：[配置指南](./CONFIG_GUIDE.md)

### 4. 启动代理服务器

```bash
npm run dev
```

服务器将在 http://localhost:3000 启动。

### 5. 查看访问密钥

1. 访问管理界面: http://localhost:3001
2. 使用管理员密码登录
3. 在"访问密钥管理"标签页中查看配置的密钥
4. 复制需要使用的密钥

**密钥模式说明：**
- **单密钥模式**: 所有客户端使用同一个密钥
- **多密钥模式**: 每个域名使用专用密钥，支持备用密钥

### 6. 启动内网客户端

```bash
cd client
npm install

# 单密钥模式示例
node examples/site1.js

# 多密钥模式示例
node examples/multi-key-app1.js

# 或使用命令行参数
node index.js \
  --proxy-url ws://localhost:3001/api/websocket \
  --site-id mysite \
  --subdomain mysite.localhost:3001 \
  --target-url http://localhost:8080 \
  --access-key sk-your-access-key
```

### 7. 测试访问

- 管理界面: http://localhost:3001
- 您的站点: http://mysite.localhost:3001

## 🚀 部署到Vercel

### 1. 准备部署

确保项目根目录有 `vercel.json` 配置文件。

### 2. 部署到Vercel

```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel
```

### 3. 配置环境变量

在Vercel控制台中设置环境变量：

```
PROXY_ROUTES=site1:a1.yourdomain.com:http://localhost:3001,site2:a2.yourdomain.com:http://localhost:3002
```

### 4. 配置域名

在Vercel中配置自定义域名，并设置DNS记录：

```
A    a1.yourdomain.com    → Vercel IP
A    a2.yourdomain.com    → Vercel IP
A    a3.yourdomain.com    → Vercel IP
```

## 📋 配置说明

### 配置文件说明

**config.json 结构:**

```json
{
  "admin": {
    "password": "管理员密码",
    "sessionTimeout": 3600000
  },
  "auth": {
    "accessKeys": [
      {
        "id": "唯一标识",
        "key": "访问密钥（sk-开头）",
        "name": "密钥名称",
        "description": "密钥描述",
        "enabled": true,
        "createdAt": "创建时间"
      }
    ]
  },
  "proxy": {
    "maxConnections": 100,
    "heartbeatInterval": 30000,
    "connectionTimeout": 60000
  }
}
```

**重要说明:**
- 访问密钥在配置文件中预定义，支持静态部署
- 客户端使用这些密钥连接到代理服务器
- 路由信息由客户端动态注册，无需预配置

### 客户端配置

客户端支持多种配置方式：

**方法1: 配置文件**
```javascript
import ProxyClient from './index.js';

const client = new ProxyClient({
  proxyUrl: 'wss://your-proxy.vercel.app/api/websocket',
  siteId: 'site1',
  targetUrl: 'http://localhost:3001',
  reconnectInterval: 5000,
  heartbeatInterval: 30000
});
```

**方法2: 命令行参数**
```bash
node index.js --proxy-url wss://your-proxy.vercel.app/api/websocket --site-id site1 --target-url http://localhost:3001
```

**方法3: 环境变量**
```bash
export PROXY_URL=wss://your-proxy.vercel.app/api/websocket
export SITE_ID=site1
export TARGET_URL=http://localhost:3001
node index.js
```

## 🔧 技术栈

- **前端**: Next.js 15 + React 19 + TypeScript
- **样式**: Tailwind CSS
- **通信**: WebSocket + HTTP/2
- **部署**: Vercel Edge Functions
- **客户端**: Node.js + WebSocket

## 📁 项目结构

```
static-proxy/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── websocket/     # WebSocket API端点
│   │   │   └── proxy/         # 代理API端点
│   │   ├── page.tsx           # 管理界面
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── connection-manager.ts  # 连接管理器
│   │   └── subdomain-router.ts   # 子域名路由器
│   ├── types/
│   │   └── index.ts           # 类型定义
│   └── middleware.ts          # Next.js中间件
├── client/
│   ├── index.js               # 客户端主程序
│   ├── examples/              # 示例配置
│   └── README.md
├── vercel.json                # Vercel部署配置
└── README.md
```

## 🔍 工作原理

### 1. 连接建立
1. 内网站点运行客户端程序
2. 客户端连接到代理服务器的WebSocket端点
3. 发送注册消息，包含站点ID和目标URL
4. 代理服务器将连接加入连接池

### 2. 请求处理
1. 用户访问子域名（如 a1.example.com）
2. Next.js中间件识别子域名并路由到代理API
3. 代理API根据子域名查找对应的站点ID
4. 通过WebSocket将HTTP请求发送给对应的客户端
5. 客户端将请求转发到内网站点
6. 内网站点响应返回给客户端
7. 客户端通过WebSocket将响应发送回代理服务器
8. 代理服务器将响应返回给用户

### 3. 连接保活
- 客户端定期发送心跳消息
- 代理服务器监控连接状态
- 连接断开时自动清理
- 客户端自动重连机制

## 🛠️ 开发指南

### 本地开发

1. 启动代理服务器：
```bash
npm run dev
```

2. 启动测试站点（可选）：
```bash
# 终端1 - 启动测试站点1
python -m http.server 3001

# 终端2 - 启动测试站点2
python -m http.server 3002
```

3. 启动客户端：
```bash
cd client
node examples/site1.js
node examples/site2.js
```

### 调试技巧

- 查看管理界面了解连接状态
- 检查浏览器开发者工具的网络面板
- 查看客户端控制台日志
- 使用 `curl` 测试API端点

## 🚨 注意事项

### Vercel限制
- WebSocket连接有时间限制（通常10分钟）
- Edge Functions有执行时间限制
- 并发连接数有限制

### 安全考虑
- 建议使用HTTPS/WSS协议
- 可添加身份验证机制
- 限制允许的站点ID
- 监控异常连接

### 性能优化
- 合理设置心跳间隔
- 优化请求转发逻辑
- 使用连接池管理
- 监控内存使用

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 故障排除

### 常见问题

**Q: 客户端连接失败**
A: 检查代理服务器地址、网络连接和防火墙设置

**Q: 子域名访问404**
A: 确认路由配置正确，DNS解析正确

**Q: 请求超时**
A: 检查内网站点是否正常运行，调整超时设置

**Q: 频繁断连**
A: 检查网络稳定性，调整心跳间隔

### 获取帮助

- 查看项目文档
- 提交 Issue
- 加入讨论群组

---

**静态Web代理系统** - 让内网服务轻松获得公网访问能力 🌐
