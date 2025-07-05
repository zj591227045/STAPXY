# 服务器配置文件说明

## 📁 配置文件结构

```
config/
├── README.md                      # 本说明文档
├── config.json                    # 主配置文件（运行时使用）
├── config.single-key.template.json  # 单密钥模式配置模板
└── config.multi-key.template.json   # 多密钥模式配置模板
```

## 🚀 快速配置

### 1. 选择配置模式

**单密钥模式（推荐个人使用）：**
```bash
cp config/config.single-key.template.json config/config.json
```

**多密钥模式（推荐企业使用）：**
```bash
cp config/config.multi-key.template.json config/config.json
```

### 2. 编辑配置文件

编辑 `config/config.json`，设置以下参数：

- **管理员密码**：用于访问管理界面
- **访问密钥**：客户端连接时使用的密钥
- **域名配置**：如果有自定义域名

## 📝 配置文件格式

### 单密钥模式

```json
{
  "auth": {
    "adminPassword": "your-admin-password",
    "mode": "single",
    "singleKey": {
      "key": "sk-universal-access-key",
      "description": "通用访问密钥"
    }
  },
  "server": {
    "domain": "localhost:3000",
    "allowedOrigins": ["http://localhost:3000"]
  }
}
```

### 多密钥模式

```json
{
  "auth": {
    "adminPassword": "your-admin-password",
    "mode": "multi",
    "multiKeys": {
      "domainKeys": {
        "site1.localhost:3000": "sk-site1-access-key",
        "site2.localhost:3000": "sk-site2-access-key"
      },
      "fallbackKey": {
        "key": "sk-fallback-access-key",
        "description": "备用访问密钥"
      }
    }
  },
  "server": {
    "domain": "localhost:3000",
    "allowedOrigins": ["http://localhost:3000"]
  }
}
```

## 🔧 配置参数说明

### 认证配置 (auth)

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `adminPassword` | string | ✅ | 管理员密码，用于访问管理界面 |
| `mode` | string | ✅ | 密钥模式：`single` 或 `multi` |

### 单密钥配置 (singleKey)

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `key` | string | ✅ | 通用访问密钥，所有客户端使用同一个密钥 |
| `description` | string | ❌ | 密钥描述 |

### 多密钥配置 (multiKeys)

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `domainKeys` | object | ✅ | 域名到密钥的映射 |
| `fallbackKey` | object | ❌ | 备用密钥配置 |

### 服务器配置 (server)

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `domain` | string | ✅ | 服务器域名 |
| `allowedOrigins` | array | ❌ | 允许的来源域名列表 |

## 🔒 安全建议

### 1. 密码安全
- 使用强密码作为管理员密码
- 定期更换密码
- 不要在代码中硬编码密码

### 2. 密钥管理
- 使用复杂的访问密钥
- 不同站点使用不同密钥（多密钥模式）
- 定期轮换密钥

### 3. 域名配置
- 生产环境使用 HTTPS
- 配置正确的 `allowedOrigins`
- 避免使用通配符域名

## 🌍 部署环境配置

### 开发环境
```json
{
  "server": {
    "domain": "localhost:3000",
    "allowedOrigins": ["http://localhost:3000"]
  }
}
```

### 生产环境
```json
{
  "server": {
    "domain": "yourdomain.com",
    "allowedOrigins": [
      "https://yourdomain.com",
      "https://*.yourdomain.com"
    ]
  }
}
```

### Vercel 部署
```json
{
  "server": {
    "domain": "your-app.vercel.app",
    "allowedOrigins": [
      "https://your-app.vercel.app",
      "https://*.your-app.vercel.app"
    ]
  }
}
```

## 🔄 配置更新

### 热重载
- 配置文件修改后需要重启服务器
- 建议在维护窗口期间更新配置

### 备份配置
```bash
# 备份当前配置
cp config/config.json config/config.backup.$(date +%Y%m%d).json

# 恢复配置
cp config/config.backup.20240101.json config/config.json
```

## 🚨 故障排除

### 常见问题

1. **客户端连接失败**
   - 检查访问密钥是否正确
   - 确认密钥模式配置

2. **管理界面无法访问**
   - 检查管理员密码
   - 确认域名配置

3. **CORS 错误**
   - 检查 `allowedOrigins` 配置
   - 确认域名格式正确

### 配置验证
```bash
# 检查配置文件语法（从项目根目录运行）
node -e "console.log(JSON.parse(require('fs').readFileSync('config/config.json', 'utf8')))"
```

## 📋 配置检查清单

部署前请确认：

- [ ] 已设置强管理员密码
- [ ] 已配置访问密钥
- [ ] 域名配置正确
- [ ] `allowedOrigins` 包含所有必要域名
- [ ] 配置文件语法正确
- [ ] 已备份原配置文件
