# 从Vercel KV到Edge Config的迁移

本文档说明了项目从使用Vercel KV（付费功能）迁移到Vercel Edge Config（免费功能）的过程和原因。

## 迁移原因

### 成本考虑
- **Vercel KV**: 付费功能，按请求数量计费
- **Vercel Edge Config**: 免费功能，适合存储配置数据

### 使用场景匹配
- **Edge Config**: 适合频繁读取、不频繁更新的配置数据
- **我们的需求**: 主要存储静态配置，动态数据使用内存存储

## 架构变化

### 旧架构（KV）
```
所有数据 → Vercel KV数据库
- 路由信息
- 请求/响应数据
- 客户端状态
- 配置信息
```

### 新架构（Edge Config + 内存）
```
静态配置 → Vercel Edge Config
- 静态路由配置
- 访问密钥配置
- 代理配置

动态数据 → 内存存储
- 动态路由信息
- 请求/响应数据
- 客户端状态
```

## 技术实现

### 存储分层
1. **Edge Config层**: 存储不经常变化的配置数据
2. **内存层**: 存储频繁变化的运行时数据

### 数据清理机制
- 自动清理过期的请求/响应数据
- 定期清理不活跃的客户端状态
- 内存使用优化

## 代码变化

### 依赖更新
```bash
# 移除
npm uninstall @vercel/kv

# 添加
npm install @vercel/edge-config
```

### 主要文件修改
1. `src/lib/kv-store.ts` → `src/lib/edge-config-store.ts`
2. `src/lib/environment.ts` - 环境检测逻辑
3. `src/lib/serverless-connection-manager.ts` - 存储接口调用

### 环境变量变化
```bash
# 旧环境变量
KV_REST_API_URL=xxx
KV_REST_API_TOKEN=xxx

# 新环境变量
EDGE_CONFIG=xxx
```

## 功能对比

| 功能 | KV实现 | Edge Config实现 |
|------|--------|----------------|
| 静态配置存储 | ✅ | ✅ |
| 动态数据存储 | ✅ | ✅ (内存) |
| 数据持久化 | ✅ | ⚠️ (仅配置) |
| 全局同步 | ✅ | ⚠️ (仅配置) |
| 成本 | 💰 付费 | 🆓 免费 |
| 性能 | 好 | 更好 |

## 限制和注意事项

### Edge Config限制
- 只读访问（运行时不能写入）
- 数据大小限制（512KB）
- 更新需要通过API或Dashboard

### 内存存储限制
- 数据不持久化
- 单实例存储
- 重启后数据丢失

### 适用场景
✅ **适合的场景**:
- 配置驱动的应用
- 读多写少的数据
- 临时性的动态数据

❌ **不适合的场景**:
- 需要持久化所有数据
- 频繁的数据写入
- 跨实例数据共享

## 迁移步骤

### 1. 更新依赖
```bash
npm uninstall @vercel/kv
npm install @vercel/edge-config
```

### 2. 创建Edge Config
1. 在Vercel Dashboard创建Edge Config
2. 配置静态数据（如果需要）
3. 连接到项目

### 3. 更新代码
- 修改存储接口实现
- 更新环境变量引用
- 测试功能完整性

### 4. 部署验证
- 部署到测试环境
- 验证所有功能正常
- 监控性能和错误

## 性能优化

### Edge Config优化
- 合理组织配置数据结构
- 避免频繁的配置更新
- 利用Edge Config的全球分发

### 内存存储优化
- 定期清理过期数据
- 控制内存使用量
- 优化数据结构

## 监控和维护

### 监控指标
- Edge Config读取次数
- 内存使用情况
- 数据清理效果
- 错误率和响应时间

### 维护任务
- 定期检查Edge Config配置
- 监控内存使用趋势
- 优化数据清理策略

## 回滚计划

如果需要回滚到KV：

### 1. 快速回滚
```bash
# 恢复KV依赖
npm install @vercel/kv

# 恢复代码
git revert <commit-hash>

# 重新部署
vercel --prod
```

### 2. 数据迁移
- 从Edge Config导出配置
- 重新创建KV数据库
- 恢复数据结构

## 总结

### 优势
- ✅ 降低成本（免费使用Edge Config）
- ✅ 提高性能（Edge Config全球分发）
- ✅ 简化架构（配置与数据分离）
- ✅ 更好的可维护性

### 注意事项
- ⚠️ 动态数据不持久化
- ⚠️ 需要合理设计数据分层
- ⚠️ 监控内存使用情况

这次迁移成功地将项目从付费的KV存储迁移到免费的Edge Config，在保持功能完整性的同时降低了运营成本。
