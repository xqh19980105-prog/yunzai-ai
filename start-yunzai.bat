@echo off
title Yunzai AI - Local Test

echo.
echo ========================================
echo        Yunzai AI - Local Start
echo ========================================
echo.

cd /d "%~dp0"

echo [Step 1] Starting backend service...
cd backend
start "Backend-3000" cmd /c "pnpm install && npx prisma generate && npx prisma migrate deploy && pnpm run start:dev"

echo [Step 2] Waiting for backend (10 seconds)...
timeout /t 10 >nul

echo [Step 3] Starting frontend service...
cd ..\frontend
start "Frontend-3001" cmd /c "pnpm install && pnpm run dev"

echo.
echo ========================================
echo  Start Complete!
echo ========================================
echo.
echo  Frontend: http://localhost:3001
echo  Backend:  http://localhost:3000
echo.
echo  Admin Email: admin@admin.com
echo  Admin Password: 123456
echo.
echo  Opening browser in 10 seconds...
echo ========================================

timeout /t 10 >nul
start http://localhost:3001

echo.
echo To stop services, run "stop-yunzai.bat"
pause
