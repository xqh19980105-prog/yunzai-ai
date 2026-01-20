import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { UserId } from '../../common/decorators/user-id.decorator';

/**
 * 系统配置控制器
 * 负责全局系统配置的读取和更新
 */
@Controller('api/admin/system-config')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminSystemConfigController {
  private readonly logger = new Logger(AdminSystemConfigController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/admin/system-config
   * 获取所有系统配置
   */
  @Get()
  async getSystemConfig() {
    try {
      const configs = await this.prisma.systemConfig.findMany();

      // 转换为 key-value 对象
      const configObj: Record<string, unknown> = {};
      for (const config of configs || []) {
        try {
          configObj[config.key] = JSON.parse(config.value);
        } catch {
          configObj[config.key] = config.value;
        }
      }

      return configObj;
    } catch (error) {
      this.logger.error(
        `获取系统配置失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        { code: 'GET_SYSTEM_CONFIG_FAILED', message: '获取系统配置失败，请稍后重试' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/admin/system-config
   * 更新系统配置
   */
  @Put()
  async updateSystemConfig(
    @UserId() userId: string,
    @Body() body: Record<string, unknown>,
  ) {
    if (!body || typeof body !== 'object' || Object.keys(body).length === 0) {
      throw new HttpException(
        { code: 'EMPTY_CONFIG', message: '配置不能为空' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 更新每个配置项
    const updates = Object.entries(body)
      .filter(([key]) => key && typeof key === 'string' && key.trim().length > 0)
      .map(([key, value]) => {
        const stringValue =
          typeof value === 'string'
            ? value
            : value === null || value === undefined
              ? ''
              : JSON.stringify(value);

        return this.prisma.systemConfig.upsert({
          where: { key: key.trim() },
          update: {
            value: stringValue,
            updatedBy: userId,
          },
          create: {
            key: key.trim(),
            value: stringValue,
            updatedBy: userId,
          },
        });
      });

    if (updates.length === 0) {
      throw new HttpException(
        { code: 'NO_VALID_CONFIG', message: '没有有效的配置项' },
        HttpStatus.BAD_REQUEST,
      );
    }

    await Promise.all(updates);

    return { success: true };
  }
}

/**
 * 公开的系统配置控制器（无需登录）
 * 用于前端获取公开配置
 */
@Controller('api/public/system-config')
export class PublicSystemConfigController {
  private readonly logger = new Logger(PublicSystemConfigController.name);

  // 允许公开访问的配置项
  private readonly publicConfigKeys = [
    'siteName',
    'siteDescription',
    'siteLogo',
    'footerText',
    'activationCodeBuyLink',
    'contactLink',
    'welcomeMessage',
    'announcementText',
    'announcementLink',
    'recommendedQuestions',
    'enableRegistration',
    'maintenanceMode',
    'maintenanceMessage',
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/public/system-config
   * 获取公开的系统配置（无需登录）
   */
  @Get()
  async getPublicConfig() {
    try {
      const configs = await this.prisma.systemConfig.findMany({
        where: {
          key: { in: this.publicConfigKeys },
        },
      });

      // 转换为 key-value 对象
      const configObj: Record<string, unknown> = {};
      for (const config of configs || []) {
        try {
          configObj[config.key] = JSON.parse(config.value);
        } catch {
          configObj[config.key] = config.value;
        }
      }

      // 设置默认值
      if (configObj.enableRegistration === undefined) {
        configObj.enableRegistration = true;
      }
      if (configObj.maintenanceMode === undefined) {
        configObj.maintenanceMode = false;
      }
      if (configObj.welcomeMessage === undefined) {
        configObj.welcomeMessage = '有什么我能帮你的吗？';
      }

      return configObj;
    } catch (error) {
      this.logger.error(
        `获取公开配置失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        { code: 'GET_PUBLIC_CONFIG_FAILED', message: '获取配置失败，请稍后重试' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
