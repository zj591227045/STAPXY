# 快速开始指南

本指南将帮助您在5分钟内搭建并运行静态Web代理系统。

## 🎯 目标

完成本指南后，您将拥有：
- 一个运行在本地的代理服务器
- 两个测试站点（端口3001和3002）
- 通过子域名访问内网站点的能力

## 📋 前置要求

- Node.js 18+ 
- Python 3.x（用于测试站点）
- Git

## 🚀 5分钟快速部署

### 步骤1: 克隆项目

```bash
git clone <repository-url>
cd static-proxy
```

### 步骤2: 一键设置测试环境

```bash
npm run setup-test
```

这个命令会：
- 安装所有依赖
- 创建测试站点
- 生成启动脚本

### 步骤3: 启动测试站点

```bash
npm run start-test-sites
```

您应该看到：
```
🌐 启动测试站点...
🚀 启动测试站点1 (端口3001)...
✅ 站点1已启动: http://localhost:3001
🚀 启动测试站点2 (端口3002)...
✅ 站点2已启动: http://localhost:3002
🚀 启动测试站点3 (端口3003)...
✅ 站点3已启动: http://localhost:3003
```

### 步骤4: 启动代理服务器

```bash
npm run dev
```

代理服务器将在 http://localhost:3000 启动。

### 步骤5: 启动客户端连接

打开新的终端窗口：

```bash
# 启动站点1客户端
cd client
node examples/site1.js
```

再打开一个终端窗口：

```bash
# 启动站点2客户端
cd client
node examples/site2.js
```

### 步骤6: 验证部署

1. **访问管理界面**: http://localhost:3000
   - 应该看到2个活跃连接
   - 显示站点1和站点2在线

2. **测试代理访问**:
   - http://a1.localhost:3000 → 站点1
   - http://a2.localhost:3000 → 站点2

## 🎉 成功！

如果一切正常，您应该能够：
- 在管理界面看到连接状态
- 通过子域名访问不同的内网站点
- 看到实时的连接监控

## 🔧 自定义配置

### 修改路由配置

编辑 `.env.local` 文件：

```env
PROXY_ROUTES=site1:a1.localhost:3000:http://localhost:3001,site2:a2.localhost:3000:http://localhost:3002,mysite:custom.localhost:3000:http://localhost:8080
```

### 添加新站点

1. 创建新的客户端配置：

```javascript
// client/examples/mysite.js
import ProxyClient from '../index.js';

const client = new ProxyClient({
  proxyUrl: 'ws://localhost:3000/api/websocket',
  siteId: 'mysite',
  targetUrl: 'http://localhost:8080'
});

client.start().catch(console.error);
```

2. 启动您的内网站点（端口8080）
3. 运行客户端：`node client/examples/mysite.js`
4. 访问：http://custom.localhost:3000

## 🌐 部署到生产环境

### Vercel部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel

# 配置环境变量
vercel env add PROXY_ROUTES
# 输入: site1:a1.yourdomain.com:http://localhost:3001,site2:a2.yourdomain.com:http://localhost:3002

# 部署到生产环境
vercel --prod
```

### 更新客户端配置

部署后，更新客户端连接地址：

```javascript
const client = new ProxyClient({
  proxyUrl: 'wss://your-app.vercel.app/api/websocket',  // 使用WSS
  siteId: 'site1',
  targetUrl: 'http://localhost:3001'
});
```

## 📱 移动端测试

如果您想在移动设备上测试，需要：

1. 获取您的本地IP地址：
```bash
# Windows
ipconfig

# macOS/Linux
ifconfig
```

2. 更新路由配置使用IP地址：
```env
PROXY_ROUTES=site1:a1.192.168.1.100:3000:http://localhost:3001
```

3. 在移动设备上访问：http://a1.192.168.1.100:3000

## 🛑 停止服务

```bash
# 停止测试站点
npm run stop-test-sites

# 停止代理服务器
Ctrl+C

# 停止客户端
Ctrl+C
```

## 🔍 故障排除

### 问题1: 端口被占用

```bash
# 查看端口占用
lsof -i :3000
lsof -i :3001

# 杀死进程
kill -9 <PID>
```

### 问题2: 客户端连接失败

检查：
- 代理服务器是否运行
- WebSocket地址是否正确
- 防火墙设置

### 问题3: 子域名无法访问

检查：
- 路由配置是否正确
- 客户端是否连接成功
- 目标站点是否运行

### 问题4: DNS解析问题

如果localhost子域名不工作，可以：

1. 编辑hosts文件：
```bash
# Windows: C:\Windows\System32\drivers\etc\hosts
# macOS/Linux: /etc/hosts

127.0.0.1 a1.localhost
127.0.0.1 a2.localhost
127.0.0.1 a3.localhost
```

2. 或使用IP地址：
```env
PROXY_ROUTES=site1:a1.127.0.0.1:3000:http://localhost:3001
```

## 📚 下一步

- 阅读 [部署指南](DEPLOYMENT.md) 了解生产环境部署
- 查看 [API文档](API.md) 了解详细的API接口
- 参考 [配置指南](CONFIGURATION.md) 进行高级配置
- 加入社区讨论获取帮助

## 💡 提示

- 使用 `npm run dev` 启动开发模式，支持热重载
- 客户端支持自动重连，网络中断后会自动恢复
- 管理界面每5秒自动刷新状态
- 可以同时运行多个客户端连接不同的站点

---

🎉 **恭喜！您已经成功搭建了静态Web代理系统！**
