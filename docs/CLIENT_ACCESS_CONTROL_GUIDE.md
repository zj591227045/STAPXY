# 客户端访问控制指南

## 🎯 设计理念

基于您的需求，我们重新设计了访问控制系统：

### ✅ 客户端配置的优势

1. **代理服务器保持静态**：不存储任何配置和状态
2. **客户端主导控制**：每个客户端管理自己的访问规则
3. **配置灵活性**：可以随时修改配置，无需重启代理服务器
4. **本地日志存储**：访问日志存储在客户端，便于分析和审计
5. **独立性**：每个站点的访问控制相互独立

## 📁 文件结构

```
client/
├── lib/
│   └── access-control.js           # 访问控制核心库
├── tools/
│   └── access-control-manager.js   # 配置管理工具
├── examples/
│   └── access-control-site1.json   # 配置示例
├── logs/
│   └── access-site1.log           # 访问日志
└── access-control-site1.json      # 站点配置文件
```

## 🚀 快速开始

### 1. 创建配置文件

```bash
# 进入客户端目录
cd client

# 创建站点配置
node tools/access-control-manager.js create site1 web-server

# 查看配置
node tools/access-control-manager.js view site1
```

### 2. 配置访问规则

编辑 `access-control-site1.json`：

```json
{
  "enabled": true,
  "rules": {
    "ipWhitelist": [
      "192.168.1.0/24",
      "10.0.0.0/8"
    ],
    "rateLimit": {
      "enabled": true,
      "maxRequests": 100,
      "windowMs": 60000
    },
    "pathRules": [
      {
        "pattern": "^/admin/",
        "action": "deny",
        "description": "保护管理界面"
      }
    ]
  }
}
```

### 3. 启动客户端

```bash
# 启动客户端（会自动加载访问控制配置）
node examples/site1.js
```

## 🔧 配置详解

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
    },
    {
      "pattern": "^/api/public/",
      "action": "allow",
      "description": "允许公共API"
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
    },
    {
      "header": "authorization",
      "pattern": "Bearer .+",
      "action": "allow",
      "description": "需要认证"
    }
  ]
}
```

## 🛠️ 管理工具

### 配置管理

```bash
# 列出所有配置
node tools/access-control-manager.js list

# 创建新配置
node tools/access-control-manager.js create site2 api-server

# 查看配置
node tools/access-control-manager.js view site1

# 启用/禁用访问控制
node tools/access-control-manager.js enable site1
node tools/access-control-manager.js disable site1
```

### 测试配置

```bash
# 测试访问规则
node tools/access-control-manager.js test site1 192.168.1.100 GET /admin/

# 输出示例：
# 🧪 测试结果 (站点: site1):
#    请求: GET /admin/
#    客户端IP: 192.168.1.100
#    结果: ❌ 拒绝
#    原因: Path rule: deny
#    状态码: 403
```

### 监控和日志

```bash
# 查看访问统计
node tools/access-control-manager.js stats site1

# 查看最近日志
node tools/access-control-manager.js logs site1 100
```

## 📊 日志和监控

### 访问日志格式

```json
{
  "timestamp": 1625097600000,
  "clientIP": "192.168.1.100",
  "method": "GET",
  "path": "/api/users",
  "userAgent": "Mozilla/5.0...",
  "headers": {...},
  "blocked": false,
  "reason": null
}
```

### 统计信息

```bash
📊 站点 site1 的访问统计:
   总请求数: 1250
   最近1小时请求数: 45
   唯一IP数: 12
   被阻止请求数: 8
   阻止率: 17.78%
```

## 🔄 工作流程

### 1. 请求处理流程

```
用户请求 → 代理服务器 → WebSocket → 客户端访问控制 → 目标服务器
                                        ↓
                                   本地日志记录
```

### 2. 配置同步

- 客户端启动时加载本地配置
- 配置修改后立即生效
- 无需重启代理服务器
- 每个客户端独立管理配置

### 3. 日志管理

- 访问日志存储在客户端本地
- 支持日志轮转和大小限制
- 可以导出到外部监控系统

## 🎨 配置模板

### Web 服务器模板

```bash
node tools/access-control-manager.js create mysite web-server
```

适用于：网站、博客、静态站点

### API 服务器模板

```bash
node tools/access-control-manager.js create myapi api-server
```

适用于：REST API、微服务

### 开发环境模板

```bash
node tools/access-control-manager.js create devsite development
```

适用于：开发测试环境

## 🔒 安全最佳实践

### 1. 分层防护

```json
{
  "rules": {
    "ipWhitelist": ["192.168.0.0/16"],     // 网络层
    "rateLimit": {"enabled": true},         // 频率控制
    "pathRules": [                          // 应用层
      {"pattern": "^/admin/", "action": "deny"}
    ]
  }
}
```

### 2. 监控告警

```json
{
  "monitoring": {
    "alertThresholds": {
      "blockedRequestsPerMinute": 50,
      "errorRatePercent": 10
    }
  }
}
```

### 3. 日志审计

```bash
# 定期检查访问日志
node tools/access-control-manager.js logs site1 1000 | grep "blocked.*true"
```

## 🚀 高级功能

### 1. 动态配置更新

配置文件修改后自动生效，无需重启客户端。

### 2. 自定义规则

可以编写复杂的自定义访问规则。

### 3. 集成监控

支持导出指标到 Prometheus、Grafana 等监控系统。

## 🎯 总结

这种客户端配置的访问控制系统完美符合您的需求：

- ✅ **代理服务器静态化**：不存储任何配置
- ✅ **客户端主导**：配置和日志都在客户端
- ✅ **灵活配置**：随时修改，立即生效
- ✅ **独立管理**：每个站点独立配置
- ✅ **本地日志**：便于分析和审计

这样的设计既保持了代理服务器的简洁性，又给了客户端充分的控制权和灵活性。
