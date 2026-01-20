# 🚀 生产环境部署指南

## ⚠️ 重要说明

本应用已经针对**生产环境**和**开发环境**做了区分处理：

### 开发环境（NODE_ENV !== 'production'）
- ✅ 容错性更强，允许部分服务不可用
- ✅ 数据库连接失败时允许应用启动（自动重连）
- ✅ Redis连接失败时允许应用启动（自动重连）
- ✅ 未捕获异常时记录错误但继续运行（方便调试）

### 生产环境（NODE_ENV === 'production'）
- ✅ **严格错误处理**：关键服务不可用时应用启动失败
- ✅ **数据库必需**：数据库连接失败时应用无法启动（fail-fast）
- ✅ **优雅关闭**：未捕获异常时记录错误并优雅关闭
- ✅ **进程管理**：依赖进程管理器（如PM2）进行自动重启

---

## 📋 生产环境部署步骤

### 1. 设置环境变量

确保设置 `NODE_ENV=production`：

```bash
export NODE_ENV=production
# 或
set NODE_ENV=production  # Windows
```

### 2. 使用进程管理器（推荐PM2）

**为什么需要进程管理器？**
- 自动重启崩溃的应用
- 监控应用健康状态
- 日志管理
- 零停机重启

**使用PM2部署：**

```bash
# 安装PM2
npm install -g pm2

# 使用ecosystem.config.js启动
pm2 start ecosystem.config.js

# 或单独启动后端
pm2 start npm --name "yunzai-backend" -- run start:prod --cwd ./backend

# 查看状态
pm2 status

# 查看日志
pm2 logs yunzai-backend

# 保存PM2配置（开机自启）
pm2 save
pm2 startup
```

### 3. 确保所有服务可用

**生产环境要求：**
- ✅ PostgreSQL 数据库必须运行且可连接
- ✅ Redis 服务必须运行且可连接（用于会话管理）
- ✅ 所有环境变量必须正确配置

**检查清单：**
```bash
# 检查数据库连接
psql $DATABASE_URL -c "SELECT 1"

# 检查Redis连接
redis-cli -u $REDIS_URL ping

# 检查环境变量
echo $NODE_ENV
echo $DATABASE_URL
echo $REDIS_URL
echo $JWT_SECRET
```

### 4. 健康检查

应用提供健康检查端点：

```bash
# 检查应用状态
curl http://localhost:3000/health

# 预期响应
{
  "status": "ok",
  "timestamp": "2026-01-20T...",
  "service": "yunzai-ai-backend"
}
```

**PM2健康检查配置：**
```javascript
// ecosystem.config.js 中已配置
min_uptime: '30s',  // 最小运行时间
max_restarts: 10,    // 最大重启次数
restart_delay: 5000 // 重启延迟
```

### 5. 监控和日志

**PM2监控：**
```bash
# 实时监控
pm2 monit

# 查看详细信息
pm2 describe yunzai-backend

# 查看错误日志
pm2 logs yunzai-backend --err
```

**日志位置：**
- PM2日志：`./logs/backend-error.log` 和 `./logs/backend-out.log`
- 应用日志：控制台输出（由PM2捕获）

---

## 🔒 生产环境安全配置

### 1. 环境变量安全

**必需的环境变量：**
```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:5432/dbname
REDIS_URL=redis://host:6379
JWT_SECRET=your-strong-secret-key-here
PORT=3000
FRONTEND_URL=https://your-domain.com
```

**安全建议：**
- ✅ 使用强密码和密钥
- ✅ 不要在代码中硬编码敏感信息
- ✅ 使用环境变量或密钥管理服务
- ✅ 定期轮换密钥

### 2. 数据库安全

- ✅ 使用SSL连接（如果支持）
- ✅ 限制数据库访问IP
- ✅ 使用强密码
- ✅ 定期备份

### 3. 网络安全

- ✅ 使用HTTPS（通过反向代理如Nginx）
- ✅ 配置防火墙规则
- ✅ 限制API访问频率
- ✅ 使用CORS正确配置

---

## 🐳 Docker部署（推荐）

### 使用Docker Compose

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://postgres:password@postgres:5432/yunzai_ai
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - postgres
      - redis
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

## ⚠️ 故障排查

### 应用无法启动

1. **检查环境变量**
   ```bash
   echo $NODE_ENV  # 应该是 production
   ```

2. **检查数据库连接**
   ```bash
   # 测试数据库连接
   psql $DATABASE_URL -c "SELECT 1"
   ```

3. **查看启动日志**
   ```bash
   pm2 logs yunzai-backend --lines 100
   ```

### 应用频繁重启

1. **检查PM2日志**
   ```bash
   pm2 logs yunzai-backend --err
   ```

2. **检查资源使用**
   ```bash
   pm2 monit
   ```

3. **检查数据库和Redis连接**
   ```bash
   # 确保服务可用
   docker ps  # 如果使用Docker
   ```

### 性能问题

1. **监控资源使用**
   ```bash
   pm2 monit
   ```

2. **检查数据库查询性能**
   - 使用Prisma Studio查看慢查询
   - 检查数据库索引

3. **检查Redis连接**
   - 确保Redis正常运行
   - 检查Redis内存使用

---

## 📊 监控建议

### 1. 应用监控
- PM2内置监控
- 健康检查端点
- 日志聚合（如ELK Stack）

### 2. 基础设施监控
- 服务器资源（CPU、内存、磁盘）
- 数据库性能
- Redis性能
- 网络流量

### 3. 告警设置
- 应用崩溃告警
- 数据库连接失败告警
- 高错误率告警
- 资源使用告警

---

## ✅ 部署检查清单

- [ ] 设置 `NODE_ENV=production`
- [ ] 配置所有必需的环境变量
- [ ] 确保数据库可连接
- [ ] 确保Redis可连接
- [ ] 使用进程管理器（PM2）
- [ ] 配置健康检查
- [ ] 设置日志管理
- [ ] 配置监控和告警
- [ ] 测试应用启动和重启
- [ ] 验证所有API端点
- [ ] 配置HTTPS（通过反向代理）
- [ ] 设置自动备份

---

**重要提示：** 生产环境必须设置 `NODE_ENV=production`，否则应用会使用开发模式的容错策略，这可能导致未知状态的应用继续运行。
