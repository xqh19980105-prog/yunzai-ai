import { Injectable } from '@nestjs/common';
import { ErrorHandlingService } from '../../common/services/error-handling.service';
import { WorkflowInputValidator } from '../../common/utils/workflow-input.validator';
import {
  UpstreamUnauthorizedException,
  UpstreamRateLimitException,
  UpstreamInsufficientBalanceException,
  WorkflowExecutionException,
} from '../../common/exceptions/custom.exceptions';
import { WorkflowExecutionContext } from './workflow-context-builder.service';

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
 * 【P1-1修复】WorkflowExecutor
 * 
 * 职责：执行工作流步骤
 * - 顺序执行工作流步骤
 * - 处理变量替换
 * - 调用AI API
 * - 处理步骤转换
 */
@Injectable()
export class WorkflowExecutor {
  constructor(private errorHandlingService: ErrorHandlingService) {}

  /**
   * 执行工作流
   */
  async execute(
    config: WorkflowConfig,
    context: WorkflowExecutionContext,
  ): Promise<string> {
    // 执行工作流步骤顺序执行（链式执行）
    let currentResult = context.userInput;

    try {
      for (let i = 0; i < config.steps.length; i++) {
        const step = config.steps[i];
        const isFirstStep = i === 0;

        // 执行当前步骤
        currentResult = await this.executeStep(step, currentResult, {
          ...context,
          variables: config.variables || {},
          isFirstStep,
        });
      }

      // 返回最终结果
      return currentResult;
    } catch (error) {
      // 使用统一错误处理服务
      throw this.errorHandlingService.handleWorkflowError(error, {
        userId: context.userId,
        domainId: context.domainId,
        operation: 'executeWorkflow',
      });
    }
  }

  /**
   * 执行单个步骤
   */
  private async executeStep(
    step: WorkflowStep,
    input: string,
    context: WorkflowExecutionContext & {
      variables: Record<string, string>;
      isFirstStep?: boolean;
    },
  ): Promise<string> {
    // 验证步骤
    if (!step || typeof step !== 'object') {
      throw new WorkflowExecutionException('步骤配置无效');
    }

    // 验证API Key和BaseURL
    if (
      !context.apiKey ||
      typeof context.apiKey !== 'string' ||
      context.apiKey.trim().length === 0
    ) {
      throw new WorkflowExecutionException('API密钥无效');
    }
    if (
      !context.baseUrl ||
      typeof context.baseUrl !== 'string' ||
      context.baseUrl.trim().length === 0
    ) {
      throw new WorkflowExecutionException('API基础URL无效');
    }

    // 处理提示词模板
    let promptContent = input;

    if (step.config.template) {
      const template = step.config.template;
      // 替换变量
      promptContent = template
        .replace(/\{\{user_input\}\}/g, context.userInput)
        .replace(/\{\{input\}\}/g, input);

      // 替换自定义变量
      for (const [key, value] of Object.entries(context.variables)) {
        promptContent = promptContent.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, 'g'),
          value,
        );
      }

      // 如果是第一步且模板中没有使用 {{user_input}}，自动将用户输入包含到提示词中
      if (
        context.isFirstStep &&
        !template.includes('{{user_input}}') &&
        context.userInput.trim()
      ) {
        const trimmedTemplate = template.trim();
        if (
          trimmedTemplate.endsWith('?') ||
          trimmedTemplate.endsWith('：') ||
          trimmedTemplate.endsWith(':')
        ) {
          promptContent = `${promptContent}\n\n${context.userInput}`;
        } else {
          promptContent = `${promptContent}\n\n用户输入：${context.userInput}`;
        }
      }
    } else {
      promptContent = input;
    }

    // 调用AI API
    return await this.executeApiCallStep(step, promptContent, context);
  }

  /**
   * 执行API调用步骤
   */
  private async executeApiCallStep(
    step: WorkflowStep,
    input: string,
    context: WorkflowExecutionContext,
  ): Promise<string> {
    if (!step.config || typeof step.config !== 'object') {
      throw new WorkflowExecutionException('步骤配置无效');
    }

    // 验证端点URL
    const endpoint =
      step.config.endpoint && typeof step.config.endpoint === 'string'
        ? step.config.endpoint
        : '/v1/chat/completions';

    try {
      WorkflowInputValidator.validateEndpoint(endpoint, 'API端点');
    } catch (error) {
      throw this.errorHandlingService.handleValidationError(error, 'API端点');
    }

    // 构建URL
    const cleanBaseUrl = context.baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `${cleanBaseUrl}${cleanEndpoint}`;

    // 确定使用的模型
    const modelToUse =
      step.model && step.model.trim().length > 0
        ? step.model.trim()
        : context.targetModel && context.targetModel.trim().length > 0
          ? context.targetModel.trim()
          : 'gpt-3.5-turbo';

    try {
      WorkflowInputValidator.validateModelName(modelToUse);
    } catch (error) {
      throw this.errorHandlingService.handleValidationError(error, '模型名称');
    }

    // 构建消息内容
    let messageContent:
      | string
      | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    if (context.images && Array.isArray(context.images) && context.images.length > 0) {
      messageContent = [];

      if (input && typeof input === 'string' && input.trim().length > 0) {
        messageContent.push({
          type: 'text',
          text: input,
        });
      }

      for (const image of context.images) {
        if (
          !image ||
          typeof image !== 'object' ||
          !image.data ||
          typeof image.data !== 'string' ||
          image.data.length === 0 ||
          !image.mimeType ||
          typeof image.mimeType !== 'string'
        ) {
          continue;
        }

        messageContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${image.mimeType};base64,${image.data}`,
          },
        });
      }

      if (messageContent.length === 0 && input && typeof input === 'string') {
        messageContent = input;
      }
    } else {
      messageContent = input && typeof input === 'string' ? input : '';
    }

    // 确保有内容
    if (
      (typeof messageContent === 'string' && messageContent.length === 0) ||
      (Array.isArray(messageContent) && messageContent.length === 0)
    ) {
      throw new WorkflowExecutionException('消息内容不能为空');
    }

    const requestBody = {
      model: modelToUse,
      messages: [
        {
          role: 'user',
          content: messageContent,
        },
      ],
      ...step.config.extraParams,
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${context.apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      // 处理上游API错误
      if (response.status === 401) {
        throw new UpstreamUnauthorizedException();
      }

      if (response.status === 402) {
        throw new UpstreamInsufficientBalanceException();
      }

      if (response.status === 429) {
        throw new UpstreamRateLimitException();
      }

      if (!response.ok) {
        let errorText = '';
        try {
          errorText = await response.text();
        } catch (textError) {
          errorText = `Failed to read error response: ${textError instanceof Error ? textError.message : String(textError)}`;
        }
        throw new WorkflowExecutionException(
          `API call failed: ${response.status} ${errorText}`,
        );
      }

      // 解析响应
      let data: any;
      try {
        const responseText = await response.text();
        if (!responseText || responseText.trim().length === 0) {
          throw new WorkflowExecutionException('API返回为空');
        }
        data = JSON.parse(responseText);
      } catch (parseError) {
        throw new WorkflowExecutionException(
          `API返回格式无效: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
        );
      }

      // 提取响应内容
      if (!data || typeof data !== 'object') {
        throw new WorkflowExecutionException('API返回格式无效');
      }
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.length > 0) {
        return content;
      }
      // Fallback: return JSON string if content is missing
      return JSON.stringify(data);
    } catch (error) {
      // 使用统一错误处理服务处理网络错误
      throw this.errorHandlingService.handleNetworkError(error, url, {
        operation: 'executeApiCallStep',
        model: modelToUse,
      });
    }
  }
}