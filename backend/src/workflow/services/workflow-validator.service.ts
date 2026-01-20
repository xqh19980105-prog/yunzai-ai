import { Injectable } from '@nestjs/common';
import { DomainService } from '../../common/services/domain.service';
import { RelayService } from '../../common/services/relay.service';
import { WorkflowInputValidator } from '../../common/utils/workflow-input.validator';
import { ErrorHandlingService } from '../../common/services/error-handling.service';
import {
  WorkflowExecutionException,
  SensitiveWordBlockedException,
} from '../../common/exceptions/custom.exceptions';
export interface WorkflowStep {
  type: 'prompt' | 'api_call' | 'transform';
  model?: string;
  config: Record<string, any>;
}

export interface WorkflowConfig {
  steps: WorkflowStep[];
  variables?: Record<string, string>;
}

/**
 * 【P1-1修复】WorkflowValidator
 * 
 * 职责：验证工作流配置和相关资源
 * - 验证工作流配置格式
 * - 验证模型配置
 * - 验证中转站配置
 * - 检查敏感词
 */
@Injectable()
export class WorkflowValidator {
  constructor(
    private domainService: DomainService,
    private relayService: RelayService,
    private errorHandlingService: ErrorHandlingService,
  ) {}

  /**
   * 验证并加载工作流配置
   */
  async validateAndLoadConfig(
    domainId: string,
    userId: string,
  ): Promise<WorkflowConfig> {
    // 加载领域配置
    const domain = await this.domainService.findAvailableByIdOrThrow(domainId);

    if (!domain.workflowConfig) {
      throw new WorkflowExecutionException('Workflow configuration not found');
    }

    // 验证工作流配置格式
    const rawConfig = domain.workflowConfig as unknown;
    try {
      WorkflowInputValidator.validateWorkflowConfig(rawConfig);
    } catch (error) {
      throw this.errorHandlingService.handleValidationError(
        error,
        '工作流配置',
        { userId, domainId },
      );
    }

    const workflowConfig = rawConfig as WorkflowConfig;

    // 验证工作流至少有一个步骤
    if (!workflowConfig.steps || workflowConfig.steps.length === 0) {
      throw new WorkflowExecutionException(
        '工作流配置至少需要包含一个步骤',
      );
    }

    return workflowConfig;
  }

  /**
   * 验证所有步骤的模型配置
   */
  async validateModels(
    workflowConfig: WorkflowConfig,
    userId: string,
    domainId: string,
  ): Promise<void> {
    // 加载中转站配置
    const relayConfig = await this.relayService.findActiveRelayOrThrow();
    const availableModels = (relayConfig.availableModels || []) as string[];

    // 验证所有步骤的模型配置
    const usedModels = new Set<string>();
    for (let i = 0; i < workflowConfig.steps.length; i++) {
      const step = workflowConfig.steps[i];

      // 验证步骤配置
      try {
        WorkflowInputValidator.validateStepConfig(step, i);
      } catch (error) {
        throw this.errorHandlingService.handleValidationError(
          error,
          `步骤 ${i + 1}`,
          { userId, domainId },
        );
      }

      // 验证模型名称
      if (step.model) {
        try {
          WorkflowInputValidator.validateModelName(
            step.model,
            `步骤 ${i + 1} 模型`,
          );
        } catch (error) {
          throw this.errorHandlingService.handleValidationError(
            error,
            `步骤 ${i + 1} 模型`,
            { userId, domainId },
          );
        }
        usedModels.add(step.model.trim());
      } else {
        throw new WorkflowExecutionException(
          `步骤 ${i + 1} 未配置模型，请在工作流编辑器中为每个步骤选择AI模型。`,
        );
      }
    }

    // 验证所有使用的模型都在中转站的支持列表中
    if (availableModels.length > 0) {
      for (const model of usedModels) {
        if (!availableModels.includes(model)) {
          throw new WorkflowExecutionException(
            `模型 ${model} 不在当前激活的中转站（${relayConfig.name}）的支持列表中。请管理员更新工作流配置或切换中转站。`,
          );
        }
      }
    }
  }

  /**
   * 检查敏感词
   */
  async checkSensitiveWords(
    userInput: string,
    prisma: any,
  ): Promise<void> {
    try {
      // Load sensitive_words from SystemConfig
      const sensitiveWordsConfig = await prisma.systemConfig.findUnique({
        where: { key: 'sensitive_words' },
      });

      if (!sensitiveWordsConfig) {
        // No sensitive words configured, skip check
        return;
      }

      // Parse sensitive words array from JSON
      let sensitiveWords: string[] = [];
      try {
        const parsed = JSON.parse(sensitiveWordsConfig.value);
        sensitiveWords = Array.isArray(parsed) ? parsed : [];
      } catch {
        // Invalid JSON format, skip check
        return;
      }

      // Check if user input contains any sensitive word (case-insensitive)
      const lowerInput = userInput.toLowerCase();
      for (const word of sensitiveWords) {
        if (word && lowerInput.includes(word.toLowerCase())) {
          throw new SensitiveWordBlockedException();
        }
      }
    } catch (error) {
      // If it's a SensitiveWordBlockedException, re-throw it
      if (error instanceof SensitiveWordBlockedException) {
        throw error;
      }
      // Otherwise, log and continue (don't block due to config errors)
      console.error('Error checking sensitive words:', error);
    }
  }
}