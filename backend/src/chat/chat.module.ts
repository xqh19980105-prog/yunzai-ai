import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { WorkflowModule } from '../workflow/workflow.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [WorkflowModule, CommonModule], // ✅ 导入CommonModule以使用ChatService
  controllers: [ChatController],
})
export class ChatModule {}
