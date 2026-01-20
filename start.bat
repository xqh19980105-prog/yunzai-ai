@echo off
chcp 65001 >nul
title 芸仔AI - 一键启动

echo ========================================
echo        芸仔AI 一键启动脚本
echo ========================================
echo.

:: 检查MySQL是否运行
echo [1/6] 检查MySQL服务...
sc query MySQL >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] MySQL服务未检测到，请确保MySQL已安装并运行
    echo 如果您使用的是XAMPP/WAMP，请先启动MySQL服务
    pause
)

:: 检查Redis是否运行
echo [2/6] 检查Redis服务...
redis-cli ping >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] Redis未运行，尝试启动Redis...
    start /B redis-server
    timeout /t 2 >nul
)

:: 创建数据库（如果不存在）
echo [3/6] 初始化数据库...
mysql -u123456 -p123456 -e "CREATE DATABASE IF NOT EXISTS yunzai_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>nul
if %errorlevel% neq 0 (
    echo [警告] 无法连接MySQL，请检查：
    echo   - MySQL是否已启动
    echo   - 用户名是否为: 123456
    echo   - 密码是否为: 123456
    echo.
    echo 如需修改数据库配置，请编辑 backend\.env 文件
    pause
)

:: 安装后端依赖
echo [4/6] 安装后端依赖...
cd backend
call pnpm install
if %errorlevel% neq 0 (
    echo [错误] 后端依赖安装失败
    pause
    exit /b 1
)

:: 运行数据库迁移
echo [5/6] 运行数据库迁移...
call npx prisma migrate deploy
call npx prisma generate
if %errorlevel% neq 0 (
    echo [警告] 数据库迁移可能有问题，继续尝试...
)

:: 启动后端服务
echo [6/6] 启动服务...
echo.
echo ========================================
echo 正在启动后端服务 (端口3000)...
start "芸仔AI-后端" cmd /k "cd /d %~dp0backend && pnpm run start:dev"

:: 等待后端启动
timeout /t 5 >nul

:: 安装并启动前端
echo 正在启动前端服务 (端口3001)...
cd ..\frontend
call pnpm install
start "芸仔AI-前端" cmd /k "cd /d %~dp0frontend && pnpm run dev"

echo ========================================
echo.
echo 启动完成！请等待几秒钟...
echo.
echo 前端地址: http://localhost:3001
echo 后端地址: http://localhost:3000
echo.
echo 管理员账号: admin@admin.com
echo 管理员密码: 123456
echo.
echo 按任意键打开浏览器访问前端...
pause >nul

start http://localhost:3001
