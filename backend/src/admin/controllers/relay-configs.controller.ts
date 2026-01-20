import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 中转站配置控制器
 * 负责API中转站的增删改查
 */
@Controller('api/admin/relay-configs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminRelayConfigsController {
  private readonly logger = new Logger(AdminRelayConfigsController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/admin/relay-configs
   * 获取所有中转站配置
   */
  @Get()
  async getRelayConfigs() {
    try {
      const configs = await this.prisma.relayConfig.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return configs || [];
    } catch (error) {
      this.logger.error(
        `获取中转站配置失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        { code: 'GET_RELAY_CONFIGS_FAILED', message: '获取中转站配置失败，请稍后重试' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * GET /api/admin/relay-configs/active/models
   * 获取当前激活中转站支持的模型列表
   */
  @Get('active/models')
  async getActiveRelayModels() {
    try {
      const activeRelay = await this.prisma.relayConfig.findFirst({
        where: { isActive: true },
      });

      if (!activeRelay) {
        return { models: [], message: '没有激活的中转站' };
      }

      const models = (activeRelay.availableModels || []) as string[];
      return {
        models: models || [],
        relayName: activeRelay.name || '',
        relayId: activeRelay.id || '',
      };
    } catch (error) {
      this.logger.error(
        `获取激活中转站模型列表失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        { code: 'GET_ACTIVE_RELAY_MODELS_FAILED', message: '获取激活中转站模型列表失败，请稍后重试' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/admin/relay-configs
   * 创建新的中转站配置
   */
  @Post()
  async createRelayConfig(
    @Body()
    body: {
      name: string;
      baseUrl: string;
      apiKeyLink?: string;
      buyLink?: string;
      isActive?: boolean;
      availableModels?: string[];
    },
  ) {
    const willBeActive = body.isActive !== undefined ? body.isActive : true;
    const models = body.availableModels || [];

    // 激活的中转站必须配置至少一个模型
    if (willBeActive && models.length === 0) {
      throw new HttpException(
        { code: 'NO_MODELS_CONFIGURED', message: '激活的中转站必须配置至少一个支持的模型' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // 如果激活此中转站，停用其他中转站
    if (willBeActive) {
      await this.prisma.relayConfig.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const config = await this.prisma.relayConfig.create({
      data: {
        name: body.name,
        baseUrl: body.baseUrl,
        apiKeyLink: body.apiKeyLink || null,
        buyLink: body.buyLink || null,
        isActive: willBeActive,
        availableModels: body.availableModels || [],
      },
    });

    // 检查不兼容的模型
    if (willBeActive) {
      const incompatibleWarning = await this.checkIncompatibleModels(models);
      if (incompatibleWarning) {
        return { ...config, ...incompatibleWarning };
      }
    }

    return config;
  }

  /**
   * PUT /api/admin/relay-configs/:id
   * 更新中转站配置
   */
  @Put(':id')
  async updateRelayConfig(
    @Param('id') id: string,
    @Body()
    body: {
      name?: string;
      baseUrl?: string;
      apiKeyLink?: string;
      buyLink?: string;
      isActive?: boolean;
      availableModels?: string[];
    },
  ) {
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.baseUrl !== undefined) updateData.baseUrl = body.baseUrl;
    if (body.apiKeyLink !== undefined) updateData.apiKeyLink = body.apiKeyLink;
    if (body.buyLink !== undefined) updateData.buyLink = body.buyLink;
    if (body.availableModels !== undefined) updateData.availableModels = body.availableModels;

    // 获取当前配置
    const currentConfig = await this.prisma.relayConfig.findUnique({ where: { id } });
    if (!currentConfig) {
      throw new HttpException(
        { code: 'RELAY_CONFIG_NOT_FOUND', message: '中转站配置不存在' },
        HttpStatus.NOT_FOUND,
      );
    }

    const wasActive = currentConfig.isActive;
    const willBeActive = body.isActive !== undefined ? body.isActive : wasActive;

    // 如果激活此中转站，停用其他中转站
    if (body.isActive === true && !wasActive) {
      const models = (body.availableModels !== undefined
        ? body.availableModels
        : (currentConfig.availableModels || [])) as string[];

      if (models.length === 0) {
        throw new HttpException(
          { code: 'NO_MODELS_CONFIGURED', message: '激活的中转站必须配置至少一个支持的模型' },
          HttpStatus.BAD_REQUEST,
        );
      }

      await this.prisma.relayConfig.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    const config = await this.prisma.relayConfig.update({
      where: { id },
      data: updateData,
    });

    // 切换激活中转站时检查不兼容的模型
    if (body.isActive === true && !wasActive && willBeActive) {
      const newModels = (body.availableModels || config.availableModels || []) as string[];
      const incompatibleWarning = await this.checkIncompatibleModels(newModels);
      if (incompatibleWarning) {
        return { ...config, ...incompatibleWarning };
      }
    }

    return config;
  }

  /**
   * DELETE /api/admin/relay-configs/:id
   * 删除中转站配置
   */
  @Delete(':id')
  async deleteRelayConfig(@Param('id') id: string) {
    await this.prisma.relayConfig.delete({
      where: { id },
    });
    return { success: true };
  }

  /**
   * 检查AI领域中是否有不兼容的模型
   */
  private async checkIncompatibleModels(newModels: string[]) {
    if (newModels.length === 0) return null;

    const domains = await this.prisma.aIDomain.findMany({
      where: { targetModel: { not: null } },
      select: { id: true, title: true, targetModel: true },
    });

    const incompatibleDomains = domains.filter(
      (domain) => domain.targetModel && !newModels.includes(domain.targetModel),
    );

    if (incompatibleDomains.length > 0) {
      return {
        warning: `有 ${incompatibleDomains.length} 个AI工具的模型不在新中转站的支持列表中，请前往工作流编辑器更新模型配置。`,
        incompatibleDomains: incompatibleDomains.map((d) => ({
          id: d.id,
          title: d.title,
          currentModel: d.targetModel,
        })),
        availableModels: newModels,
      };
    }

    return null;
  }
}
