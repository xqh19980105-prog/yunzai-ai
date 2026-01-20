import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserService } from '../../common/services/user.service';

/**
 * Activation Service
 * 统一管理激活码相关的业务逻辑
 * 提取自 auth.controller.ts 和 activation.controller.ts 的重复代码
 */
@Injectable()
export class ActivationService {
  constructor(
    private prisma: PrismaService,
    private userService: UserService,
  ) {}

  /**
   * 验证并规范化激活码
   * @param code 原始激活码（已由DTO验证，这里只做规范化）
   * @returns 规范化后的激活码（大写，去除空格）
   */
  validateAndNormalizeCode(code: string): string {
    // ✅ 基本验证已由DTO完成（@IsString, @IsNotEmpty, @Matches）
    // 这里只需要规范化
    return code.trim().toUpperCase();
  }

  /**
   * 验证激活码是否存在且可用
   * @param code 规范化后的激活码
   * @returns 激活码记录
   */
  async validateActivationCode(code: string) {
    const activationCode = await this.prisma.activationCode.findUnique({
      where: { code },
    });

    if (!activationCode) {
      throw new BadRequestException('激活码不存在');
    }

    if (activationCode.status !== 'UNUSED') {
      if (activationCode.status === 'USED') {
        throw new BadRequestException('激活码已被使用');
      }
      if (activationCode.status === 'FROZEN') {
        throw new BadRequestException('激活码已被冻结');
      }
    }

    return activationCode;
  }

  /**
   * 计算新的会员到期时间
   * @param currentExpireAt 当前会员到期时间（可为null）
   * @param daysToAdd 要添加的天数
   * @returns 新的到期时间
   */
  calculateNewExpirationDate(
    currentExpireAt: Date | null,
    daysToAdd: number,
  ): Date {
    const now = new Date();
    const baseDate =
      currentExpireAt && currentExpireAt > now ? currentExpireAt : now;
    const newExpireAt = new Date(baseDate);
    newExpireAt.setDate(newExpireAt.getDate() + daysToAdd);
    return newExpireAt;
  }

  /**
   * 使用激活码（核心业务逻辑）
   * 使用事务确保数据一致性
   * @param userId 用户ID
   * @param code 激活码（原始格式，会自动规范化）
   * @returns 新的会员到期时间
   */
  async useActivationCode(userId: string, code: string): Promise<Date> {
    // 验证用户是否存在
    const user = await this.userService.findByIdOrThrow(userId);

    // ✅ 激活码基本验证已由DTO完成（@IsString, @IsNotEmpty, @Matches）
    // 这里只需要规范化（转大写，去空格）
    const normalizedCode = code.trim().toUpperCase();
    
    // 验证激活码是否可用
    const activationCode = await this.validateActivationCode(normalizedCode);

    // 计算新的到期时间
    const newExpireAt = this.calculateNewExpirationDate(
      user.membershipExpireAt,
      activationCode.days,
    );

    // 使用事务更新激活码和用户（确保数据一致性）
    await this.prisma.$transaction([
      this.prisma.activationCode.update({
        where: { code: normalizedCode },
        data: {
          status: 'USED',
          usedBy: userId,
          usedAt: new Date(),
        },
      }),
      this.prisma.user.update({
        where: { id: userId },
        data: { membershipExpireAt: newExpireAt },
      }),
    ]);

    return newExpireAt;
  }
}
