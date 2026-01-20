/**
 * 创建管理员账号脚本
 * 使用方式: npx ts-node -r tsconfig-paths/register scripts/create-admin-user.ts
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../.env') });

const prisma = new PrismaClient();

async function createAdminUser() {
  // 使用 123456@admin.com 作为邮箱（包含 "admin" 才能成为管理员）
  // 用户名就是 123456，密码是 123456
  const email = '123456@admin.com'; // 邮箱包含 "admin" 才能成为管理员，用户名部分是 123456
  const password = '123456';

  try {
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    let user;
    if (existingUser) {
      // 如果用户已存在，更新密码
      console.log(`⚠️  用户 ${email} 已存在，正在更新密码...`);
      user = await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          status: 'ACTIVE', // 确保状态是 ACTIVE
        },
      });
      console.log('✅ 管理员账号密码已更新！');
    } else {
      // 创建新用户
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          status: 'ACTIVE',
        },
      });
      console.log('✅ 管理员账号创建成功！');
    }

    console.log(`   邮箱: ${email}`);
    console.log(`   密码: ${password}`);
    console.log(`   用户ID: ${user.id}`);
    console.log(`   状态: ${user.status}`);
    console.log(`\n🎯 现在可以登录了：`);
    console.log(`   登录账号: ${email} 或 123456`);
    console.log(`   登录密码: ${password}`);
    console.log(`   登录页面: http://localhost:3001/login`);
    console.log(`   管理后台: http://localhost:3001/admin`);
    console.log(`   管理员登录: http://localhost:3001/admin/login`);
  } catch (error) {
    console.error('❌ 创建/更新账号失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
