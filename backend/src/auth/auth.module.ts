import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';
import { RedisModule } from '../redis/redis.module'; // 【P1-2修复】导入RedisModule以使用RedisService
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { ActivationController } from './activation.controller';
import { ApiKeyController } from './api-key.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { AssetProtectionMiddleware } from './middleware/asset-protection.middleware';
import { LegalGateGuard } from './guards/legal-gate.guard';
import { ActivationService } from './services/activation.service';
import { SessionService } from './services/session.service'; // 【P1-2修复】会话管理服务
import { DeviceService } from './services/device.service'; // 【P1-2修复】设备管理服务

@Module({
  imports: [
    PassportModule,
    PrismaModule,
    CommonModule, // 导入CommonModule以使用UserService
    RedisModule, // 【P1-2修复】导入RedisModule以使用RedisService
    HttpModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, ActivationController, ApiKeyController],
  providers: [
    AuthService,
    ActivationService,
    JwtStrategy,
    LegalGateGuard,
    SessionService, // 【P1-2修复】会话管理服务
    DeviceService, // 【P1-2修复】设备管理服务
  ],
  exports: [AuthService, ActivationService, LegalGateGuard],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply asset protection middleware to all routes
    consumer.apply(AssetProtectionMiddleware).forRoutes('*');
  }
}
