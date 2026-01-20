import { Controller, Get, Put, Post, Body, UseGuards, Query } from '@nestjs/common';
import { LegalService } from './legal.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { PrismaService } from '../prisma/prisma.service';
import { UserId } from '../common/decorators/user-id.decorator';
import { SignLegalDto, signLegalSchema } from './dto/sign-legal.dto';
import { UpdateLegalTextDto, updateLegalTextSchema } from './dto/update-legal-text.dto';
import { createZodPipe } from '../common/pipes/zod-validation.pipe';

@Controller('api/legal')
export class LegalController {
  constructor(private legalService: LegalService) {}

  @Post('sign')
  @UseGuards(JwtAuthGuard)
  async signLegalAffidavit(
    @UserId() userId: string,
    @Body(createZodPipe(signLegalSchema)) dto: SignLegalDto,
  ) {
    // ✅ 验证已由ValidationPipe自动完成
    return this.legalService.signLegalAffidavit(
      userId,
      dto.signatureText.trim(),
      dto.ip.trim(),
      dto.userAgent?.trim(),
    );
  }
}

@Controller('api/admin/legal')
@UseGuards(JwtAuthGuard, AdminGuard)
export class LegalAdminController {
  constructor(
    private legalService: LegalService,
    private prisma: PrismaService,
  ) {}

  @Get('text')
  async getLegalText() {
    const text = await this.legalService.getLegalText();
    return { text };
  }

  @Put('text')
  async updateLegalText(@Body(createZodPipe(updateLegalTextSchema)) dto: UpdateLegalTextDto) {
    // ✅ 验证已由ValidationPipe自动完成
    await this.legalService.updateLegalText(dto.text.trim());
    return { success: true };
  }

  /**
   * GET /api/admin/legal/logs
   * Get legal logs list
   * Moved from AdminController to consolidate legal-related admin functions
   */
  @Get('logs')
  async getLegalLogs(
    @Query('email') email?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const pageNum = parseInt(page || '1', 10);
      const limitNum = parseInt(limit || '50', 10);
      const skip = (pageNum - 1) * limitNum;

      const where: {
        user?: {
          email: {
            contains: string;
            mode: 'insensitive';
          };
        };
      } = {};
      if (email && typeof email === 'string' && email.trim().length > 0) {
        where.user = {
          email: {
            contains: email.trim(),
            mode: 'insensitive',
          },
        };
      }

      const [logs, total] = await Promise.all([
        this.prisma.legalLog.findMany({
          where,
          include: {
            user: {
              select: {
                id: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limitNum,
        }),
        this.prisma.legalLog.count({ where }),
      ]);

      return {
        logs: logs || [],
        total: total || 0,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil((total || 0) / limitNum) || 1,
      };
    } catch (error) {
      console.error(`Failed to get legal logs: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error('获取法律日志失败，请稍后重试');
    }
  }
}
