# Hosts 文件配置指南

为了测试代理功能，您需要配置本地 hosts 文件，将子域名指向本地服务器。

## Windows 系统

1. **打开 hosts 文件**
   - 以管理员身份运行记事本
   - 打开文件：`C:\Windows\System32\drivers\etc\hosts`

2. **添加以下行**
   ```
   127.0.0.1    site1.localhost
   127.0.0.1    site2.localhost
   127.0.0.1    api.localhost
   ```

3. **保存文件**

## macOS/Linux 系统

1. **编辑 hosts 文件**
   ```bash
   sudo nano /etc/hosts
   ```

2. **添加以下行**
   ```
   127.0.0.1    site1.localhost
   127.0.0.1    site2.localhost
   127.0.0.1    api.localhost
   ```

3. **保存文件**
   - 在 nano 中：按 `Ctrl+X`，然后 `Y`，然后 `Enter`

## 验证配置

配置完成后，您可以通过以下方式验证：

1. **ping 测试**
   ```bash
   ping site1.localhost
   ```
   应该返回 `127.0.0.1`

2. **浏览器测试**
   - 访问：http://site1.localhost:3000
   - 应该能看到代理的内容

## 测试代理功能

1. **启动代理服务器**
   ```bash
   npm run dev
   ```

2. **启动客户端**
   ```bash
   cd client
   node examples/site1.js
   ```

3. **访问代理地址**
   - 管理控制台：http://localhost:3000
   - 代理站点：http://site1.localhost:3000

## 故障排除

### 问题：无法解析域名
- **解决方案**：检查 hosts 文件是否正确配置
- **验证**：使用 `ping site1.localhost` 测试

### 问题：连接被拒绝
- **解决方案**：确保代理服务器正在运行
- **验证**：检查 http://localhost:3000 是否可访问

### 问题：404 错误
- **解决方案**：确保客户端已连接并注册
- **验证**：在管理控制台查看连接状态

## 清理

如果不再需要代理功能，可以从 hosts 文件中删除添加的行。
