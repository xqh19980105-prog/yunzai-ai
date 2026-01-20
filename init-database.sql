-- 芸仔AI 数据库初始化脚本
-- MySQL用户名: 123456, 密码: 123456

-- 创建数据库
CREATE DATABASE IF NOT EXISTS yunzai_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE yunzai_ai;

-- 如果需要创建用户（可选，如果您的MySQL没有123456用户）
-- CREATE USER IF NOT EXISTS '123456'@'localhost' IDENTIFIED BY '123456';
-- GRANT ALL PRIVILEGES ON yunzai_ai.* TO '123456'@'localhost';
-- FLUSH PRIVILEGES;

-- 注意：表结构会由Prisma自动创建，无需手动创建
