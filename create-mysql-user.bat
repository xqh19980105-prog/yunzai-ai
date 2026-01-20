@echo off
chcp 65001 >nul
title 创建MySQL用户

echo ========================================
echo    创建MySQL用户 (用户名:123456)
echo ========================================
echo.
echo 请输入MySQL的root密码（如果没设置密码直接回车）:
echo.

mysql -uroot -p -e "CREATE USER IF NOT EXISTS '123456'@'localhost' IDENTIFIED BY '123456'; GRANT ALL PRIVILEGES ON *.* TO '123456'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES; CREATE DATABASE IF NOT EXISTS yunzai_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo 用户创建成功！
    echo 用户名: 123456
    echo 密码: 123456
    echo 数据库: yunzai_ai
    echo ========================================
) else (
    echo.
    echo [错误] 创建失败，请检查MySQL是否运行
)

echo.
pause
