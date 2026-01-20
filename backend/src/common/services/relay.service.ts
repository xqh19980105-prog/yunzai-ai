import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { WorkflowExecutionException } from '../exceptions/custom.exceptions';

type RelayConfig = NonNullable<Awaited<ReturnType<PrismaClient['relayConfig']['findUnique']>>>;

/**
 * Relay Service
 * 统一管理中转站（Relay）相关的查询逻辑
 * 提取自多个Service的重复代码
 */
@Injectable()
export class RelayService {
  constructor(private prisma: PrismaService) {}

  /**
   * 查找激活的中转站，不存在则抛出异常
   * @returns 激活的中转站配置
   */
  async findActiveRelayOrThrow(): Promise<RelayConfig> {
    const relay = await this.prisma.relayConfig.findFirst({
      where: { isActive: true },
    });
    if (!relay) {
      throw new WorkflowExecutionException('No active relay configuration found');
    }
    return relay;
  }

  /**
   * 查找激活的中转站，不存在则返回null
   * @returns 激活的中转站配置或null
   */
  async findActiveRelay(): Promise<RelayConfig | null> {
    return this.prisma.relayConfig.findFirst({
      where: { isActive: true },
    });
  }
}
