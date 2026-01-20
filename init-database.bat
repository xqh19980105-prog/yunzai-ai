@echo off
title Yunzai AI - Initialize Database

echo.
echo ========================================
echo    Yunzai AI - Database Setup
echo ========================================
echo.
echo This script will create:
echo   MySQL User: 123456
echo   MySQL Password: 123456
echo   Database: yunzai_ai
echo.
echo ========================================
echo.
echo Please enter MySQL root password (press Enter if no password):

mysql -uroot -p -e "CREATE USER IF NOT EXISTS '123456'@'localhost' IDENTIFIED BY '123456'; GRANT ALL PRIVILEGES ON *.* TO '123456'@'localhost' WITH GRANT OPTION; FLUSH PRIVILEGES; CREATE DATABASE IF NOT EXISTS yunzai_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo  Database setup successful!
    echo  Now you can run "start-yunzai.bat"
    echo ========================================
) else (
    echo.
    echo [Error] Setup failed. Please check:
    echo  1. Is MySQL running?
    echo  2. Is root password correct?
)

echo.
pause
