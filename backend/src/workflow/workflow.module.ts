import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowAdminController } from './workflow.controller';
import { CommonModule } from '../common/common.module';
import { WorkflowValidator } from './services/workflow-validator.service'; // 【P1-1修复】配置验证服务
import { WorkflowContextBuilder } from './services/workflow-context-builder.service'; // 【P1-1修复】上下文构建服务
import { WorkflowExecutor } from './services/workflow-executor.service'; // 【P1-1修复】工作流执行服务

@Module({
  imports: [CommonModule], // 导入CommonModule以使用DomainService、RelayService、UserService、ErrorHandlingService
  controllers: [WorkflowAdminController],
  providers: [
    WorkflowService,
    WorkflowValidator, // 【P1-1修复】配置验证服务
    WorkflowContextBuilder, // 【P1-1修复】上下文构建服务
    WorkflowExecutor, // 【P1-1修复】工作流执行服务
  ],
  exports: [WorkflowService],
})
export class WorkflowModule {}
