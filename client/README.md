# 静态代理客户端

这是内网站点连接到代理服务器的客户端程序。

## 安装

```bash
cd client
npm install
```

## 使用方法

### 方法1: 直接运行示例

```bash
# 启动站点1客户端
node examples/site1.js

# 启动站点2客户端  
node examples/site2.js
```

### 方法2: 命令行参数

```bash
node index.js \
  --proxy-url ws://localhost:3000/api/websocket \
  --site-id site1 \
  --subdomain site1.localhost:3000 \
  --target-url http://localhost:3001 \
  --access-key sk-1234567890abcdef
```

### 方法3: 环境变量

```bash
export PROXY_URL=ws://localhost:3000/api/websocket
export SITE_ID=site1
export SUBDOMAIN=site1.localhost:3000
export TARGET_URL=http://localhost:3001
export ACCESS_KEY=sk-1234567890abcdef
node index.js
```

## 配置参数

- `proxyUrl`: 代理服务器的WebSocket地址
- `siteId`: 站点唯一标识符
- `subdomain`: 子域名（用户访问的域名）
- `targetUrl`: 内网站点的实际地址
- `accessKey`: 访问密钥（从管理界面获取）
- `reconnectInterval`: 连接断开后的重连间隔（毫秒，默认5000）
- `heartbeatInterval`: 心跳发送间隔（毫秒，默认30000）

## 获取访问密钥

代理服务器支持两种密钥模式：

### 🔑 单密钥模式
所有客户端使用同一个访问密钥：

1. 查看代理服务器的 `config.json` 文件
2. 找到 `auth.singleKey.key` 字段
3. 复制密钥值到客户端配置中

**示例配置:**
```json
{
  "auth": {
    "mode": "single",
    "singleKey": {
      "key": "sk-universal-access-key",
      "description": "通用访问密钥"
    }
  }
}
```

### 🔐 多密钥模式
每个域名使用专用密钥：

1. 查看代理服务器的 `config.json` 文件
2. 在 `auth.multiKeys.domainMappings` 中找到对应域名的密钥
3. 或使用 `auth.multiKeys.fallbackKey` 作为备用密钥

**示例配置:**
```json
{
  "auth": {
    "mode": "multi",
    "multiKeys": {
      "domainMappings": [
        {
          "subdomain": "app1.example.com",
          "accessKey": "sk-app1-specific-key",
          "description": "应用1专用密钥"
        }
      ],
      "fallbackKey": {
        "key": "sk-fallback-key",
        "description": "备用密钥"
      }
    }
  }
}
```

## 使用示例

### 方法1: 直接运行示例

**单密钥模式:**
```bash
# 启动站点1客户端（使用通用密钥）
node examples/site1.js

# 启动站点2客户端（使用通用密钥）
node examples/site2.js
```

**多密钥模式:**
```bash
# 启动应用1客户端（使用专用密钥）
node examples/multi-key-app1.js

# 启动应用2客户端（使用专用密钥）
node examples/multi-key-app2.js

# 启动未预定义域名客户端（使用备用密钥）
node examples/multi-key-fallback.js
```

### 方法2: 命令行参数

**单密钥模式:**
```bash
node index.js \
  --proxy-url ws://localhost:3001/api/websocket \
  --site-id mysite \
  --subdomain mysite.localhost:3001 \
  --target-url http://localhost:8080 \
  --access-key sk-universal-access-key
```

**多密钥模式:**
```bash
# 使用域名专用密钥
node index.js \
  --proxy-url ws://localhost:3001/api/websocket \
  --site-id app1 \
  --subdomain app1.localhost:3001 \
  --target-url http://localhost:8080 \
  --access-key sk-app1-specific-key

# 使用备用密钥
node index.js \
  --proxy-url ws://localhost:3001/api/websocket \
  --site-id newapp \
  --subdomain newapp.localhost:3001 \
  --target-url http://localhost:8080 \
  --access-key sk-fallback-key
```

### 方法3: 环境变量

**单密钥模式:**
```bash
export PROXY_URL=ws://localhost:3001/api/websocket
export SITE_ID=mysite
export SUBDOMAIN=mysite.localhost:3001
export TARGET_URL=http://localhost:8080
export ACCESS_KEY=sk-universal-access-key
node index.js
```

**多密钥模式:**
```bash
export PROXY_URL=ws://localhost:3001/api/websocket
export SITE_ID=app1
export SUBDOMAIN=app1.localhost:3001
export TARGET_URL=http://localhost:8080
export ACCESS_KEY=sk-app1-specific-key
node index.js
```

## 工作原理

1. 客户端启动后连接到代理服务器的WebSocket端点
2. 发送注册消息，包含站点ID和目标URL
3. 定期发送心跳消息保持连接活跃
4. 接收来自代理服务器的HTTP请求
5. 将请求转发到内网站点
6. 将响应返回给代理服务器

## 日志说明

- ✅ 成功操作
- ❌ 错误或失败
- ⚠️ 警告信息
- 🔄 处理中
- 📝 注册信息
- 🎉 欢迎消息
- ⏰ 定时操作
- 🛑 停止操作

## 故障排除

### 连接失败
- 检查代理服务器是否运行
- 确认WebSocket地址是否正确
- 检查网络连接

### 请求转发失败
- 确认目标URL是否可访问
- 检查内网站点是否正常运行
- 查看错误日志获取详细信息

### 频繁重连
- 检查网络稳定性
- 调整心跳间隔
- 查看代理服务器日志
