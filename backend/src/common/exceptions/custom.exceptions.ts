import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../constants/error-codes';

// ✅ 使用统一的错误码常量
export class AssetProtectionTriggeredException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.ASSET_PROTECTION_TRIGGERED,
        message: '账户因安全保护机制已锁定，请联系管理员',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class LegalGateBlockedException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.LEGAL_GATE_BLOCKED,
        message: '请先完成法律声明确认',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class UpstreamUnauthorizedException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.UPSTREAM_UNAUTHORIZED,
        message: 'API密钥无效或已过期，请检查您的配置',
      },
      HttpStatus.UNAUTHORIZED,
    );
  }
}

export class UpstreamRateLimitException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.UPSTREAM_RATE_LIMIT,
        message: '请求频率过高，请稍后再试',
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}

export class UpstreamInsufficientBalanceException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.UPSTREAM_INSUFFICIENT_BALANCE,
        message: 'API密钥余额不足，请检查您的API密钥配置或前往第三方服务商充值',
      },
      HttpStatus.PAYMENT_REQUIRED, // 402
    );
  }
}

export class WorkflowExecutionException extends HttpException {
  constructor(message: string) {
    super(
      {
        code: ErrorCodes.WORKFLOW_EXECUTION_ERROR,
        message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}

export class SensitiveWordBlockedException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.WORKFLOW_SENSITIVE_WORD_BLOCKED,
        message: '请求包含敏感内容，拒绝执行',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}

export class MembershipRequiredException extends HttpException {
  constructor() {
    super(
      {
        code: ErrorCodes.MEMBERSHIP_REQUIRED,
        message: '您还不是会员，请购买会员或使用激活码激活',
      },
      HttpStatus.FORBIDDEN,
    );
  }
}
