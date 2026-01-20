import { Injectable, NotFoundException } from '@nestjs/common';
import { DomainService } from '../../common/services/domain.service';
import { RelayService } from '../../common/services/relay.service';
import { UserService } from '../../common/services/user.service';
import { WorkflowExecutionException } from '../../common/exceptions/custom.exceptions';

/**
 * 【P1-1修复】WorkflowContextBuilder
 * 
 * 职责：构建工作流执行上下文
 * - 加载领域配置
 * - 加载中转站配置
 * - 加载用户API密钥
 * - 构建执行上下文
 */
export interface WorkflowExecutionContext {
  userId: string;
  domainId: string;
  userInput: string;
  images?: Array<{ data: string; mimeType: string }>;
  baseUrl: string;
  apiKey: string;
  targetModel: string;
  variables: Record<string, string>;
}

@Injectable()
export class WorkflowContextBuilder {
  constructor(
    private domainService: DomainService,
    private relayService: RelayService,
    private userService: UserService,
  ) {}

  /**
   * 构建工作流执行上下文
   */
  async build(
    userId: string,
    domainId: string,
    userInput: string,
    images?: Array<{ data: string; mimeType: string }>,
  ): Promise<WorkflowExecutionContext> {
    // 加载领域配置
    const domain = await this.domainService.findAvailableByIdOrThrow(domainId);
    const targetModel = domain.targetModel || 'gpt-3.5-turbo';

    // 加载中转站配置
    const relayConfig = await this.relayService.findActiveRelayOrThrow();
    const baseUrl = relayConfig.baseUrl;

    // 加载用户API密钥
    const userWithApiKey = await this.userService.findByIdSelect(userId, {
      apiKey: true,
      apiBaseUrl: true,
      status: true,
    });

    // 验证用户状态
    if (userWithApiKey.status !== 'ACTIVE') {
      throw new NotFoundException('User not found or inactive');
    }

    if (!userWithApiKey.apiKey) {
      throw new WorkflowExecutionException('User API key not configured');
    }

    // 构建执行上下文
    return {
      userId,
      domainId,
      userInput,
      images,
      baseUrl,
      apiKey: userWithApiKey.apiKey,
      targetModel,
      variables: {}, // 可以从domain.workflowConfig.variables获取
    };
  }
}