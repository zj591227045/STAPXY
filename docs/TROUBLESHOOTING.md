# 故障排除指南

## 🔧 已修复的问题

### 1. 服务器启动时访问控制加载错误

**问题：**
```
⚠️ 无法加载访问控制配置: Cannot find module 'C:\Code\static-proxy\src\lib\config-loader.js'
```

**原因：**
服务器尝试加载客户端访问控制配置，但在新架构中访问控制完全由客户端管理。

**解决方案：**
- 移除了服务器端的访问控制配置加载代码
- 服务器现在保持完全静态，不加载任何访问控制配置

### 2. 客户端 WebSocket 连接断开问题

**问题：**
```
✅ 站点注册成功: site1.localhost:3000 -> http://100.64.0.10:8080
💓 启动心跳，间隔: 30000ms
❌ 与代理服务器的连接已断开: code=1006, reason=
```

**可能原因：**
1. 心跳启动时机过早
2. 心跳间隔过短
3. WebSocket 连接不稳定

**解决方案：**
1. **延迟心跳启动**：注册成功后延迟3秒再启动心跳
2. **增加心跳间隔**：从30秒增加到60秒
3. **改进连接检查**：在发送心跳前检查连接状态
4. **提供简化版客户端**：用于测试基本连接稳定性

## 🚀 测试步骤

### 1. 测试服务器启动

```bash
# 启动服务器
npm run dev

# 应该看到：
# 🚀 服务器启动成功！
# 📡 Next.js 应用: http://localhost:3000
# 🔌 WebSocket 端点: ws://localhost:3000/ws
# 🌐 代理服务: http://*.localhost:3000
```

### 2. 测试基本连接（使用简化版客户端）

```bash
# 进入客户端目录
cd client

# 启动简化版客户端
node examples/site1-simple.js

# 应该看到：
# 🚀 启动简化版代理客户端...
# 正在连接到代理服务器...
# ✅ 已连接到代理服务器
# 🎉 收到欢迎消息: Connected to static proxy server
# 📝 正在注册站点: site1 (site1.localhost:3000)
# ✅ 站点注册成功: site1.localhost:3000 -> http://100.64.0.10:8080
# 💓 启动心跳，间隔: 60000ms
```

### 3. 测试完整功能（带访问控制）

```bash
# 启动完整版客户端
node examples/site1.js

# 应该看到访问控制初始化信息：
# 🛡️ 访问控制系统已初始化
```

### 4. 测试代理功能

```bash
# 在浏览器中访问
http://site1.localhost:3000/

# 应该正确代理到目标服务器
```

## 🔍 调试技巧

### 1. 检查 WebSocket 连接

```javascript
// 在客户端添加更多调试信息
this.ws.on('open', () => {
  console.log('✅ WebSocket 连接已建立');
  console.log('   readyState:', this.ws.readyState);
  console.log('   protocol:', this.ws.protocol);
});

this.ws.on('close', (code, reason) => {
  console.log('❌ WebSocket 连接关闭');
  console.log('   code:', code);
  console.log('   reason:', reason.toString());
  console.log('   wasClean:', code === 1000);
});
```

### 2. 检查服务器端连接

在 `server.js` 中添加更多日志：

```javascript
wss.on('connection', (ws, request) => {
  console.log('🔗 新的 WebSocket 连接');
  console.log('   来源:', request.socket.remoteAddress);
  console.log('   User-Agent:', request.headers['user-agent']);
  
  ws.on('close', (code, reason) => {
    console.log(`🔌 WebSocket 连接关闭: code=${code}, reason=${reason.toString()}`);
    console.log('   是否正常关闭:', code === 1000);
  });
});
```

### 3. 检查心跳机制

```javascript
// 客户端心跳调试
startHeartbeat() {
  console.log(`💓 启动心跳，间隔: ${this.config.heartbeatInterval}ms`);
  this.heartbeatTimer = setInterval(() => {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log(`💓 发送心跳 (readyState: ${this.ws.readyState})`);
      // ... 发送心跳
    } else {
      console.log(`⚠️ 跳过心跳发送 (connected: ${this.isConnected}, readyState: ${this.ws?.readyState})`);
    }
  }, this.config.heartbeatInterval);
}
```

## 📋 常见问题

### Q1: WebSocket 连接立即断开

**检查项：**
1. 端口是否被占用
2. 防火墙设置
3. 代理服务器是否正常运行
4. WebSocket 路径是否正确 (`/ws`)

### Q2: 注册成功但心跳失败

**检查项：**
1. 心跳间隔设置
2. 服务器端心跳处理逻辑
3. 网络连接稳定性

### Q3: 代理请求失败

**检查项：**
1. 目标服务器是否可达
2. 目标 URL 配置是否正确
3. 网络连接和防火墙设置

## 🛠️ 配置建议

### 生产环境配置

```javascript
const config = {
  heartbeatInterval: 60000,    // 60秒心跳
  reconnectInterval: 5000,     // 5秒重连
  requestTimeout: 30000,       // 30秒请求超时
};
```

### 开发环境配置

```javascript
const config = {
  heartbeatInterval: 30000,    // 30秒心跳
  reconnectInterval: 2000,     // 2秒重连
  requestTimeout: 10000,       // 10秒请求超时
};
```

## 📞 获取帮助

如果问题仍然存在，请提供以下信息：

1. **服务器日志**：完整的服务器启动和运行日志
2. **客户端日志**：客户端连接和错误日志
3. **网络环境**：操作系统、Node.js 版本、网络配置
4. **错误复现步骤**：详细的操作步骤

这将帮助快速定位和解决问题。
