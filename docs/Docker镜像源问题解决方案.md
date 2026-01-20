# Docker 镜像源问题解决方案

## 问题：403 Forbidden 错误

当你看到以下错误时：
```
403 Forbidden from https://docker.nju.edu.cn/v2/library/postgres/manifests/15-alpine
```

说明该镜像源不可用或需要认证。

## 解决方案

### 方案 1：更换为其他镜像源（推荐）

更新 Docker Desktop 的镜像加速器配置：

1. 打开 Docker Desktop
2. 点击设置图标（齿轮）
3. 选择 "Docker Engine"
4. 替换 JSON 配置为：

```json
{
  "registry-mirrors": [
    "https://dockerproxy.com",
    "https://hub-mirror.c.163.com",
    "https://mirror.baidubce.com",
    "https://ccr.ccs.tencentyun.com"
  ]
}
```

5. 点击 "Apply & Restart"
6. 等待 Docker Desktop 重启

### 方案 2：使用官方 Docker Hub（如果网络允许）

1. 打开 Docker Desktop 设置
2. 点击 "Docker Engine"
3. 删除或清空 `registry-mirrors` 配置项
4. 或者只保留：`{}`
5. 点击 "Apply & Restart"

### 方案 3：使用代理/VPN

如果你有可用的代理或 VPN：

1. 配置 Docker Desktop 的代理设置
2. 或者连接 VPN 后再尝试下载

### 方案 4：手动下载镜像（备用）

如果所有方法都失败，可以：

1. 在其他有网络的环境下载镜像
2. 导出镜像文件
3. 在当前环境导入镜像

## 推荐的镜像源列表

以下是一些可用的国内镜像源（按推荐顺序）：

1. **dockerproxy.com**（推荐，速度快）
   ```
   https://dockerproxy.com
   ```

2. **网易镜像**
   ```
   https://hub-mirror.c.163.com
   ```

3. **百度云镜像**
   ```
   https://mirror.baidubce.com
   ```

4. **腾讯云镜像**
   ```
   https://ccr.ccs.tencentyun.com
   ```

## 验证配置是否生效

配置后，运行：

```powershell
docker info | Select-String -Pattern "Registry Mirrors"
```

应该能看到你配置的镜像源地址。

## 测试镜像下载

配置完成后，尝试下载一个小的测试镜像：

```powershell
docker pull hello-world
```

如果成功，说明配置生效。

## 如果仍然失败

如果所有镜像源都失败：

1. 检查网络连接
2. 尝试使用代理或 VPN
3. 或者联系网络管理员检查防火墙设置
