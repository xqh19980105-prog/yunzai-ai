import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

// 使用 PrismaService 的返回类型
type User = Awaited<ReturnType<PrismaClient['user']['findUnique']>> & {};

/**
 * User Service
 * 统一管理用户相关的查询和验证逻辑
 * 提取自多个Controller的重复代码
 */
@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据ID查找用户，不存在则抛出异常
   * @param userId 用户ID
   * @returns 用户记录
   */
  async findByIdOrThrow(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    return user;
  }

  /**
   * 根据ID查找活跃用户，不存在或未激活则抛出异常
   * @param userId 用户ID
   * @returns 活跃用户记录
   */
  async findActiveByIdOrThrow(userId: string): Promise<User> {
    const user = await this.findByIdOrThrow(userId);
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('账户已被锁定或禁用');
    }
    return user;
  }

  /**
   * 根据ID查找用户（指定字段），不存在则抛出异常
   * @param userId 用户ID
   * @param select 要选择的字段
   * @returns 用户记录（仅包含指定字段）
   */
  async findByIdSelect<T extends Record<string, boolean>>(
    userId: string,
    select: T,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select,
    });
    if (!user) {
      throw new BadRequestException('用户不存在');
    }
    return user;
  }

  /**
   * 根据邮箱查找用户
   * @param email 邮箱
   * @returns 用户记录或null
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * 验证用户ID是否存在
   * @deprecated 此方法已不再需要，使用@UserId()装饰器即可
   * @param userId 用户ID
   * @returns 如果用户存在返回true，否则抛出异常
   */
  async validateUserId(userId: string | undefined): Promise<string> {
    // ✅ 此方法已废弃，应该使用@UserId()装饰器
    // 保留仅用于向后兼容
    if (!userId || typeof userId !== 'string' || userId.trim().length === 0) {
      throw new BadRequestException('用户ID缺失');
    }
    return userId.trim();
  }
}
