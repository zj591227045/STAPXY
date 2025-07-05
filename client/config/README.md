# 客户端配置文件说明

## 📁 配置文件结构

```
client/config/
├── README.md                      # 配置说明文档
├── site-template.json             # 配置模板文件
├── access-control-site1.json      # 站点1访问控制配置
└── access-control-{siteId}.json   # 其他站点配置
```

## 🔧 配置文件命名规则

- **模板文件**: `site-template.json`
- **站点配置**: `access-control-{siteId}.json`
  - 例如: `access-control-site1.json`, `access-control-api.json`

## 📝 配置文件格式

### 基本结构

```json
{
  "enabled": true,
  "rules": {
    "ipWhitelist": [],
    "ipBlacklist": [],
    "rateLimit": {},
    "timeWindow": {},
    "pathRules": [],
    "headerRules": [],
    "customRules": []
  },
  "logging": {}
}
```

### IP 访问控制

```json
{
  "ipWhitelist": [
    "192.168.1.100",      // 单个IP
    "192.168.1.0/24",     // 网段
    "10.0.0.0/8"          // 大网段
  ],
  "ipBlacklist": [
    "192.168.1.200",
    "203.0.113.0/24"
  ]
}
```

### 速率限制

```json
{
  "rateLimit": {
    "enabled": true,
    "maxRequests": 100,           // 每分钟最大请求数
    "windowMs": 60000,            // 时间窗口（毫秒）
    "message": "请求过于频繁"      // 自定义错误消息
  }
}
```

### 时间窗口控制

```json
{
  "timeWindow": {
    "enabled": true,
    "start": "09:00",             // 开始时间
    "end": "18:00",               // 结束时间
    "timezone": "Asia/Shanghai"   // 时区
  }
}
```

### 路径规则

```json
{
  "pathRules": [
    {
      "pattern": "^/admin/",      // 正则表达式
      "action": "deny",           // allow 或 deny
      "description": "保护管理界面"
    }
  ]
}
```

### 请求头规则

```json
{
  "headerRules": [
    {
      "header": "user-agent",
      "pattern": "bot|crawler|spider",
      "action": "deny",
      "description": "阻止爬虫"
    }
  ]
}
```

## 🛠️ 管理工具

### 创建新配置

```bash
# 使用默认模板
node tools/access-control-manager.js create site2

# 使用特定模板
node tools/access-control-manager.js create api web-server
```

### 查看配置

```bash
node tools/access-control-manager.js view site1
```

### 测试配置

```bash
node tools/access-control-manager.js test site1 192.168.1.100 GET /admin/
```

## 📊 日志配置

```json
{
  "logging": {
    "enabled": true,
    "logLevel": "info",           // debug, info, warn, error
    "logFile": "./logs/access.log",
    "maxLogSize": 10000
  }
}
```

## 🔄 配置热重载

- 配置文件修改后自动生效
- 无需重启客户端
- 支持实时调整访问规则

## 📋 最佳实践

1. **使用模板**: 从 `site-template.json` 复制创建新配置
2. **分层防护**: 结合 IP、速率、路径等多种规则
3. **测试验证**: 使用管理工具测试配置效果
4. **监控日志**: 定期检查访问日志和统计信息
5. **备份配置**: 重要配置文件要做版本控制

## 🚨 注意事项

- 配置文件格式必须是有效的 JSON
- IP 地址支持 IPv4 和 CIDR 格式
- 正则表达式要注意转义字符
- 时间格式使用 24 小时制 (HH:MM)
- 日志文件路径相对于客户端根目录
