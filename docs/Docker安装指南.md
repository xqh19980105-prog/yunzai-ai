# Docker Desktop 安装和配置指南

## 📥 下载 Docker Desktop

### 方式一：官方网站下载（推荐）

**Windows 版本**：
- 访问：https://www.docker.com/products/docker-desktop/
- 点击 "Download for Windows"
- 文件大小约 500MB

### 方式二：国内镜像下载（如果官方网站慢）

**清华大学镜像站**：
- 访问：https://mirrors.tuna.tsinghua.edu.cn/docker-ce/windows/static/stable/x86_64/
- 或访问：https://mirrors.ustc.edu.cn/docker-ce/windows/static/stable/x86_64/

### 方式三：使用下载工具

我已经为你创建了下载脚本，可以自动下载。

## 🔧 安装步骤

### 1. 检查系统要求

- **Windows 10 64位** 或更高版本
- **Windows 11**（推荐）
- **启用 WSL 2**（Windows Subsystem for Linux 2）

### 2. 安装 WSL 2（如果未安装）

**自动安装 WSL 2**（推荐）：
```powershell
# 以管理员身份运行 PowerShell，执行：
wsl --install
```

**手动安装步骤**：
1. 打开 PowerShell（管理员）
2. 执行：`dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart`
3. 执行：`dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart`
4. 重启电脑
5. 下载并安装 WSL 2 内核更新：https://aka.ms/wsl2kernel
6. 执行：`wsl --set-default-version 2`

### 3. 安装 Docker Desktop

1. 运行下载的 `Docker Desktop Installer.exe`
2. 勾选 "Use WSL 2 instead of Hyper-V"（推荐）
3. 点击 "Ok" 开始安装
4. 安装完成后，点击 "Close and restart"

### 4. 启动 Docker Desktop

1. 从开始菜单启动 "Docker Desktop"
2. 等待 Docker 引擎启动（右下角会有 Docker 图标）
3. 首次启动可能需要几分钟来初始化

### 5. 验证安装

打开 PowerShell，执行：
```powershell
docker --version
docker compose version
```

如果显示版本号，说明安装成功！

## ⚙️ 配置 Docker（可选，推荐）

### 配置国内镜像加速器（提高下载速度）

1. 打开 Docker Desktop
2. 点击右上角齿轮图标（设置）
3. 选择 "Docker Engine"
4. 在 JSON 配置中添加：
```json
{
  "registry-mirrors": [
    "https://docker.mirrors.ustc.edu.cn",
    "https://registry.docker-cn.com",
    "https://hub-mirror.c.163.com"
  ]
}
```
5. 点击 "Apply & Restart"

### 配置资源使用

在设置中的 "Resources" 中，建议配置：
- **CPU**: 至少 2 核（建议 4 核）
- **Memory**: 至少 2GB（建议 4GB）
- **Disk**: 至少 20GB 可用空间

## ✅ 安装后检查

运行我创建的检查脚本：
```batch
检查-Docker安装.bat
```

## 🐛 常见问题

### 问题 1: "WSL 2 installation is incomplete"

**解决方案**：
1. 安装 WSL 2 内核更新：https://aka.ms/wsl2kernel
2. 重启电脑
3. 重新启动 Docker Desktop

### 问题 2: "Docker Desktop requires Windows 10 Pro"

**解决方案**：
- Windows 10 家庭版需要使用 WSL 2
- 确保已安装 WSL 2（见上述步骤）

### 问题 3: "Hardware assisted virtualization and data execution protection must be enabled in the BIOS"

**解决方案**：
1. 重启电脑，进入 BIOS
2. 启用 "Virtualization" 或 "Intel VT-x" / "AMD-V"
3. 启用 "Data Execution Prevention" (DEP)
4. 保存并退出 BIOS

### 问题 4: 下载镜像很慢

**解决方案**：
- 配置国内镜像加速器（见上述配置步骤）
- 或使用项目的中国镜像配置：`docker-compose.prod-china.yml`

## 🚀 安装完成后

安装并配置完成后，就可以运行：
```batch
启动应用-配合phpStudy.bat
```

## 📞 需要帮助？

如果遇到问题，请提供：
1. Windows 版本和系统类型
2. 错误信息的截图
3. PowerShell 的输出内容
