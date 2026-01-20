import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useErrorModalStore } from '@/stores/error-modal-store';
import { useAuthStore } from '@/stores/auth-store';
import { isBrowser } from '@/lib/utils/browser';

function safeDecodeJwtPayload(token: string | null): any | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    // base64url -> base64
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

// Create axios instance with retry configuration
const api: AxiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  timeout: 60000, // 增加到60秒，本地开发环境可能需要更长时间
  headers: {
    'Content-Type': 'application/json',
  },
  // 添加重试配置
  validateStatus: (status) => status < 500, // 只有5xx错误才重试
});

// 请求重试配置
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒

// Request interceptor: Add JWT token and retry logic
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (!isBrowser()) return config;

    const token = localStorage.getItem('accessToken');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // 添加重试计数器
    if (!(config as any).__retryCount) {
      (config as any).__retryCount = 0;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Handle device warning header from response
 */
function handleDeviceWarningHeader(headerValue: string | undefined): void {
  if (!headerValue || !isBrowser()) return;

  const match = headerValue.match(/YELLOW:(\d+)/);
  if (!match) return;

  const deviceCount = parseInt(match[1], 10);
  useErrorModalStore.getState().openDeviceWarning(deviceCount);
}

/**
 * Handle HTTP error responses based on status code
 */
function handleHttpError(
  status: number,
  data?: { code?: string; message?: string },
  context?: { url?: string; method?: string },
): void {
  if (!isBrowser()) return;

  // 获取当前路径
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isLoginPage = currentPath === '/admin/login' || currentPath === '/login';
  const isRegisterPage = currentPath === '/register';

  switch (status) {
    case 401: {
      // SSO Kick-out: Logged in elsewhere or session expired
      const errorMessage = data?.message || '';
      const errorCode = data?.code || '';
      
      // 检查是否是登录/注册API的401错误（这些API的401是正常的业务错误，不应该显示"登录过期"）
      const isAuthApi = context?.url?.includes('/api/auth/login') || 
                        context?.url?.includes('/api/auth/register');
      
      // 关键排查信息（方便定位是哪一个接口触发了强退）
      try {
        const token = localStorage.getItem('accessToken');
        const payload = safeDecodeJwtPayload(token);
        // eslint-disable-next-line no-console
        console.warn('[AUTH][401]', {
          path: currentPath,
          api: { url: context?.url, method: context?.method },
          server: data,
          tokenPresent: !!token,
          isAuthApi,
          tokenPayload: payload
            ? {
                userId: payload.userId,
                sessionId: payload.sessionId,
                exp: payload.exp,
                iat: payload.iat,
              }
            : null,
        });
      } catch {
        // ignore
      }
      
      // 如果在登录页面、注册页面或首页，不做任何处理
      // 因为这些页面本来就不需要认证，可能是旧的 token 触发的错误
      // 登录/注册API的401错误（如密码错误）也应该静默处理，让表单组件自己处理错误消息
      const isHomePage = currentPath === '/';
      if (isLoginPage || isRegisterPage || isAuthApi || isHomePage) {
        break;
      }
      
      // 在非登录页面遇到 401，清除所有认证数据
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('auth-storage');
        // 清除 zustand store
        useAuthStore.getState().logout();
      }
      
      // 检查是否是会话过期错误（通过 code 或 message）
      const isSessionExpired = errorCode === 'SESSION_EXPIRED' || errorMessage === 'SESSION_EXPIRED';
      
      if (isSessionExpired) {
        // 会话过期：显示 "账户已在其他地方登录" 弹窗
        useErrorModalStore.getState().openKickOutModal();
      } else {
        // 其他 401 错误，显示简单提示并重定向到登录页
        toast.error('登录已过期，请重新登录');
        // 延迟跳转，让用户看到提示
        setTimeout(() => {
          const isAdminPath = currentPath.startsWith('/admin');
          window.location.href = isAdminPath ? '/admin/login' : '/login';
        }, 1500);
      }
      break;
    }

    case 402:
    case 429:
      // Insufficient Balance or Rate Limit
      useErrorModalStore.getState().openKeyBalanceModal();
      break;

    case 403: {
      // Check if it's ASSET_PROTECTION
      const isAssetProtection = 
        data?.code === 'ASSET_PROTECTION_TRIGGERED' || 
        data?.message?.includes('ASSET_PROTECTION');
      
      // Check if it's LEGAL_GATE_BLOCKED
      const isLegalGateBlocked = 
        data?.code === 'LEGAL_GATE_BLOCKED' || 
        data?.message?.includes('法律声明');
      
      // Check if it's MEMBERSHIP_REQUIRED
      const isMembershipRequired = 
        data?.code === 'MEMBERSHIP_REQUIRED' || 
        data?.message?.includes('还不是会员') ||
        data?.message?.includes('购买会员');
      
      if (isAssetProtection) {
        useErrorModalStore.getState().openAccountLockedModal();
      } else if (isLegalGateBlocked) {
        // Trigger legal modal to show
        useErrorModalStore.getState().openLegalModal();
      } else if (isMembershipRequired) {
        // Trigger membership modal to show
        useErrorModalStore.getState().openMembershipModal();
      } else {
        toast.error(data?.message || '访问被拒绝');
      }
      break;
    }

    case 500:
      // Service Maintenance
      toast.error('服务维护中，请稍后再试');
      break;

    default: {
      // Show user-friendly error message
      const defaultMessage = data?.message || '请求失败，请稍后重试';
      toast.error(defaultMessage);
    }
  }
}

// Response interceptor: Global error handling with retry
api.interceptors.response.use(
  (response) => {
    const deviceWarningHeader = response.headers['x-device-warning'];
    handleDeviceWarningHeader(deviceWarningHeader);
    return response;
  },
  async (error: AxiosError<{ code?: string; message?: string }>) => {
    const config = error.config as InternalAxiosRequestConfig & { __retryCount?: number };
    
    // 网络错误或超时错误，且未达到最大重试次数
    if (
      (!error.response || error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') &&
      config &&
      (config.__retryCount || 0) < MAX_RETRIES
    ) {
      config.__retryCount = (config.__retryCount || 0) + 1;

      // Exponential backoff: 1s, 2s, 4s (using retryCount - 1 for 0-indexed power)
      const delay = RETRY_DELAY * Math.pow(2, (config.__retryCount - 1));
      
      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, delay));
      
      // 重试请求
      return api(config);
    }

    // Handle network errors (after retries exhausted)
    if (!error.response) {
      const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
      const isLoginPage = currentPath === '/admin/login' || currentPath === '/login';
      const isRegisterPage = currentPath === '/register';
      
      // On login/register pages, show persistent banner instead of just toast
      if (isLoginPage || isRegisterPage) {
        useErrorModalStore.getState().setNetworkError('网络错误');
      } else {
        toast.error('网络连接失败，请检查您的网络');
      }
      return Promise.reject(error);
    }

    // Handle HTTP errors
    const { status, data } = error.response;
    handleHttpError(status, data, {
      url: (error.config?.baseURL || '') + (error.config?.url || ''),
      method: error.config?.method,
    });

    return Promise.reject(error);
  },
);

export default api;
