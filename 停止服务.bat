@echo off
chcp 65001 >nul
echo 正在停止芸仔AI服务...
taskkill /F /IM node.exe 2>nul
echo 服务已停止！
pause
