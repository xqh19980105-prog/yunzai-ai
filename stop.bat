@echo off
chcp 65001 >nul
title 芸仔AI - 停止服务

echo ========================================
echo        芸仔AI 停止服务
echo ========================================
echo.

echo 正在停止Node.js进程...
taskkill /F /IM node.exe 2>nul

echo.
echo 服务已停止！
echo.
pause
