# 访问控制配置指南

## 📍 配置位置说明

访问控制规则**完全在服务端配置**，有以下几种配置方式：

### 1. 配置文件方式（推荐）

**配置文件位置：** `access-control-config.json`

```json
{
  "accessControl": {
    "site1": {
      "ipWhitelist": ["192.168.1.100", "10.0.0.0/8"],
      "ipBlacklist": ["192.168.1.200"],
      "rateLimit": {
        "maxRequests": 100,
        "windowMs": 60000,
        "message": "请求过于频繁"
      },
      "timeWindow": {
        "start": "09:00",
        "end": "18:00",
        "timezone": "Asia/Shanghai"
      },
      "customRules": [
        {
          "type": "header",
          "action": "deny",
          "condition": {
            "name": "user-agent",
            "pattern": "bot|crawler|spider"
          },
          "description": "阻止爬虫访问"
        }
      ]
    }
  }
}
```

**优势：**
- ✅ 支持热重载，修改后自动生效
- ✅ 版本控制友好
- ✅ 批量配置多个站点
- ✅ 配置持久化

### 2. API 动态配置

**API 端点：** `POST /api/admin/access-control`

```bash
# 设置 IP 白名单
curl -X POST http://localhost:3000/api/admin/access-control \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "site1",
    "type": "ip_whitelist",
    "config": {
      "ips": ["192.168.1.100", "192.168.1.101"]
    }
  }'

# 设置速率限制
curl -X POST http://localhost:3000/api/admin/access-control \
  -H "Content-Type: application/json" \
  -d '{
    "siteId": "site1",
    "type": "rate_limit",
    "config": {
      "maxRequests": 100,
      "windowMs": 60000,
      "message": "请求过于频繁"
    }
  }'
```

**优势：**
- ✅ 实时配置，立即生效
- ✅ 程序化配置
- ✅ 适合动态场景

### 3. 代码配置

```typescript
import { accessControl } from '@/lib/access-control';

// 在服务器启动时配置
accessControl.setIPWhitelist('site1', ['192.168.1.100']);
accessControl.setRateLimit('site1', {
  maxRequests: 100,
  windowMs: 60000
});
```

## 🔧 配置规则详解

### IP 访问控制

```json
{
  "ipWhitelist": [
    "192.168.1.100",      // 单个 IP
    "192.168.1.0/24",     // CIDR 网段
    "10.0.0.0/8"          // 大网段
  ],
  "ipBlacklist": [
    "192.168.1.200",
    "203.0.113.0/24"
  ]
}
```

**执行优先级：**
1. 黑名单检查（最高优先级）
2. 白名单检查
3. 其他规则

### 速率限制

```json
{
  "rateLimit": {
    "maxRequests": 100,           // 最大请求数
    "windowMs": 60000,            // 时间窗口（毫秒）
    "message": "请求过于频繁"      // 自定义错误消息
  }
}
```

**说明：**
- 基于客户端 IP 进行限制
- 使用滑动窗口算法
- 超出限制返回 429 状态码

### 时间窗口控制

```json
{
  "timeWindow": {
    "start": "09:00",             // 开始时间 (HH:MM)
    "end": "18:00",               // 结束时间 (HH:MM)
    "timezone": "Asia/Shanghai"   // 时区（可选）
  }
}
```

**说明：**
- 支持跨天时间窗口（如 "22:00" 到 "06:00"）
- 时区默认为服务器时区
- 超出时间窗口返回 403 状态码

### 自定义规则

```json
{
  "customRules": [
    {
      "type": "header",           // 规则类型：header, path, ip
      "action": "deny",           // 动作：allow, deny
      "condition": {
        "name": "user-agent",     // 请求头名称
        "pattern": "bot|crawler"  // 正则表达式模式
      },
      "description": "阻止爬虫访问"
    },
    {
      "type": "path",
      "action": "deny",
      "condition": {
        "pattern": "^/admin/"     // 路径模式
      },
      "description": "保护管理路径"
    }
  ]
}
```

## 🚀 配置管理

### 启动时自动加载

服务器启动时会自动：
1. 检查 `access-control-config.json` 是否存在
2. 如果不存在，创建默认配置文件
3. 加载配置并应用到访问控制系统
4. 开始监听配置文件变化

### 热重载

配置文件修改后会自动重新加载，无需重启服务器：

```bash
# 修改配置文件
vim access-control-config.json

# 保存后自动生效，查看日志
tail -f logs/server.log
```

### 配置验证

使用配置脚本验证和测试：

```bash
# 应用配置
node examples/access-control-config.js

# 查看当前配置状态
curl "http://localhost:3000/api/admin/access-control?siteId=site1"
```

## 📊 监控和调试

### 查看访问统计

```bash
# 获取站点访问统计
curl "http://localhost:3000/api/admin/access-control?siteId=site1"
```

### 实时监控

```bash
# 启动实时监控
node examples/monitoring-dashboard.js monitor site1
```

### 日志查看

访问控制的执行情况会记录在服务器日志中：

```
🔧 配置站点 site1 的访问控制规则...
   ✅ IP 白名单: 2 个地址
   ✅ 速率限制: 100 请求/60000ms
   ✅ 时间窗口: 09:00 - 18:00
   ✅ 自定义规则: 2 条
```

## 🎯 最佳实践

### 1. 分层防护

```json
{
  "site1": {
    "ipWhitelist": ["192.168.0.0/16"],     // 第一层：网络层
    "rateLimit": {                          // 第二层：频率控制
      "maxRequests": 100,
      "windowMs": 60000
    },
    "customRules": [                        // 第三层：应用层
      {
        "type": "header",
        "action": "deny",
        "condition": {
          "name": "user-agent",
          "pattern": "bot|crawler"
        }
      }
    ]
  }
}
```

### 2. 渐进式配置

```json
{
  "development": {
    "rateLimit": {
      "maxRequests": 1000,
      "windowMs": 60000
    }
  },
  "production": {
    "ipWhitelist": ["10.0.0.0/8"],
    "rateLimit": {
      "maxRequests": 100,
      "windowMs": 60000
    },
    "timeWindow": {
      "start": "09:00",
      "end": "18:00"
    }
  }
}
```

### 3. 监控告警

结合性能监控系统，设置访问控制告警：

```javascript
// 监控被拒绝的请求
const rejectedRequests = performanceMonitor.getErrorAnalysis('site1');
if (rejectedRequests.errorRate > 0.1) {
  console.warn('⚠️ 高拒绝率检测到，可能需要调整访问控制规则');
}
```

## 🔄 配置迁移

从其他系统迁移配置：

```bash
# 从 Nginx 配置转换
node scripts/nginx-to-access-control.js nginx.conf

# 从 Cloudflare 规则导入
node scripts/cloudflare-import.js rules.json
```

这样，访问控制完全在服务端管理，客户端无需任何配置，只需要正常连接即可。
