import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { WorkflowModule } from './workflow/workflow.module';
import { ChatModule } from './chat/chat.module';
import { SystemConfigModule } from './system-config/system-config.module';
import { SchedulerModule } from './scheduler/scheduler.module';
import { LegalModule } from './legal/legal.module';
import { AdminModule } from './admin/admin.module';
import { AIDomainsModule } from './ai-domains/ai-domains.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    WorkflowModule,
    ChatModule,
    SystemConfigModule,
    SchedulerModule,
    LegalModule,
    AdminModule,
    AIDomainsModule,
    HealthModule,
  ],
})
export class AppModule {}
