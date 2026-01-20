# phpStudy Pro 本地测试配置指南

## 📋 概述

经过检查，**phpStudy Pro 8.1.1.3 版本不支持 PostgreSQL 和 Redis**，因此无法直接使用 phpStudy Pro 提供数据库服务。

### ❌ phpStudy Pro 8.1.1.3 的限制
- **不提供 PostgreSQL**（项目需要）
- **不提供 Redis**（项目需要）
- **不提供 Node.js**（前后端都需要）

### ✅ 推荐方案
**混合使用 Docker + phpStudy Pro**：
- 使用 **Docker** 运行 PostgreSQL 和 Redis（必须）
- **phpStudy Pro** 保持 MySQL/Apache/Nginx 停止（避免端口冲突）
- 单独安装 **Node.js** 用于运行前后端（必须）

## 🚀 快速开始（推荐方案）

## 🔍 前提条件检查

### 1. 检查 phpStudy Pro 是否支持 PostgreSQL

打开 phpStudy Pro，查看是否提供 PostgreSQL 服务。**注意**：大多数版本的 phpStudy Pro 只提供 MySQL，不提供 PostgreSQL。

**如果 phpStudy Pro 不支持 PostgreSQL**：
- 必须使用 Docker 运行 PostgreSQL（推荐）
- 或者手动安装 PostgreSQL

### 2. 检查 phpStudy Pro 是否支持 Redis

查看 phpStudy Pro 的服务列表，确认是否有 Redis。

**如果 phpStudy Pro 支持 Redis**：
- 可以在 phpStudy Pro 中启动 Redis
- 默认端口通常是 `6379`

**如果 phpStudy Pro 不支持 Redis**：
- 必须使用 Docker 运行 Redis（推荐）
- 或者手动安装 Redis

### 方案：使用 Docker + Node.js（最佳实践）

这是最适合 phpStudy Pro 用户的方案：

1. **确保 Docker Desktop 已安装并运行**
   - 如果未安装，请访问：https://www.docker.com/products/docker-desktop

2. **确保 Node.js 已安装**
   - 访问 https://nodejs.org/
   - 下载并安装 LTS 版本（推荐 18.x 或 20.x）

3. **在 phpStudy Pro 中停止所有服务**
   - 停止 MySQL（避免端口 3306 冲突，虽然项目不用）
   - 停止 Apache/Nginx（避免端口冲突）
   - 保持所有服务为停止状态

4. **运行启动脚本**
   ```batch
   # 双击运行
   启动应用-配合phpStudy.bat
   ```
   
   这个脚本会自动：
   - ✅ 启动 Docker 容器（PostgreSQL + Redis）
   - ✅ 创建环境变量文件
   - ✅ 检查并安装依赖
   - ✅ 生成 Prisma 客户端
   - ✅ 运行数据库迁移
   - ✅ 启动后端和前端服务
   - ✅ 自动打开浏览器

## 📋 详细配置步骤（手动）

如果你想手动配置，可以按以下步骤操作：

### 步骤 1：启动 Docker 服务

```powershell
# 启动 PostgreSQL 和 Redis
docker compose up -d

# 检查服务状态
docker ps
```

应该看到 `yunzai-postgres` 和 `yunzai-redis` 两个容器运行中。

### 步骤 2：配置环境变量

**backend/.env**：
```env
DATABASE_URL="postgresql://postgres:postgres123@localhost:5432/yunzai_ai?schema=public"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-key-change-in-production-12345"
PORT=3000
NODE_ENV=development
FRONTEND_URL="http://localhost:3001"
```

**frontend/.env.local**：
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 步骤 3：安装依赖

```powershell
# 后端
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
cd ..

# 前端
cd frontend
npm install
cd ..
```

### 步骤 4：启动服务

**启动后端**（新窗口）：
```powershell
cd backend
npm run start:dev
```

**启动前端**（新窗口）：
```powershell
cd frontend
npm run dev
```

### 步骤 5：访问应用

- 前端：http://localhost:3001
- 后端：http://localhost:3000

## 🔧 其他方案（不推荐）

### 方案 A：手动安装 PostgreSQL 和 Redis（复杂）

如果你不想使用 Docker，可以手动安装 PostgreSQL 和 Redis：

1. **下载并安装 PostgreSQL**
   - 访问：https://www.postgresql.org/download/windows/
   - 下载并安装 PostgreSQL 15
   - 记住安装时设置的密码

2. **下载并安装 Redis**
   - 访问：https://github.com/microsoftarchive/redis/releases
   - 下载 Redis for Windows
   - 或使用 WSL2 运行 Redis

3. **创建数据库**
   ```sql
   CREATE DATABASE yunzai_ai;
   ```

4. **配置环境变量**
   
   修改 `backend/.env`：
   ```env
   DATABASE_URL="postgresql://postgres:你的密码@localhost:5432/yunzai_ai?schema=public"
   REDIS_URL="redis://localhost:6379"
   ```

5. **后续步骤与 Docker 方案相同**

## ⚠️ 常见问题

### 1. phpStudy Pro 只有 MySQL，没有 PostgreSQL

**这是正常情况**！phpStudy Pro 8.1.1.3 不包含 PostgreSQL 和 Redis。

**解决方案**：
- ✅ **推荐**：使用 Docker 运行 PostgreSQL 和 Redis（最简单）
- ⚠️ **备选**：手动安装 PostgreSQL 和 Redis（复杂）

### 2. 端口冲突

如果 phpStudy Pro 的 MySQL（3306）或 Apache/Nginx 占用了端口，可能影响项目：

**检查端口占用**：
```powershell
# 检查常用端口
netstat -ano | findstr ":3000"  # 后端端口
netstat -ano | findstr ":3001"  # 前端端口
netstat -ano | findstr ":5432"  # PostgreSQL 端口
netstat -ano | findstr ":6379"  # Redis 端口
```

**解决方案**：
- 在 phpStudy Pro 中停止所有服务（MySQL、Apache、Nginx）
- 确保 Docker 容器正常启动（PostgreSQL 和 Redis）
- 如果 3000 或 3001 被占用，可以修改项目端口

### 3. Docker 服务启动失败

**检查步骤**：
1. 确认 Docker Desktop 已启动
2. 确认端口 5432 和 6379 未被占用
3. 检查 Docker 日志：
   ```powershell
   docker compose logs
   ```

**常见问题**：
- **端口被占用**：关闭 phpStudy Pro 中的相关服务
- **Docker 未启动**：启动 Docker Desktop
- **镜像下载失败**：检查网络连接，或使用国内镜像源

### 4. 数据库连接失败

**检查步骤**：
1. 确认 Docker 容器运行正常：
   ```powershell
   docker ps
   # 应该看到 yunzai-postgres 和 yunzai-redis
   ```

2. 测试 PostgreSQL 连接：
   ```powershell
   docker exec -it yunzai-postgres psql -U postgres -d yunzai_ai
   ```

3. 检查 `backend/.env` 中的 `DATABASE_URL` 配置是否正确

4. 确认数据库迁移已执行：
   ```powershell
   cd backend
   npm run prisma:migrate
   ```

### 4. Node.js 未安装

**下载安装**：
- 访问 https://nodejs.org/
- 下载 LTS 版本（推荐 18.x 或 20.x）
- 安装后重启命令行窗口

**验证安装**：
```powershell
node --version
npm --version
```

## 📝 总结

### phpStudy Pro 8.1.1.3 的限制

| 组件 | phpStudy Pro 支持 | 项目需要 | 解决方案 |
|------|------------------|---------|---------|
| PostgreSQL | ❌ 不支持 | ✅ 需要 | Docker 或手动安装 |
| Redis | ❌ 不支持 | ✅ 需要 | Docker 或手动安装 |
| MySQL | ✅ 支持 | ❌ 不需要 | 保持停止（避免冲突） |
| Node.js | ❌ 不支持 | ✅ 需要 | 手动安装 |
| Apache/Nginx | ✅ 支持 | ❌ 不需要 | 保持停止（避免冲突） |

### 推荐配置方案

**最佳实践（推荐）**：
- ✅ **PostgreSQL**：使用 Docker（`docker compose up -d`）
- ✅ **Redis**：使用 Docker（与 PostgreSQL 一起启动）
- ✅ **Node.js**：手动安装（https://nodejs.org/）
- ✅ **前后端**：使用 npm 本地运行
- ✅ **phpStudy Pro**：保持所有服务停止状态

**一键启动**：
```batch
# 双击运行
启动应用-配合phpStudy.bat
```

这个脚本会自动处理所有配置和启动步骤。

## 🔗 相关文档

- [配置指南](./配置指南.md)
- [测试指南](./测试指南.md)
- [常见问题](./常见问题.md)
