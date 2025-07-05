# 管理控制台使用指南

## 🎯 概述

静态Web代理系统现在支持独立的管理控制台域名，避免与代理网站产生冲突。管理控制台提供了完整的系统管理功能，包括登录认证、状态监控、配置管理等。

## 🔧 配置说明

### 管理域名配置

在 `config/config.json` 中配置管理控制台的专用域名：

```json
{
  "admin": {
    "password": "your-admin-password",
    "sessionTimeout": 3600000,
    "domain": "admin.localhost",
    "allowedOrigins": [
      "http://localhost:3000",
      "http://admin.localhost:3000",
      "https://admin.localhost:3000"
    ]
  }
}
```

### 配置参数说明

- `domain`: 管理控制台的专用域名
- `allowedOrigins`: 允许访问管理控制台的来源域名列表
- `password`: 管理员登录密码
- `sessionTimeout`: 会话超时时间（毫秒）

## 🚀 使用方法

### 1. 本地开发环境

启动服务器：
```bash
npm run dev
```

访问管理控制台：
- 主域名：http://localhost:3000
- 管理域名：http://admin.localhost:3000

**配置hosts文件（可选）：**
在 `C:\Windows\System32\drivers\etc\hosts` (Windows) 或 `/etc/hosts` (Linux/Mac) 中添加：
```
127.0.0.1 admin.localhost
```

**或者使用curl测试：**
```bash
curl -H "Host: admin.localhost:3000" http://localhost:3000/
```

### 2. 生产环境

配置DNS记录，将管理域名指向服务器：
```
admin.yourdomain.com -> 服务器IP
```

更新配置文件：
```json
{
  "admin": {
    "domain": "admin.yourdomain.com",
    "allowedOrigins": [
      "https://yourdomain.com",
      "https://admin.yourdomain.com"
    ]
  }
}
```

## 🔐 API端点

### 登录认证

**POST /api/admin/login**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"password":"your-password"}'
```

**DELETE /api/admin/login** - 退出登录

**GET /api/admin/login** - 验证会话

### 系统状态

**GET /api/admin/status**
```bash
curl http://localhost:3000/api/admin/status \
  -H "Cookie: admin_session=your-session-id"
```

### 配置管理

**GET /api/admin/config** - 获取配置信息

**PUT /api/admin/config** - 更新配置

**POST /api/admin/config** - 重新加载配置

### 访问密钥管理

**GET /api/admin/keys** - 获取访问密钥列表

**PATCH /api/admin/keys** - 切换密钥状态（仅开发模式）

## 🛡️ 安全特性

### 域名隔离

- 管理控制台使用独立域名，与代理网站完全隔离
- 中间件自动识别管理域名，只允许访问管理功能
- 非管理域名无法访问管理API

### 会话管理

- 基于安全的会话ID进行身份验证
- 会话自动过期机制
- HttpOnly Cookie防止XSS攻击

### 权限控制

- 所有管理API都需要有效的管理员会话
- 敏感配置信息在返回时会被脱敏处理

## 🔍 故障排除

### 1. 无法访问管理控制台

检查配置：
```bash
# 验证配置文件语法
node -e "console.log(JSON.parse(require('fs').readFileSync('config/config.json', 'utf8')))"
```

检查域名解析：
```bash
# Windows
nslookup admin.localhost

# Linux/Mac
dig admin.localhost
```

### 2. 登录失败

- 确认管理员密码正确
- 检查会话是否过期
- 验证Cookie设置

### 3. API返回401错误

- 确认已正确登录
- 检查会话Cookie是否存在
- 验证请求域名是否正确

## 📝 开发说明

### 添加新的管理API

1. 在 `src/app/api/admin/` 目录下创建新的路由文件
2. 使用 `verifyAdminAuth()` 验证管理员权限
3. 使用 `createSuccessResponse()` 和 `createErrorResponse()` 返回标准格式

### 扩展配置选项

1. 更新 `AdminConfig` 接口定义
2. 修改 `ConfigManager` 类的相关方法
3. 更新配置模板文件

## 🎉 总结

通过域名隔离和完整的API体系，管理控制台现在提供了：

- ✅ 独立的管理域名，避免与代理网站冲突
- ✅ 完整的身份验证和会话管理
- ✅ 实时的系统状态监控
- ✅ 灵活的配置管理功能
- ✅ 安全的访问密钥管理

这确保了管理功能的安全性和可用性，同时保持了系统的整体架构清晰。
