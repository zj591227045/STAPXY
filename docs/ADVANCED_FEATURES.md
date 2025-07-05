# 高级功能扩展指南

## 🔧 访问规则配置示例

### 1. IP 白名单/黑名单

```typescript
// src/lib/access-control.ts
export class AccessControl {
  private whitelist: Set<string> = new Set();
  private blacklist: Set<string> = new Set();

  constructor(config: AccessControlConfig) {
    this.whitelist = new Set(config.whitelist || []);
    this.blacklist = new Set(config.blacklist || []);
  }

  isAllowed(ip: string, siteId: string): boolean {
    // 黑名单优先
    if (this.blacklist.has(ip)) {
      return false;
    }
    
    // 如果有白名单，只允许白名单 IP
    if (this.whitelist.size > 0) {
      return this.whitelist.has(ip);
    }
    
    return true;
  }
}

// 在中间件中使用
export function middleware(request: NextRequest) {
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || '';
  const siteId = subdomainRouter.getSiteIdByHost(host);
  
  if (siteId && !accessControl.isAllowed(clientIP, siteId)) {
    return new NextResponse('Access Denied', { status: 403 });
  }
  
  // ... 其他逻辑
}
```

### 2. 请求头过滤和修改

```typescript
// src/lib/header-filter.ts
export class HeaderFilter {
  private blockedHeaders = new Set([
    'x-real-ip',
    'x-forwarded-for',
    'authorization' // 可配置是否阻止
  ]);

  filterRequestHeaders(headers: Record<string, string>, siteId: string): Record<string, string> {
    const filtered = { ...headers };
    
    // 移除敏感头部
    this.blockedHeaders.forEach(header => {
      delete filtered[header.toLowerCase()];
    });
    
    // 添加自定义头部
    filtered['x-proxy-site'] = siteId;
    filtered['x-proxy-timestamp'] = Date.now().toString();
    
    return filtered;
  }
}
```

### 3. 路径重写规则

```typescript
// src/lib/path-rewriter.ts
export class PathRewriter {
  private rules: Map<string, RewriteRule[]> = new Map();

  addRule(siteId: string, rule: RewriteRule) {
    if (!this.rules.has(siteId)) {
      this.rules.set(siteId, []);
    }
    this.rules.get(siteId)!.push(rule);
  }

  rewritePath(path: string, siteId: string): string {
    const rules = this.rules.get(siteId) || [];
    
    for (const rule of rules) {
      if (rule.pattern.test(path)) {
        return path.replace(rule.pattern, rule.replacement);
      }
    }
    
    return path;
  }
}

interface RewriteRule {
  pattern: RegExp;
  replacement: string;
  description?: string;
}

// 配置示例
pathRewriter.addRule('site1', {
  pattern: /^\/old-api\/(.*)/,
  replacement: '/new-api/$1',
  description: 'Redirect old API paths to new API'
});
```

### 4. 速率限制

```typescript
// src/lib/rate-limiter.ts
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private limits: Map<string, RateLimit> = new Map();

  setLimit(siteId: string, limit: RateLimit) {
    this.limits.set(siteId, limit);
  }

  isAllowed(ip: string, siteId: string): boolean {
    const key = `${siteId}:${ip}`;
    const now = Date.now();
    const limit = this.limits.get(siteId);
    
    if (!limit) return true;
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const requests = this.requests.get(key)!;
    
    // 清理过期请求
    const validRequests = requests.filter(time => now - time < limit.windowMs);
    
    if (validRequests.length >= limit.maxRequests) {
      return false;
    }
    
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return true;
  }
}

interface RateLimit {
  maxRequests: number;
  windowMs: number;
}
```

## 📊 性能监控

### 1. 请求指标收集

```typescript
// src/lib/metrics.ts
export class MetricsCollector {
  private requestCount = 0;
  private responseTime: number[] = [];
  private errorCount = 0;

  recordRequest(siteId: string, startTime: number, endTime: number, statusCode: number) {
    this.requestCount++;
    this.responseTime.push(endTime - startTime);
    
    if (statusCode >= 400) {
      this.errorCount++;
    }
    
    // 保持最近 1000 个请求的响应时间
    if (this.responseTime.length > 1000) {
      this.responseTime.shift();
    }
  }

  getMetrics() {
    const avgResponseTime = this.responseTime.length > 0 
      ? this.responseTime.reduce((a, b) => a + b, 0) / this.responseTime.length 
      : 0;

    return {
      totalRequests: this.requestCount,
      averageResponseTime: avgResponseTime,
      errorRate: this.errorCount / this.requestCount,
      currentConnections: connectionManager.getConnectionStats().active
    };
  }
}
```

### 2. 健康检查

```typescript
// src/lib/health-checker.ts
export class HealthChecker {
  private healthStatus: Map<string, HealthStatus> = new Map();

  async checkSiteHealth(siteId: string, targetUrl: string): Promise<HealthStatus> {
    try {
      const startTime = Date.now();
      const response = await fetch(`${targetUrl}/health`, {
        method: 'GET',
        timeout: 5000
      });
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      const status: HealthStatus = {
        siteId,
        isHealthy: response.ok,
        responseTime,
        statusCode: response.status,
        lastCheck: Date.now()
      };
      
      this.healthStatus.set(siteId, status);
      return status;
      
    } catch (error) {
      const status: HealthStatus = {
        siteId,
        isHealthy: false,
        responseTime: -1,
        statusCode: 0,
        lastCheck: Date.now(),
        error: error.message
      };
      
      this.healthStatus.set(siteId, status);
      return status;
    }
  }

  startPeriodicCheck(interval: number = 30000) {
    setInterval(async () => {
      const connections = connectionManager.getActiveConnections();
      
      for (const siteId of connections) {
        const route = connectionManager.getRoute(siteId);
        if (route) {
          await this.checkSiteHealth(siteId, route.targetUrl);
        }
      }
    }, interval);
  }
}

interface HealthStatus {
  siteId: string;
  isHealthy: boolean;
  responseTime: number;
  statusCode: number;
  lastCheck: number;
  error?: string;
}
```

## 🚀 性能优化建议

### 1. 连接池管理

```typescript
// src/lib/connection-pool.ts
export class ConnectionPool {
  private pools: Map<string, http.Agent> = new Map();

  getAgent(targetUrl: string): http.Agent {
    if (!this.pools.has(targetUrl)) {
      const agent = new http.Agent({
        keepAlive: true,
        maxSockets: 50,
        maxFreeSockets: 10,
        timeout: 30000
      });
      this.pools.set(targetUrl, agent);
    }
    
    return this.pools.get(targetUrl)!;
  }
}
```

### 2. 请求缓存

```typescript
// src/lib/cache.ts
export class RequestCache {
  private cache: Map<string, CacheEntry> = new Map();
  private ttl: number = 60000; // 1分钟

  get(key: string): any | null {
    const entry = this.cache.get(key);
    
    if (!entry || Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any, customTtl?: number): void {
    const expiry = Date.now() + (customTtl || this.ttl);
    this.cache.set(key, { data, expiry });
  }

  generateKey(method: string, url: string, headers: Record<string, string>): string {
    const relevantHeaders = ['accept', 'accept-language', 'authorization'];
    const headerString = relevantHeaders
      .map(h => `${h}:${headers[h] || ''}`)
      .join('|');
    
    return `${method}:${url}:${headerString}`;
  }
}

interface CacheEntry {
  data: any;
  expiry: number;
}
```

这些扩展功能可以显著提升系统的功能性和性能。您希望我实现其中的哪些功能，或者您有其他特定的需求吗？
