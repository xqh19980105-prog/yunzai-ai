import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorHandlingService } from '../common/services/error-handling.service';
import { WorkflowInputValidator } from '../common/utils/workflow-input.validator';
import { WorkflowValidator } from './services/workflow-validator.service';
import { WorkflowContextBuilder } from './services/workflow-context-builder.service';
import { WorkflowExecutor } from './services/workflow-executor.service';

export interface WorkflowStep {
  type: 'prompt' | 'api_call' | 'transform';
  model?: string; // Optional: AI model to use for this specific step (for api_call type)
  config: Record<string, any>;
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
  variables?: Record<string, string>;
}

/**
 * 【P1-1修复】WorkflowService重构
 * 
 * 职责：协调工作流执行流程
 * - 输入验证
 * - 协调Validator、ContextBuilder、Executor
 * - 不直接处理业务逻辑，只负责协调
 */
@Injectable()
export class WorkflowService {
  constructor(
    private prisma: PrismaService,
    private errorHandlingService: ErrorHandlingService, // 【P1-3修复】统一错误处理
    private workflowValidator: WorkflowValidator, // 【P1-1修复】配置验证
    private contextBuilder: WorkflowContextBuilder, // 【P1-1修复】上下文构建
    private workflowExecutor: WorkflowExecutor, // 【P1-1修复】工作流执行
  ) {}

  /**
   * 【P1-1修复】Execute workflow: The Black Box
   * 
   * 重构后的职责：
   * 1. 输入验证
   * 2. 协调Validator、ContextBuilder、Executor
   * 3. 不直接处理业务逻辑
   * 
   * ⚡ CONCURRENCY: This method is fully concurrent-safe.
   * Multiple workflow executions can run simultaneously for different users/domains.
   * Each execution is independent and uses its own context (userId, domainId, apiKey).
   * No shared mutable state - all operations are async and thread-safe.
   */
  async executeWorkflow(
    userId: string,
    domainId: string,
    userInput: string,
    images?: Array<{ data: string; mimeType: string }>,
  ): Promise<string> {
    // 【P1-4修复】1. 输入验证和边界检查
    try {
      WorkflowInputValidator.validateUserInput(userInput);
      WorkflowInputValidator.validateDomainId(domainId);
      WorkflowInputValidator.validateImages(images);
    } catch (error) {
      throw this.errorHandlingService.handleValidationError(
        error,
        '工作流输入',
        { userId, domainId },
      );
    }

    // 【P1-1修复】2. 敏感词检查
    await this.workflowValidator.checkSensitiveWords(userInput, this.prisma);

    // 【P1-1修复】3. 验证并加载工作流配置
    const workflowConfig = await this.workflowValidator.validateAndLoadConfig(
      domainId,
      userId,
    );

    // 【P1-1修复】4. 验证模型配置
    await this.workflowValidator.validateModels(
      workflowConfig,
      userId,
      domainId,
    );

    // 【P1-1修复】5. 构建执行上下文
    const context = await this.contextBuilder.build(
      userId,
      domainId,
      userInput,
      images,
    );

    // 【P1-1修复】6. 执行工作流
    return await this.workflowExecutor.execute(workflowConfig, context);
  }

}
