# 部署指南

本文档详细介绍如何将静态Web代理系统部署到各种平台。

## 🚀 Vercel部署（推荐）

### 1. 准备工作

确保项目根目录包含以下文件：
- `vercel.json` - Vercel配置文件
- `package.json` - 项目依赖
- `.env.example` - 环境变量示例

### 2. 通过Vercel CLI部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 登录Vercel
vercel login

# 部署项目
vercel

# 部署到生产环境
vercel --prod
```

### 3. 通过GitHub部署

1. 将代码推送到GitHub仓库
2. 在Vercel控制台中导入GitHub项目
3. 配置环境变量
4. 部署

### 4. 配置环境变量

在Vercel控制台的Settings > Environment Variables中添加：

```
PROXY_ROUTES=site1:a1.yourdomain.com:http://localhost:3001,site2:a2.yourdomain.com:http://localhost:3002,site3:a3.yourdomain.com:http://localhost:3003
```

### 5. 配置自定义域名

1. 在Vercel控制台中添加自定义域名
2. 配置DNS记录：

```
# 主域名
A    yourdomain.com         → Vercel IP
AAAA yourdomain.com         → Vercel IPv6

# 子域名（通配符）
A    *.yourdomain.com       → Vercel IP
AAAA *.yourdomain.com       → Vercel IPv6

# 或者单独配置每个子域名
A    a1.yourdomain.com      → Vercel IP
A    a2.yourdomain.com      → Vercel IP
A    a3.yourdomain.com      → Vercel IP
```

## 🌐 Netlify部署

### 1. 创建netlify.toml

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "18"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

[functions]
  node_bundler = "esbuild"
```

### 2. 部署步骤

```bash
# 安装Netlify CLI
npm install -g netlify-cli

# 登录Netlify
netlify login

# 部署
netlify deploy

# 部署到生产环境
netlify deploy --prod
```

### 3. 配置环境变量

在Netlify控制台的Site settings > Environment variables中添加环境变量。

## ☁️ 其他平台部署

### Railway

1. 连接GitHub仓库
2. 配置环境变量
3. 自动部署

### Render

1. 创建Web Service
2. 连接GitHub仓库
3. 配置构建命令：`npm run build`
4. 配置启动命令：`npm start`

### Cloudflare Pages

1. 连接GitHub仓库
2. 配置构建设置：
   - 构建命令：`npm run build`
   - 输出目录：`.next`
3. 配置环境变量

## 🔧 生产环境配置

### 环境变量配置

```bash
# 必需的环境变量
PROXY_ROUTES=site1:a1.yourdomain.com:http://localhost:3001,site2:a2.yourdomain.com:http://localhost:3002

# 可选的环境变量
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### 安全配置

1. **HTTPS强制**：确保所有连接使用HTTPS/WSS
2. **CORS配置**：限制允许的源域名
3. **速率限制**：防止滥用
4. **身份验证**：添加API密钥验证

### 性能优化

1. **CDN配置**：使用CDN加速静态资源
2. **缓存策略**：配置适当的缓存头
3. **压缩**：启用Gzip/Brotli压缩
4. **监控**：设置性能监控和告警

## 📱 客户端部署

### 系统服务部署（Linux）

创建systemd服务文件：

```bash
# /etc/systemd/system/proxy-client-site1.service
[Unit]
Description=Proxy Client Site1
After=network.target

[Service]
Type=simple
User=proxy
WorkingDirectory=/opt/proxy-client
Environment=NODE_ENV=production
Environment=PROXY_URL=wss://yourdomain.com/api/websocket
Environment=SITE_ID=site1
Environment=TARGET_URL=http://localhost:3001
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl enable proxy-client-site1
sudo systemctl start proxy-client-site1
sudo systemctl status proxy-client-site1
```

### Docker部署

创建Dockerfile：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY client/package*.json ./
RUN npm ci --only=production

COPY client/ .

CMD ["node", "index.js"]
```

构建和运行：

```bash
# 构建镜像
docker build -t proxy-client .

# 运行容器
docker run -d \
  --name proxy-client-site1 \
  --restart unless-stopped \
  -e PROXY_URL=wss://yourdomain.com/api/websocket \
  -e SITE_ID=site1 \
  -e TARGET_URL=http://localhost:3001 \
  proxy-client
```

### PM2部署

```bash
# 安装PM2
npm install -g pm2

# 创建配置文件
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'proxy-client-site1',
      script: 'index.js',
      cwd: './client',
      env: {
        NODE_ENV: 'production',
        PROXY_URL: 'wss://yourdomain.com/api/websocket',
        SITE_ID: 'site1',
        TARGET_URL: 'http://localhost:3001'
      },
      restart_delay: 5000,
      max_restarts: 10
    },
    {
      name: 'proxy-client-site2',
      script: 'index.js',
      cwd: './client',
      env: {
        NODE_ENV: 'production',
        PROXY_URL: 'wss://yourdomain.com/api/websocket',
        SITE_ID: 'site2',
        TARGET_URL: 'http://localhost:3002'
      },
      restart_delay: 5000,
      max_restarts: 10
    }
  ]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存配置
pm2 save

# 设置开机启动
pm2 startup
```

## 🔍 部署验证

### 1. 功能测试

```bash
# 测试主域名
curl -I https://yourdomain.com

# 测试子域名
curl -I https://a1.yourdomain.com
curl -I https://a2.yourdomain.com

# 测试WebSocket连接
wscat -c wss://yourdomain.com/api/websocket
```

### 2. 性能测试

```bash
# 使用ab进行压力测试
ab -n 1000 -c 10 https://a1.yourdomain.com/

# 使用wrk进行性能测试
wrk -t12 -c400 -d30s https://a1.yourdomain.com/
```

### 3. 监控设置

- 设置健康检查端点
- 配置日志收集
- 设置告警规则
- 监控连接数和响应时间

## 🚨 故障排除

### 常见问题

1. **WebSocket连接失败**
   - 检查防火墙设置
   - 确认WSS协议支持
   - 验证证书配置

2. **子域名解析失败**
   - 检查DNS配置
   - 验证通配符证书
   - 确认路由配置

3. **客户端连接不稳定**
   - 调整心跳间隔
   - 检查网络质量
   - 优化重连逻辑

### 日志分析

```bash
# Vercel日志
vercel logs

# Netlify日志
netlify logs

# 客户端日志
journalctl -u proxy-client-site1 -f
```

## 📈 扩展部署

### 多区域部署

1. 在多个区域部署代理服务器
2. 使用DNS负载均衡
3. 客户端自动选择最近的服务器

### 高可用部署

1. 部署多个代理服务器实例
2. 使用负载均衡器
3. 实现故障转移机制

### 监控和告警

1. 设置健康检查
2. 配置性能监控
3. 设置告警通知
4. 建立运维流程
