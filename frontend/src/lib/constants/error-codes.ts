/**
 * 统一错误码常量（前端）
 * 
 * 与后端错误码保持一致
 */

export const ErrorCodes = {
  // ========== 通用错误 ==========
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  HTTP_ERROR: 'HTTP_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  
  // ========== 认证相关 ==========
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_UNAUTHORIZED: 'AUTH_UNAUTHORIZED',
  AUTH_SESSION_EXPIRED: 'SESSION_EXPIRED',
  AUTH_TOKEN_INVALID: 'TOKEN_INVALID',
  AUTH_FORBIDDEN: 'FORBIDDEN',
  
  // ========== 用户相关 ==========
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS: 'USER_ALREADY_EXISTS',
  USER_INACTIVE: 'USER_INACTIVE',
  USER_LOCKED: 'USER_LOCKED',
  
  // ========== 激活码相关 ==========
  ACTIVATION_CODE_INVALID: 'ACTIVATION_CODE_INVALID',
  ACTIVATION_CODE_EXPIRED: 'ACTIVATION_CODE_EXPIRED',
  ACTIVATION_CODE_ALREADY_USED: 'ACTIVATION_CODE_ALREADY_USED',
  ACTIVATION_CODE_NOT_FOUND: 'ACTIVATION_CODE_NOT_FOUND',
  
  // ========== API密钥相关 ==========
  API_KEY_INVALID: 'API_KEY_INVALID',
  API_KEY_EXPIRED: 'API_KEY_EXPIRED',
  API_KEY_NOT_SET: 'API_KEY_NOT_SET',
  API_KEY_TEST_FAILED: 'API_KEY_TEST_FAILED',
  
  // ========== 工作流相关 ==========
  WORKFLOW_EXECUTION_ERROR: 'WORKFLOW_EXECUTION_ERROR',
  WORKFLOW_DOMAIN_NOT_FOUND: 'WORKFLOW_DOMAIN_NOT_FOUND',
  WORKFLOW_DOMAIN_UNAVAILABLE: 'WORKFLOW_DOMAIN_UNAVAILABLE',
  WORKFLOW_RELAY_NOT_FOUND: 'WORKFLOW_RELAY_NOT_FOUND',
  WORKFLOW_SENSITIVE_WORD_BLOCKED: 'SENSITIVE_WORD_BLOCKED',
  
  // ========== 聊天相关 ==========
  CHAT_MESSAGE_INVALID: 'CHAT_MESSAGE_INVALID',
  CHAT_HISTORY_NOT_FOUND: 'CHAT_HISTORY_NOT_FOUND',
  
  // ========== 法律相关 ==========
  LEGAL_NOT_SIGNED: 'LEGAL_NOT_SIGNED',
  LEGAL_SIGNATURE_INVALID: 'LEGAL_SIGNATURE_INVALID',
  
  // ========== 会员相关 ==========
  MEMBERSHIP_REQUIRED: 'MEMBERSHIP_REQUIRED',
  MEMBERSHIP_EXPIRED: 'MEMBERSHIP_EXPIRED',
  
  // ========== 管理员相关 ==========
  ADMIN_REQUIRED: 'ADMIN_REQUIRED',
  ADMIN_OPERATION_FAILED: 'ADMIN_OPERATION_FAILED',
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * 错误码对应的用户友好消息
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // ========== 通用错误 ==========
  INTERNAL_ERROR: '服务器内部错误，请稍后重试',
  HTTP_ERROR: '请求失败，请稍后重试',
  VALIDATION_ERROR: '输入数据格式不正确',
  DATABASE_ERROR: '数据库操作失败，请稍后重试',
  NETWORK_ERROR: '网络连接失败，请检查网络设置',
  
  // ========== 认证相关 ==========
  AUTH_LOGIN_FAILED: '邮箱或密码错误',
  AUTH_UNAUTHORIZED: '未授权，请先登录',
  SESSION_EXPIRED: '登录已过期，请重新登录',
  TOKEN_INVALID: '登录凭证无效，请重新登录',
  FORBIDDEN: '没有权限访问此资源',
  
  // ========== 用户相关 ==========
  USER_NOT_FOUND: '用户不存在',
  USER_ALREADY_EXISTS: '用户已存在',
  USER_INACTIVE: '用户账户未激活',
  USER_LOCKED: '用户账户已被锁定',
  
  // ========== 激活码相关 ==========
  ACTIVATION_CODE_INVALID: '激活码格式无效',
  ACTIVATION_CODE_EXPIRED: '激活码已过期',
  ACTIVATION_CODE_ALREADY_USED: '激活码已被使用',
  ACTIVATION_CODE_NOT_FOUND: '激活码不存在',
  
  // ========== API密钥相关 ==========
  API_KEY_INVALID: 'API密钥无效',
  API_KEY_EXPIRED: 'API密钥已过期',
  API_KEY_NOT_SET: '未设置API密钥',
  API_KEY_TEST_FAILED: 'API密钥验证失败',
  
  // ========== 工作流相关 ==========
  WORKFLOW_EXECUTION_ERROR: '工作流执行失败',
  WORKFLOW_DOMAIN_NOT_FOUND: 'AI Domain不存在',
  WORKFLOW_DOMAIN_UNAVAILABLE: 'AI Domain不可用',
  WORKFLOW_RELAY_NOT_FOUND: '中转站不存在',
  SENSITIVE_WORD_BLOCKED: '内容包含敏感词，已被拦截',
  
  // ========== 聊天相关 ==========
  CHAT_MESSAGE_INVALID: '消息内容无效',
  CHAT_HISTORY_NOT_FOUND: '聊天记录不存在',
  
  // ========== 法律相关 ==========
  LEGAL_NOT_SIGNED: '未签署法律声明',
  LEGAL_SIGNATURE_INVALID: '法律声明签名无效',
  
  // ========== 会员相关 ==========
  MEMBERSHIP_REQUIRED: '需要会员权限',
  MEMBERSHIP_EXPIRED: '会员已过期',
  
  // ========== 管理员相关 ==========
  ADMIN_REQUIRED: '需要管理员权限',
  ADMIN_OPERATION_FAILED: '管理员操作失败',
};

/**
 * 根据错误码获取用户友好的错误消息
 */
export function getErrorMessageByCode(code: ErrorCode | string): string {
  return ErrorMessages[code as ErrorCode] || code || '未知错误';
}
