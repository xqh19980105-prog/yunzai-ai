import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';
import {
  UpstreamUnauthorizedException,
  UpstreamRateLimitException,
  UpstreamInsufficientBalanceException,
  WorkflowExecutionException,
  SensitiveWordBlockedException,
} from '../exceptions/custom.exceptions';

/**
 * 【P1-3修复】统一错误处理服务
 * 
 * 职责：
 * 1. 错误分类和处理
 * 2. 统一错误日志记录
 * 3. 错误消息格式化
 * 4. 错误码映射
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  BUSINESS = 'BUSINESS',
  SYSTEM = 'SYSTEM',
  VALIDATION = 'VALIDATION',
}

export interface ErrorContext {
  userId?: string;
  domainId?: string;
  operation?: string;
  [key: string]: any;
}

@Injectable()
export class ErrorHandlingService {
  private readonly logger = new Logger(ErrorHandlingService.name);

  /**
   * 处理工作流执行错误
   */
  handleWorkflowError(
    error: unknown,
    context?: ErrorContext,
  ): WorkflowExecutionException {
    // 记录错误日志
    this.logger.error('Workflow execution failed', {
      error: error instanceof Error ? error.stack : String(error),
      context,
    });

    // 上游API错误：直接返回，不包装
    if (error instanceof UpstreamUnauthorizedException) {
      return error;
    }

    if (error instanceof UpstreamRateLimitException) {
      return error;
    }

    if (error instanceof UpstreamInsufficientBalanceException) {
      return error;
    }

    if (error instanceof SensitiveWordBlockedException) {
      return error;
    }

    // 其他错误包装为WorkflowExecutionException
    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : '工作流执行失败';

    return new WorkflowExecutionException(message);
  }

  /**
   * 处理数据库操作错误
   */
  handleDatabaseError(
    error: unknown,
    operation: string,
    context?: ErrorContext,
  ): HttpException {
    // 记录错误日志
    this.logger.error(`Database operation failed: ${operation}`, {
      error: error instanceof Error ? error.stack : String(error),
      operation,
      context,
    });

    // 数据库错误不应该暴露给用户
    return new HttpException(
      {
        code: ErrorCodes.DATABASE_ERROR,
        message: '数据库操作失败，请稍后重试',
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * 处理网络请求错误
   */
  handleNetworkError(
    error: unknown,
    url?: string,
    context?: ErrorContext,
  ): HttpException {
    // 记录错误日志
    this.logger.error('Network request failed', {
      error: error instanceof Error ? error.stack : String(error),
      url,
      context,
    });

    // 检查是否是已知的上游错误
    if (error instanceof UpstreamUnauthorizedException) {
      return error;
    }

    if (error instanceof UpstreamRateLimitException) {
      return error;
    }

    if (error instanceof UpstreamInsufficientBalanceException) {
      return error;
    }

    // 其他网络错误
    return new HttpException(
      {
        code: ErrorCodes.NETWORK_ERROR,
        message: '网络请求失败，请稍后重试',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }

  /**
   * 处理验证错误
   */
  handleValidationError(
    error: unknown,
    field?: string,
    context?: ErrorContext,
  ): HttpException {
    // 记录错误日志
    this.logger.warn('Validation failed', {
      error: error instanceof Error ? error.message : String(error),
      field,
      context,
    });

    const message =
      error instanceof Error
        ? error.message
        : field
          ? `${field}验证失败`
          : '输入验证失败';

    return new HttpException(
      {
        code: ErrorCodes.VALIDATION_ERROR,
        message,
      },
      HttpStatus.BAD_REQUEST,
    );
  }

  /**
   * 错误分类
   */
  classifyError(error: unknown): ErrorType {
    if (error instanceof UpstreamUnauthorizedException) {
      return ErrorType.AUTHENTICATION;
    }

    if (
      error instanceof UpstreamRateLimitException ||
      error instanceof UpstreamInsufficientBalanceException
    ) {
      return ErrorType.BUSINESS;
    }

    if (error instanceof SensitiveWordBlockedException) {
      return ErrorType.AUTHORIZATION;
    }

    if (error instanceof HttpException) {
      const status = error.getStatus();
      if (status >= 400 && status < 500) {
        if (status === 401) return ErrorType.AUTHENTICATION;
        if (status === 403) return ErrorType.AUTHORIZATION;
        return ErrorType.VALIDATION;
      }
    }

    // 网络错误
    if (error instanceof Error) {
      if (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND')
      ) {
        return ErrorType.NETWORK;
      }
    }

    return ErrorType.SYSTEM;
  }

  /**
   * 格式化错误消息（用于日志）
   */
  formatErrorForLog(error: unknown, context?: ErrorContext): string {
    const errorInfo = {
      message:
        error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: this.classifyError(error),
      context,
    };

    return JSON.stringify(errorInfo, null, 2);
  }
}