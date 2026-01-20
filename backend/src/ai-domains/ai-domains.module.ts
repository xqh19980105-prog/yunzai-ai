import { Module } from '@nestjs/common';
import { AIDomainsController } from './ai-domains.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AIDomainsController],
})
export class AIDomainsModule {}
