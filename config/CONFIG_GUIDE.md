# 静态Web代理系统 - 配置指南

## 📋 配置模式说明

本系统支持两种访问密钥管理模式：**单密钥模式** 和 **多密钥模式**。

### 🔑 单密钥模式 (Single Key Mode)

**适用场景：**
- 个人使用或小团队
- 所有内网站点使用统一管理
- 简化配置和维护

**特点：**
- 所有客户端使用同一个访问密钥
- 配置简单，易于管理
- 适合信任环境下的部署

### 🔐 多密钥模式 (Multi Key Mode)

**适用场景：**
- 企业环境或多租户场景
- 需要细粒度的访问控制
- 不同域名需要不同的安全级别

**特点：**
- 每个域名可以配置专用密钥
- 支持备用密钥用于未预定义的域名
- 提供更高的安全性和灵活性

## 🛠️ 配置文件结构

### 基本结构

```json
{
  "admin": {
    "password": "管理员密码",
    "sessionTimeout": 3600000
  },
  "auth": {
    "mode": "single|multi",
    "singleKey": { ... },
    "multiKeys": { ... }
  },
  "proxy": {
    "maxConnections": 100,
    "heartbeatInterval": 30000,
    "connectionTimeout": 60000
  }
}
```

### 配置字段说明

#### admin 配置
- `password`: 管理员登录密码
- `sessionTimeout`: 会话超时时间（毫秒）

#### auth 配置
- `mode`: 认证模式，可选值：`"single"` 或 `"multi"`

#### proxy 配置
- `maxConnections`: 最大连接数
- `heartbeatInterval`: 心跳间隔（毫秒）
- `connectionTimeout`: 连接超时时间（毫秒）

## 📝 单密钥模式配置

### 配置示例

```json
{
  "admin": {
    "password": "your-admin-password",
    "sessionTimeout": 3600000
  },
  "auth": {
    "mode": "single",
    "singleKey": {
      "key": "sk-your-universal-access-key",
      "description": "通用访问密钥，所有客户端使用此密钥"
    },
    "multiKeys": {
      "domainMappings": [],
      "fallbackKey": {
        "key": "",
        "description": ""
      }
    }
  },
  "proxy": {
    "maxConnections": 100,
    "heartbeatInterval": 30000,
    "connectionTimeout": 60000
  }
}
```

### 客户端使用

```bash
# 所有客户端都使用相同的密钥
node index.js \
  --proxy-url wss://yourdomain.com/api/websocket \
  --site-id site1 \
  --subdomain site1.yourdomain.com \
  --target-url http://localhost:3001 \
  --access-key sk-your-universal-access-key

node index.js \
  --proxy-url wss://yourdomain.com/api/websocket \
  --site-id site2 \
  --subdomain site2.yourdomain.com \
  --target-url http://localhost:3002 \
  --access-key sk-your-universal-access-key
```

## 🔐 多密钥模式配置

### 配置示例

```json
{
  "admin": {
    "password": "your-admin-password",
    "sessionTimeout": 3600000
  },
  "auth": {
    "mode": "multi",
    "singleKey": {
      "key": "",
      "description": ""
    },
    "multiKeys": {
      "domainMappings": [
        {
          "subdomain": "app1.yourdomain.com",
          "accessKey": "sk-app1-specific-key-here",
          "description": "应用1专用密钥"
        },
        {
          "subdomain": "app2.yourdomain.com",
          "accessKey": "sk-app2-specific-key-here",
          "description": "应用2专用密钥"
        },
        {
          "subdomain": "api.yourdomain.com",
          "accessKey": "sk-api-specific-key-here",
          "description": "API服务专用密钥"
        }
      ],
      "fallbackKey": {
        "key": "sk-fallback-key-for-undefined-domains",
        "description": "备用密钥，用于未预定义的域名"
      }
    }
  },
  "proxy": {
    "maxConnections": 100,
    "heartbeatInterval": 30000,
    "connectionTimeout": 60000
  }
}
```

### 客户端使用

```bash
# 应用1使用专用密钥
node index.js \
  --proxy-url wss://yourdomain.com/api/websocket \
  --site-id app1 \
  --subdomain app1.yourdomain.com \
  --target-url http://localhost:3001 \
  --access-key sk-app1-specific-key-here

# 应用2使用专用密钥
node index.js \
  --proxy-url wss://yourdomain.com/api/websocket \
  --site-id app2 \
  --subdomain app2.yourdomain.com \
  --target-url http://localhost:3002 \
  --access-key sk-app2-specific-key-here

# 未预定义域名使用备用密钥
node index.js \
  --proxy-url wss://yourdomain.com/api/websocket \
  --site-id newapp \
  --subdomain newapp.yourdomain.com \
  --target-url http://localhost:3003 \
  --access-key sk-fallback-key-for-undefined-domains
```

## 🔧 快速配置

### 1. 复制模板文件

**单密钥模式：**
```bash
cp config.single-key.template.json config.json
```

**多密钥模式：**
```bash
cp config.multi-key.template.json config.json
```

### 2. 修改配置

编辑 `config.json` 文件：
1. 设置管理员密码
2. 根据需要选择认证模式
3. 配置相应的访问密钥

### 3. 生成安全密钥

建议使用以下格式生成访问密钥：
```
sk-[16位随机字符串]
```

示例：
- `sk-1a2b3c4d5e6f7g8h`
- `sk-9i0j1k2l3m4n5o6p`
- `sk-7q8r9s0t1u2v3w4x`

## ⚠️ 安全注意事项

1. **密钥安全**
   - 使用强随机密钥
   - 定期轮换密钥
   - 不要在代码中硬编码密钥

2. **访问控制**
   - 多密钥模式提供更好的隔离
   - 根据安全需求选择合适的模式
   - 监控密钥使用情况

3. **配置管理**
   - 将配置文件加入版本控制时注意脱敏
   - 使用环境变量覆盖敏感配置
   - 定期备份配置文件

## 🔄 模式切换

要从单密钥模式切换到多密钥模式：

1. 修改 `auth.mode` 为 `"multi"`
2. 配置 `auth.multiKeys.domainMappings`
3. 设置 `auth.multiKeys.fallbackKey`
4. 重启代理服务器
5. 更新客户端配置使用对应的密钥

要从多密钥模式切换到单密钥模式：

1. 修改 `auth.mode` 为 `"single"`
2. 配置 `auth.singleKey`
3. 重启代理服务器
4. 更新所有客户端使用统一密钥

## 📚 更多信息

- [项目README](./README.md)
- [客户端配置指南](./client/README.md)
- [部署指南](./DEPLOYMENT.md)
