import {
  Controller,
  Get,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 统计数据控制器
 * 负责管理后台仪表盘统计数据
 */
@Controller('api/admin/stats')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminStatsController {
  private readonly logger = new Logger(AdminStatsController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/admin/stats
   * 获取仪表盘统计数据
   */
  @Get()
  async getStats() {
    try {
      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(now);
      todayEnd.setHours(23, 59, 59, 999);

      // 今日注册用户数
      const dailyRegisters = await this.prisma.user.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      // 有效会员数
      const activeMembers = await this.prisma.user.count({
        where: {
          membershipExpireAt: {
            gt: new Date(),
          },
          status: 'ACTIVE',
        },
      });

      // 今日API调用次数（以用户消息数为代理）
      const apiUsage = await this.prisma.chatHistory.count({
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
          role: 'user',
        },
      });

      // 总用户数
      const totalUsers = await this.prisma.user.count();

      // 今日活跃用户数（今日有聊天记录的用户）
      const dailyActiveUsers = await this.prisma.chatHistory.groupBy({
        by: ['userId'],
        where: {
          createdAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      // 未使用激活码数量
      const unusedCodes = await this.prisma.activationCode.count({
        where: {
          status: 'UNUSED',
        },
      });

      return {
        dailyRegisters: dailyRegisters || 0,
        activeMembers: activeMembers || 0,
        apiUsage: apiUsage || 0,
        totalUsers: totalUsers || 0,
        dailyActiveUsers: dailyActiveUsers?.length || 0,
        unusedCodes: unusedCodes || 0,
      };
    } catch (error) {
      this.logger.error(
        `获取统计数据失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        { code: 'GET_STATS_FAILED', message: '获取统计数据失败，请稍后重试' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
