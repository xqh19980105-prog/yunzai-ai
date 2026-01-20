import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

// 拆分后的控制器
import {
  AdminAIDomainsController,
  AdminActivationCodesController,
  AdminUsersController,
  AdminRelayConfigsController,
  AdminSystemConfigController,
  PublicSystemConfigController,
  AdminStatsController,
} from './controllers';

/**
 * Admin 模块
 * 
 * 代码重构说明：
 * 原来的 AdminController (1100+ 行) 已拆分为多个专职控制器：
 * - AdminAIDomainsController: AI领域/工具管理
 * - AdminActivationCodesController: 激活码管理
 * - AdminUsersController: 用户管理
 * - AdminRelayConfigsController: 中转站配置管理
 * - AdminSystemConfigController: 系统配置管理
 * - AdminStatsController: 统计数据
 * - PublicSystemConfigController: 公开配置（无需登录）
 * 
 * 每个控制器职责单一，便于维护和测试。
 */
@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [
    AdminAIDomainsController,
    AdminActivationCodesController,
    AdminUsersController,
    AdminRelayConfigsController,
    AdminSystemConfigController,
    PublicSystemConfigController,
    AdminStatsController,
  ],
  providers: [],
  exports: [],
})
export class AdminModule {}
