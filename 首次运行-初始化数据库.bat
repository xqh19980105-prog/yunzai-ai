@echo off
chcp 65001 >nul
title 芸仔AI - 初始化数据库

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║    芸仔AI - 首次运行数据库初始化      ║
echo  ╚═══════════════════════════════════════╝
echo.
echo  此脚本将创建MySQL用户和数据库
echo  用户名: 123456
echo  密码: 123456
echo  数据库: yunzai_ai
echo.
echo ========================================

echo.
echo 请输入MySQL的root密码（如果没设置密码直接按回车）:
mysql -uroot -p -e "CREATE USER IF NOT EXISTS '123456'@'localhost' IDENTIFIED BY '123456'; GRANT ALL PRIVILEGES ON *.* TO '123456'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES; CREATE DATABASE IF NOT EXISTS yunzai_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  数据库初始化成功！
    echo  现在可以运行"一键启动.bat"了
    echo ========================================
) else (
    echo.
    echo [错误] 初始化失败，请检查：
    echo  1. MySQL是否已启动
    echo  2. root密码是否正确
)

echo.
pause
