import { Module } from '@nestjs/common';
import { LegalController, LegalAdminController } from './legal.controller';
import { LegalService } from './legal.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [LegalController, LegalAdminController],
  providers: [LegalService],
  exports: [LegalService],
})
export class LegalModule {}
