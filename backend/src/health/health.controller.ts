import { Controller, Get, HttpStatus, HttpException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: '健康检查（包含数据库和Redis状态）' })
  @ApiResponse({ status: 200, description: '服务正常' })
  @ApiResponse({ status: 503, description: '服务不可用' })
  async check() {
    const health = {
      status: 'ok' as 'ok' | 'degraded' | 'down',
      timestamp: new Date().toISOString(),
      service: 'yunzai-ai-backend',
      checks: {
        database: { status: 'unknown' as 'ok' | 'error', message: '' },
        redis: { status: 'unknown' as 'ok' | 'error', message: '' },
      },
    };

    let hasError = false;

    // 检查数据库连接
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      health.checks.database = { status: 'ok', message: 'Connected' };
    } catch (error) {
      health.checks.database = {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
      hasError = true;
    }

    // 检查Redis连接
    if (this.redis.isRedisAvailable()) {
      try {
        // 尝试执行一个简单的Redis命令
        await this.redis.get('health-check');
        health.checks.redis = { status: 'ok', message: 'Connected' };
      } catch (error) {
        health.checks.redis = {
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
        // Redis错误不导致整体健康检查失败（因为Redis不是关键服务）
      }
    } else {
      health.checks.redis = { status: 'error', message: 'Not connected' };
      // Redis不可用不影响整体状态（因为Redis不是关键服务）
    }

    // 如果数据库不可用，返回503
    if (health.checks.database.status === 'error') {
      health.status = 'down';
      throw new HttpException(health, HttpStatus.SERVICE_UNAVAILABLE);
    }

    // 如果Redis不可用但数据库可用，状态为degraded
    if (health.checks.redis.status === 'error') {
      health.status = 'degraded';
    }

    return health;
  }
}
