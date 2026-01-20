@echo off
title Yunzai AI - Stop Services
echo Stopping Yunzai AI services...
taskkill /F /IM node.exe 2>nul
echo Services stopped!
pause
