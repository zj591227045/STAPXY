# 最终项目文件结构

## 📁 整理后的目录结构

```
static-proxy/
├── 📁 src/                           # Next.js 前端应用
│   ├── 📁 app/                       # App Router 页面
│   ├── 📁 lib/                       # 前端工具库
│   ├── 📁 types/                     # TypeScript 类型定义
│   └── 📄 middleware.ts              # Next.js 中间件
├── 📁 server/                        # 🆕 服务器代码目录
│   └── 📄 server.js                  # WebSocket 服务器主程序
├── 📁 config/                        # 🆕 服务器配置目录
│   ├── 📄 README.md                  # 配置说明文档
│   ├── 📄 config.json                # 主配置文件
│   ├── 📄 config.single-key.template.json  # 单密钥模板
│   └── 📄 config.multi-key.template.json   # 多密钥模板
├── 📁 client/                        # 客户端代码
│   ├── 📁 config/                    # 客户端配置目录
│   │   ├── 📄 README.md              # 配置说明
│   │   ├── 📄 site-template.json     # 配置模板
│   │   └── 📄 access-control-site1.json  # 站点配置
│   ├── 📁 examples/                  # 使用示例
│   ├── 📁 lib/                       # 客户端库
│   ├── 📁 tools/                     # 管理工具
│   └── 📄 index.js                   # 主客户端程序
├── 📁 docs/                          # 项目文档
├── 📄 package.json                   # 项目依赖（已更新脚本路径）
├── 📄 next.config.ts                 # Next.js 配置
├── 📄 tsconfig.json                  # TypeScript 配置
├── 📄 tailwind.config.js             # Tailwind CSS 配置
├── 📄 postcss.config.mjs             # PostCSS 配置
├── 📄 eslint.config.mjs              # ESLint 配置
├── 📄 vercel.json                    # Vercel 部署配置
├── 📄 next-env.d.ts                  # Next.js 类型定义
├── 📄 package-lock.json              # 依赖锁定文件
├── 📄 PROJECT_STRUCTURE.md           # 项目结构说明
├── 📄 FINAL_STRUCTURE.md             # 本文件
└── 📄 README.md                      # 项目主文档
```

## 🔄 文件移动总结

### ✅ 已移动的文件

| 原路径 | 新路径 | 说明 |
|--------|--------|------|
| `server.js` | `server/server.js` | 服务器主程序 |
| `config.json` | `config/config.json` | 主配置文件 |
| `config.single-key.template.json` | `config/config.single-key.template.json` | 单密钥模板 |
| `config.multi-key.template.json` | `config/config.multi-key.template.json` | 多密钥模板 |

### 🔧 已更新的引用

| 文件 | 更新内容 |
|------|----------|
| `package.json` | 更新启动脚本路径 |
| `server/server.js` | 更新配置文件路径 |
| `README.md` | 更新配置命令和项目结构 |
| `PROJECT_STRUCTURE.md` | 更新文件路径说明 |

## 📋 分类说明

### 🖥️ 服务器相关
- **`server/`** - 服务器代码目录
  - 包含 WebSocket 服务器主程序
  - 独立的服务器逻辑

### ⚙️ 配置相关
- **`config/`** - 服务器配置目录
  - 主配置文件和模板
  - 配置说明文档
  - 统一的配置管理

### 💻 客户端相关
- **`client/`** - 客户端代码和配置
  - 客户端程序和库
  - 客户端配置文件
  - 管理工具和示例

### 🎨 前端相关
- **`src/`** - Next.js 前端应用
  - 管理界面
  - API 端点
  - 前端组件

### 📚 文档相关
- **`docs/`** - 项目文档
- **根目录** - 主要说明文档

### 🔧 构建相关
- **根目录** - 构建和配置文件
  - package.json, tsconfig.json 等
  - 保持在根目录便于工具识别

## 🎯 整理的优势

### 1. 结构清晰
- 按功能分类，职责明确
- 便于理解和维护

### 2. 配置集中
- 服务器配置统一在 `config/` 目录
- 客户端配置统一在 `client/config/` 目录

### 3. 部署友好
- 服务器代码独立目录
- 配置文件路径清晰

### 4. 开发便利
- 相关文件就近放置
- 减少路径混乱

## 🚀 使用指南

### 启动服务器
```bash
npm run dev
# 或
node server/server.js
```

### 配置服务器
```bash
# 选择配置模式
cp config/config.single-key.template.json config/config.json
# 编辑配置
vim config/config.json
```

### 配置客户端
```bash
cd client
# 创建站点配置
node tools/access-control-manager.js create mysite
# 启动客户端
node examples/site1.js
```

## 📝 注意事项

1. **路径更新**：所有引用路径已更新，无需手动修改
2. **配置文件**：需要重新创建 `config/config.json`
3. **部署配置**：Vercel 等部署平台可能需要更新构建配置
4. **文档同步**：所有文档已更新为新的目录结构

这种组织方式使项目更加专业和易于维护！
