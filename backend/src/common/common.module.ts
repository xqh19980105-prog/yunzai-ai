import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { UserService } from './services/user.service';
import { DomainService } from './services/domain.service';
import { RelayService } from './services/relay.service';
import { ChatService } from './services/chat.service';
import { ErrorHandlingService } from './services/error-handling.service'; // 【P1-3修复】统一错误处理服务

/**
 * Common Module
 * 提供通用的服务和工具
 */
@Module({
  imports: [PrismaModule],
  providers: [
    UserService,
    DomainService,
    RelayService,
    ChatService,
    ErrorHandlingService, // 【P1-3修复】统一错误处理服务
  ],
  exports: [
    UserService,
    DomainService,
    RelayService,
    ChatService,
    ErrorHandlingService, // 【P1-3修复】统一错误处理服务
  ],
})
export class CommonModule {}
