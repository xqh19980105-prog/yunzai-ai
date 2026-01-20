import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';

type AIDomain = NonNullable<Awaited<ReturnType<PrismaClient['aIDomain']['findUnique']>>>;

/**
 * Domain Service
 * 统一管理AI Domain相关的查询逻辑
 * 提取自多个Controller和Service的重复代码
 */
@Injectable()
export class DomainService {
  constructor(private prisma: PrismaService) {}

  /**
   * 根据ID查找AI Domain，不存在则抛出异常
   * @param domainId 域ID
   * @returns AI Domain记录
   */
  async findByIdOrThrow(domainId: string): Promise<AIDomain> {
    const domain = await this.prisma.aIDomain.findUnique({
      where: { id: domainId },
    });
    if (!domain) {
      throw new NotFoundException('AI Domain not found');
    }
    return domain;
  }

  /**
   * 根据ID查找可用的AI Domain，不存在或不可用则抛出异常
   * @param domainId 域ID
   * @returns 可用的AI Domain记录
   */
  async findAvailableByIdOrThrow(domainId: string): Promise<AIDomain> {
    const domain = await this.findByIdOrThrow(domainId);
    if (!domain.isVisible || domain.isMaintenance) {
      throw new NotFoundException('AI Domain is not available');
    }
    return domain;
  }
}
