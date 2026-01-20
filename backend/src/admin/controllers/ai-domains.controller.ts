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
import { Prisma } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../../auth/guards/admin.guard';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * AI领域管理控制器
 * 负责AI工具/领域的增删改查
 */
@Controller('api/admin/ai-domains')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminAIDomainsController {
  private readonly logger = new Logger(AdminAIDomainsController.name);

  constructor(private prisma: PrismaService) {}

  /**
   * GET /api/admin/ai-domains
   * 获取所有AI领域列表
   */
  @Get()
  async getAIDomains() {
    try {
      const domains = await this.prisma.aIDomain.findMany({
        orderBy: { sortOrder: 'asc' },
      });
      return domains || [];
    } catch (error) {
      this.logger.error(
        `获取AI领域列表失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'GET_AI_DOMAINS_FAILED',
          message: '获取AI领域列表失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * POST /api/admin/ai-domains
   * 创建新的AI领域
   */
  @Post()
  async createAIDomain(
    @Body()
    body: {
      title: string;
      description?: string;
      icon?: string;
      greetingMessage?: string;
      workflowConfig?: Record<string, unknown>;
      targetModel?: string;
      isVisible?: boolean;
      isMaintenance?: boolean;
      sortOrder?: number;
    },
  ) {
    try {
      const domain = await this.prisma.aIDomain.create({
        data: {
          title: body.title,
          description: body.description || null,
          icon: body.icon || null,
          greetingMessage: body.greetingMessage || null,
          workflowConfig: body.workflowConfig ? (body.workflowConfig as Prisma.InputJsonValue) : Prisma.JsonNull,
          targetModel: body.targetModel || null,
          isVisible: body.isVisible !== undefined ? body.isVisible : true,
          isMaintenance: body.isMaintenance !== undefined ? body.isMaintenance : false,
          sortOrder: body.sortOrder || 0,
        },
      });
      return domain;
    } catch (error) {
      this.logger.error(
        `创建AI领域失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'CREATE_AI_DOMAIN_FAILED',
          message: '创建AI领域失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * PUT /api/admin/ai-domains/:id
   * 更新AI领域配置
   */
  @Put(':id')
  async updateAIDomain(
    @Param('id') id: string,
    @Body()
    body: {
      title?: string;
      description?: string;
      icon?: string;
      greetingMessage?: string;
      workflowConfig?: Record<string, unknown>;
      targetModel?: string;
      isVisible?: boolean;
      isMaintenance?: boolean;
      sortOrder?: number;
    },
  ) {
    try {
      const updateData: Record<string, unknown> = {};

      if (body.title !== undefined) updateData.title = body.title;
      if (body.description !== undefined) updateData.description = body.description;
      if (body.icon !== undefined) updateData.icon = body.icon;
      if (body.greetingMessage !== undefined) updateData.greetingMessage = body.greetingMessage;
      if (body.workflowConfig !== undefined) updateData.workflowConfig = body.workflowConfig;
      if (body.targetModel !== undefined) updateData.targetModel = body.targetModel;
      if (body.isVisible !== undefined) updateData.isVisible = body.isVisible;
      if (body.isMaintenance !== undefined) updateData.isMaintenance = body.isMaintenance;
      if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

      const domain = await this.prisma.aIDomain.update({
        where: { id },
        data: updateData,
      });
      return domain;
    } catch (error) {
      this.logger.error(
        `更新AI领域失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'UPDATE_AI_DOMAIN_FAILED',
          message: '更新AI领域失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * DELETE /api/admin/ai-domains/:id
   * 删除AI领域
   */
  @Delete(':id')
  async deleteAIDomain(@Param('id') id: string) {
    try {
      await this.prisma.aIDomain.delete({
        where: { id },
      });
      return { success: true };
    } catch (error) {
      this.logger.error(
        `删除AI领域失败: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw new HttpException(
        {
          code: 'DELETE_AI_DOMAIN_FAILED',
          message: '删除AI领域失败，请稍后重试',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
