@echo off
chcp 65001 >nul
title 芸仔AI - 本地测试

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║       芸仔AI - 本地测试启动           ║
echo  ╚═══════════════════════════════════════╝
echo.

:: 进入项目目录
cd /d "%~dp0"

echo [步骤1] 启动后端服务...
cd backend
start "后端-3000" cmd /c "pnpm install && npx prisma generate && npx prisma migrate deploy && pnpm run start:dev"

echo [步骤2] 等待后端启动（10秒）...
timeout /t 10 >nul

echo [步骤3] 启动前端服务...
cd ..\frontend
start "前端-3001" cmd /c "pnpm install && pnpm run dev"

echo.
echo ========================================
echo  启动完成！
echo ========================================
echo.
echo  前端地址: http://localhost:3001
echo  后端地址: http://localhost:3000
echo.
echo  管理员账号: admin@admin.com
echo  管理员密码: 123456
echo.
echo  10秒后自动打开浏览器...
echo ========================================

timeout /t 10 >nul
start http://localhost:3001

echo.
echo 提示: 关闭此窗口不会停止服务
echo 如需停止服务，请运行"停止服务.bat"
pause
