# phpStudy Pro 服务信息收集指南

## 📋 需要的信息

为了帮你配置 phpStudy Pro 与项目的对接，我需要以下信息：

### 1. 服务列表
请在 phpStudy Pro 中查看并提供：

- [ ] **PostgreSQL** - 是否有？端口是多少？用户名/密码是什么？
- [ ] **Redis** - 是否有？端口是多少？
- [ ] **MySQL** - 端口是多少？（虽然项目不用，但可能冲突）

### 2. phpStudy Pro 版本信息
- phpStudy Pro 的版本号
- 安装路径（如：`C:\phpStudy` 或 `D:\phpStudyPro`）

### 3. 运行检查脚本

我已经为你创建了一个检查脚本：`检查-phpStudy服务.bat`

**使用方法**：
1. 双击运行 `检查-phpStudy服务.bat`
2. 将运行结果复制给我

## 🔍 手动检查方法

如果不想运行脚本，可以手动检查：

### 检查端口占用

打开 PowerShell，运行：

```powershell
# 检查 PostgreSQL (通常端口 5432)
netstat -ano | findstr ":5432"

# 检查 Redis (通常端口 6379)
netstat -ano | findstr ":6379"

# 检查 MySQL (通常端口 3306)
netstat -ano | findstr ":3306"
```

### 检查 Node.js

```powershell
node --version
npm --version
```

如果提示"找不到命令"，说明 Node.js 未安装。

## 📝 信息收集模板

请填写以下信息：

```
phpStudy Pro 版本：_______
安装路径：_______

服务列表：
- PostgreSQL：[ ]有 [ ]无
  端口：_______
  用户名：_______
  密码：_______

- Redis：[ ]有 [ ]无
  端口：_______

- MySQL：[ ]有 [ ]无
  端口：_______

Node.js 状态：
- [ ]已安装，版本：_______
- [ ]未安装

其他说明：
_______
```

## 🚀 下一步

收到你的信息后，我会：
1. 判断是否可以使用 phpStudy Pro
2. 提供详细的配置步骤
3. 创建适配的启动脚本
4. 帮你测试连接

---

**快速检查**：运行 `检查-phpStudy服务.bat` 并把结果发给我！
