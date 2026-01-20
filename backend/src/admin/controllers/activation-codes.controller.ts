import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

type ActivationCodeStatus = 'UNUSED' | 'USED' | 'FROZEN';

/**
 * 激活码管理控制器
 * 负责激活码的生成、查询、状态管理
 */
@Controller('api/admin/activation-codes')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminActivationCodesController {
  private readonly logger = new Logger(AdminActivationCodesController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/admin/activation-codes
   * 获取激活码列表（支持分页和筛选）
   */
  @Get()
  async getActivationCodes(
    @Query('status') status?: string,
    @Query('batchTag') batchTag?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '50', 10);
      const skip = (pageNum - 1) * limitNum;

      const where: { status?: ActivationCodeStatus; batchTag?: string } = {};
      if (status && ['UNUSED', 'USED', 'FROZEN'].includes(status)) {
        where.status = status as ActivationCodeStatus;
      }
      if (batchTag) {
        where.batchTag = batchTag;
      }

      const [codes, total] = await Promise.all([
        this.prisma.activationCode.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        this.prisma.activationCode.count({ where }),
      ]);

      // 获取已使用激活码的用户信息
      const usedCodes = (codes || []).filter((c) => c.usedBy);
      const userIds = [...new Set(usedCodes.map((c) => c.usedBy).filter(Boolean))];
      const users = userIds.length
        ? await this.prisma.user.findMany({
            where: { id: { in: userIds as string[] } },
            select: { id: true, email: true },
          })
        : [];

      const userMap = new Map(users.map((u) => [u.id, u.email]));

      return {
        codes: (codes || []).map((code) => ({
          ...code,
          usedByEmail: code.usedBy ? userMap.get(code.usedBy) : null,
        })),
        total: total || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((total || 0) / limitNum) || 1,
      };
    } catch (error) {
      this.logger.error(
        `获取激活码列表失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'GET_ACTIVATION_CODES_FAILED',
          message: '获取激活码列表失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/admin/activation-codes/generate
   * 批量生成激活码
   */
  @Post('generate')
  async generateActivationCodes(
    @Body()
    body: {
      count: number;
      days: number;
      batchTag?: string;
    },
  ) {
    const { count, days, batchTag } = body;

    // 参数校验
    if (count < 1 || count > 1000) {
      throw new HttpException(
        {
          code: 'INVALID_COUNT',
          message: '激活码数量必须在 1-1000 之间',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    if (days < 1) {
      throw new HttpException(
        {
          code: 'INVALID_DAYS',
          message: '天数必须大于 0',
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      // 生成激活码
      const codes: string[] = [];
      const activationCodes: Array<{
        code: string;
        days: number;
        batchTag: string | null;
        status: ActivationCodeStatus;
      }> = [];
      const existingCodes = new Set<string>();

      // 获取已存在的激活码避免重复
      const existing = await this.prisma.activationCode.findMany({
        select: { code: true },
      });
      existing.forEach((c) => existingCodes.add(c.code.toUpperCase()));

      let attempts = 0;
      const maxAttempts = count * 10;

      while (codes.length < count && attempts < maxAttempts) {
        attempts++;

        // 生成随机激活码（26字符，大写字母数字）
        const code = (
          Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15)
        ).toUpperCase();

        // 检查重复
        if (!codes.includes(code) && !existingCodes.has(code)) {
          codes.push(code);
          existingCodes.add(code);

          activationCodes.push({
            code,
            days,
            batchTag: batchTag || null,
            status: 'UNUSED',
          });
        }
      }

      if (codes.length < count) {
        throw new HttpException(
          {
            code: 'GENERATION_FAILED',
            message: `无法生成 ${count} 个唯一的激活码，已生成 ${codes.length} 个`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      // 批量插入激活码
      await this.prisma.$transaction(
        activationCodes.map((code) =>
          this.prisma.activationCode.create({
            data: code,
          }),
        ),
      );

      return { codes, count: codes.length };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(
        `生成激活码失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'GENERATE_ACTIVATION_CODES_FAILED',
          message: '生成激活码失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/admin/activation-codes/:code/status
   * 更新激活码状态（冻结/解冻）
   */
  @Put(':code/status')
  async updateActivationCodeStatus(
    @Param('code') code: string,
    @Body() body: { status: ActivationCodeStatus },
  ) {
    try {
      const updated = await this.prisma.activationCode.update({
        where: { code },
        data: { status: body.status },
      });
      return updated;
    } catch (error) {
      this.logger.error(
        `更新激活码状态失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'UPDATE_ACTIVATION_CODE_STATUS_FAILED',
          message: '更新激活码状态失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
