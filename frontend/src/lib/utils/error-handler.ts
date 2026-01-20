import { AxiosError } from 'axios';
import { ErrorCodes, getErrorMessageByCode, type ErrorCode } from '@/lib/constants/error-codes';

/**
 * API Error Response Type
 */
export interface ApiErrorResponse {
  code?: string;
  message?: string;
  errors?: Record<string, string[]>;
  timestamp?: string;
  path?: string;
}

/**
 * Extract error message from various error types
 * ✅ 优先使用错误码对应的友好消息，如果没有则使用后端返回的消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    
    // 如果有错误码，优先使用错误码对应的友好消息
    if (data?.code) {
      const friendlyMessage = getErrorMessageByCode(data.code);
      // 如果错误码有对应的友好消息，使用它；否则使用后端返回的消息
      if (friendlyMessage !== data.code) {
        return friendlyMessage;
      }
    }
    
    // 使用后端返回的消息，或默认消息
    return data?.message || error.message || '请求失败，请稍后重试';
  }

  if (error instanceof Error) {
    // 处理 message 为 undefined 或空字符串的情况
    return error.message || '未知错误';
  }

  return String(error) || '未知错误';
}

/**
 * Extract error code from AxiosError
 */
export function getErrorCode(error: unknown): ErrorCode | string | undefined {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.code;
  }
  return undefined;
}

/**
 * Check if error is an AxiosError
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return error instanceof AxiosError;
}

/**
 * Check if error code matches a specific error code
 */
export function isErrorCode(error: unknown, code: ErrorCode): boolean {
  const errorCode = getErrorCode(error);
  return errorCode === code;
}
