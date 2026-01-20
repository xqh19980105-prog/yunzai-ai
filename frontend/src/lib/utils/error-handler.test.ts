/**
 * 测试框架：Vitest
 * 
 * 这是一个完整的测试套件，覆盖了 error-handler.ts 的所有功能。
 * 测试包括：正常功能、边界条件、异常处理、潜在逻辑漏洞。
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AxiosError } from 'axios';
import {
  getErrorMessage,
  getErrorCode,
  isAxiosError,
  ApiErrorResponse,
} from './error-handler';

describe('error-handler 工具函数测试套件', () => {
  // ==================== getErrorMessage 函数测试 ====================

  describe('getErrorMessage - 正常功能测试', () => {
    it('应该从 AxiosError 的 response.data.message 中提取错误消息', () => {
      const mockResponse = {
        data: {
          code: 'CUSTOM_ERROR',
          message: '这是一个自定义错误消息',
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', 'ECONNABORTED', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe('这是一个自定义错误消息');
    });

    it('应该从 AxiosError 的 message 属性中提取错误消息（当 response.data.message 不存在时）', () => {
      const mockResponse = {
        data: {} as ApiErrorResponse,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Network Error', 'ERR_NETWORK', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe('Network Error');
    });

    it('应该返回默认消息（当 AxiosError 既没有 response.data.message 也没有 message 时）', () => {
      const mockResponse = {
        data: {} as ApiErrorResponse,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe('请求失败，请稍后重试');
    });

    it('应该从普通 Error 对象中提取错误消息', () => {
      const error = new Error('这是一个普通错误');
      const result = getErrorMessage(error);

      expect(result).toBe('这是一个普通错误');
    });

    it('应该将其他类型的错误转换为字符串', () => {
      const error = '字符串错误';
      const result = getErrorMessage(error);

      expect(result).toBe('字符串错误');
    });

    it('应该处理 null 错误', () => {
      const result = getErrorMessage(null);

      // String(null) 返回 'null'，所以实际结果是 'null'
      expect(result).toBe('null');
    });

    it('应该处理 undefined 错误', () => {
      const result = getErrorMessage(undefined);

      // String(undefined) 返回 'undefined'，所以实际结果是 'undefined'
      expect(result).toBe('undefined');
    });
  });

  describe('getErrorMessage - 边界条件测试', () => {
    it('应该处理空字符串消息', () => {
      const mockResponse = {
        data: {
          message: '',
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe('请求失败，请稍后重试');
    });

    it('应该处理超长错误消息（不截断）', () => {
      const longMessage = 'A'.repeat(10000);
      const mockResponse = {
        data: {
          message: longMessage,
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe(longMessage);
      expect(result.length).toBe(10000);
    });

    it('应该处理包含特殊字符的错误消息', () => {
      const specialMessage = '错误消息包含特殊字符: <>{}[]@#$%^&*()';
      const mockResponse = {
        data: {
          message: specialMessage,
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe(specialMessage);
    });

    it('应该处理包含换行符的错误消息', () => {
      const multilineMessage = '第一行错误\n第二行错误\n第三行错误';
      const mockResponse = {
        data: {
          message: multilineMessage,
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe(multilineMessage);
    });

    it('应该处理 Unicode 字符（中文、emoji等）', () => {
      const unicodeMessage = '错误消息包含中文和emoji: 🚀💥❌✅';
      const mockResponse = {
        data: {
          message: unicodeMessage,
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe(unicodeMessage);
    });

    it('应该处理没有 response 的 AxiosError', () => {
      const error = new AxiosError('Network Error', 'ERR_NETWORK', {} as any, {});
      // @ts-ignore - 故意测试 response 为 undefined 的情况
      error.response = undefined;
      const result = getErrorMessage(error);

      expect(result).toBe('Network Error');
    });

    it('应该处理 response.data 为 null 的情况', () => {
      const mockResponse = {
        data: null,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe('请求失败，请稍后重试');
    });

    it('应该处理 response.data 不是对象的情况', () => {
      const mockResponse = {
        data: '字符串响应',
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      expect(result).toBe('请求失败，请稍后重试');
    });
  });

  describe('getErrorMessage - 异常处理测试', () => {
    it('应该处理数字类型的错误', () => {
      const result = getErrorMessage(404);

      expect(result).toBe('404');
    });

    it('应该处理布尔类型的错误', () => {
      const result = getErrorMessage(true);

      expect(result).toBe('true');
    });

    it('应该处理对象类型的错误（不是 Error 实例）', () => {
      const errorObject = { custom: 'error', code: 500 };
      const result = getErrorMessage(errorObject);

      expect(result).toBe('[object Object]');
    });

    it('应该处理数组类型的错误', () => {
      const errorArray = ['error1', 'error2'];
      const result = getErrorMessage(errorArray);

      expect(result).toBe('error1,error2');
    });

    it('应该处理 Error 对象但没有 message 属性的情况', () => {
      const error = new Error();
      // @ts-ignore - 故意移除 message 属性
      error.message = undefined;
      const result = getErrorMessage(error);

      // 修复后：应该返回默认消息而不是 undefined
      expect(result).toBe('未知错误');
      expect(typeof result).toBe('string');
    });
  });

  describe('getErrorMessage - 潜在逻辑漏洞测试', () => {
    it('应该优先使用 response.data.message 而不是 error.message', () => {
      // 测试优先级：response.data.message > error.message > 默认消息
      const mockResponse = {
        data: {
          message: '来自服务器的详细错误',
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('网络层错误', 'ERR_NETWORK', {} as any, {}, mockResponse);
      const result = getErrorMessage(error);

      // 应该优先显示服务器返回的详细错误，而不是网络层错误
      expect(result).toBe('来自服务器的详细错误');
      expect(result).not.toBe('网络层错误');
    });

    it('应该正确处理嵌套的错误对象', () => {
      // 模拟某些框架可能返回的嵌套错误结构
      const nestedError = {
        error: {
          message: '嵌套的错误消息',
        },
      };

      // 这种情况应该返回 [object Object]，因为不是 Error 实例
      const result = getErrorMessage(nestedError);
      expect(result).toBe('[object Object]');
    });
  });

  // ==================== getErrorCode 函数测试 ====================

  describe('getErrorCode - 正常功能测试', () => {
    it('应该从 AxiosError 的 response.data.code 中提取错误代码', () => {
      const mockResponse = {
        data: {
          code: 'CUSTOM_ERROR_CODE',
          message: '错误消息',
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', 'ECONNABORTED', {} as any, {}, mockResponse);
      const result = getErrorCode(error);

      expect(result).toBe('CUSTOM_ERROR_CODE');
    });

    it('应该返回 undefined（当 response.data.code 不存在时）', () => {
      const mockResponse = {
        data: {
          message: '错误消息',
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', 'ECONNABORTED', {} as any, {}, mockResponse);
      const result = getErrorCode(error);

      expect(result).toBeUndefined();
    });

    it('应该返回 undefined（当错误不是 AxiosError 时）', () => {
      const error = new Error('普通错误');
      const result = getErrorCode(error);

      expect(result).toBeUndefined();
    });
  });

  describe('getErrorCode - 边界条件测试', () => {
    it('应该处理空字符串错误代码', () => {
      const mockResponse = {
        data: {
          code: '',
          message: '错误消息',
        } as ApiErrorResponse,
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorCode(error);

      expect(result).toBe('');
    });

    it('应该处理数字类型的错误代码（如果存在）', () => {
      const mockResponse = {
        data: {
          code: '404',
          message: '错误消息',
        } as ApiErrorResponse,
        status: 404,
        statusText: 'Not Found',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('', '', {} as any, {}, mockResponse);
      const result = getErrorCode(error);

      expect(result).toBe('404');
    });
  });

  // ==================== isAxiosError 函数测试 ====================

  describe('isAxiosError - 正常功能测试', () => {
    it('应该正确识别 AxiosError 实例', () => {
      const mockResponse = {
        data: {},
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', 'ECONNABORTED', {} as any, {}, mockResponse);
      const result = isAxiosError(error);

      expect(result).toBe(true);
    });

    it('应该正确识别普通 Error 实例（不是 AxiosError）', () => {
      const error = new Error('普通错误');
      const result = isAxiosError(error);

      expect(result).toBe(false);
    });

    it('应该正确识别字符串（不是 AxiosError）', () => {
      const error = '字符串错误';
      const result = isAxiosError(error);

      expect(result).toBe(false);
    });

    it('应该正确识别 null（不是 AxiosError）', () => {
      const result = isAxiosError(null);

      expect(result).toBe(false);
    });

    it('应该正确识别 undefined（不是 AxiosError）', () => {
      const result = isAxiosError(undefined);

      expect(result).toBe(false);
    });
  });

  describe('isAxiosError - Type Guard 功能测试', () => {
    it('应该作为类型守卫使用（TypeScript 类型缩小）', () => {
      const mockResponse = {
        data: {},
        status: 400,
        statusText: 'Bad Request',
        headers: {},
        config: {} as any,
      };
      const unknownError: unknown = new AxiosError('Request failed', 'ECONNABORTED', {} as any, {}, mockResponse);

      if (isAxiosError(unknownError)) {
        // TypeScript 应该知道 unknownError 在这里是 AxiosError<ApiErrorResponse> 类型
        expect(unknownError.response).toBeDefined();
        expect(unknownError.config).toBeDefined();
      } else {
        expect.fail('应该识别为 AxiosError');
      }
    });
  });

  // ==================== 集成测试 ====================

  describe('集成测试 - 真实场景模拟', () => {
    it('应该处理完整的 API 错误响应（包含 code 和 message）', () => {
      const mockResponse = {
        data: {
          code: 'VALIDATION_ERROR',
          message: '输入验证失败',
          errors: {
            email: ['邮箱格式不正确'],
            password: ['密码长度不足'],
          },
        } as ApiErrorResponse,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', 'ECONNABORTED', {} as any, {}, mockResponse);

      expect(isAxiosError(error)).toBe(true);
      expect(getErrorCode(error)).toBe('VALIDATION_ERROR');
      expect(getErrorMessage(error)).toBe('输入验证失败');
    });

    it('应该处理网络错误（没有 response）', () => {
      const error = new AxiosError('Network Error', 'ERR_NETWORK', {} as any, {});
      // @ts-ignore - 模拟网络错误，没有 response
      error.response = undefined;

      expect(isAxiosError(error)).toBe(true);
      expect(getErrorCode(error)).toBeUndefined();
      expect(getErrorMessage(error)).toBe('Network Error');
    });

    it('应该处理服务器返回的 HTML 错误页面（不是 JSON）', () => {
      const mockResponse = {
        data: '<html><body>500 Internal Server Error</body></html>',
        status: 500,
        statusText: 'Internal Server Error',
        headers: { 'content-type': 'text/html' },
        config: {} as any,
      };

      const error = new AxiosError('Request failed', '', {} as any, {}, mockResponse);

      // 当 data 不是对象时，会使用 error.message
      expect(getErrorMessage(error)).toBe('Request failed');
    });

    it('应该处理超时错误', () => {
      const error = new AxiosError('timeout of 5000ms exceeded', 'ECONNABORTED', {} as any, {});

      expect(isAxiosError(error)).toBe(true);
      expect(getErrorMessage(error)).toBe('timeout of 5000ms exceeded');
    });

    it('应该处理 401 未授权错误', () => {
      const mockResponse = {
        data: {
          code: 'UNAUTHORIZED',
          message: '令牌已过期',
        } as ApiErrorResponse,
        status: 401,
        statusText: 'Unauthorized',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', '', {} as any, {}, mockResponse);

      expect(getErrorCode(error)).toBe('UNAUTHORIZED');
      expect(getErrorMessage(error)).toBe('令牌已过期');
    });

    it('应该处理 500 服务器错误', () => {
      const mockResponse = {
        data: {
          code: 'INTERNAL_SERVER_ERROR',
          message: '服务器内部错误',
        } as ApiErrorResponse,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config: {} as any,
      };

      const error = new AxiosError('Request failed', '', {} as any, {}, mockResponse);

      expect(getErrorCode(error)).toBe('INTERNAL_SERVER_ERROR');
      expect(getErrorMessage(error)).toBe('服务器内部错误');
    });
  });

  // ==================== 性能测试（可选） ====================

  describe('性能测试', () => {
    it('应该快速处理大量错误对象', () => {
      const startTime = performance.now();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const error = new Error(`错误 ${i}`);
        getErrorMessage(error);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // 1000 次操作应该在 100ms 内完成（平均每次 < 0.1ms）
      expect(duration).toBeLessThan(100);
    });
  });
});
