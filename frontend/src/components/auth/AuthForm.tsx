'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/lib/api/axios';
import { useAuthStore } from '@/stores/auth-store';
import { useErrorModalStore } from '@/stores/error-modal-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Turnstile } from '@/components/Turnstile';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { getErrorMessage } from '@/lib/utils/error-handler';
import { AlertCircle, X } from 'lucide-react';
import { generateFingerprintHash } from '@/lib/utils/browser-fingerprint';
import { loginSchema, registerSchema, type LoginFormData, type RegisterFormData } from '@/lib/validations/auth.schema';

// 记住邮箱（⚠️ 安全：仅记住邮箱，不存储密码）
const REMEMBERED_EMAIL_KEY = 'remembered-email';
const REMEMBER_CREDENTIALS_KEY = 'remember-credentials-enabled';
const REMEMBER_POLICY_AGREED_KEY = 'remember-policy-agreed';

export interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
}

interface AuthFormProps {
  mode: 'login' | 'register';
  onSubmit?: (data: AuthFormData) => Promise<void>;
  title?: string;
  description?: string;
  isAdmin?: boolean;
  inModal?: boolean; // 是否在模态框中使用
}

export function AuthForm({ mode, onSubmit, title, description, isAdmin = false, inModal = false }: AuthFormProps) {
  const router = useRouter();
  const { setUser, setAccessToken, setAuth, user, accessToken } = useAuthStore();
  const { networkError, setNetworkError } = useErrorModalStore();
  const [loading, setLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [rememberPassword, setRememberPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isCheckingAutoLogin, setIsCheckingAutoLogin] = useState(true);

  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
  const isRegisterMode = mode === 'register';

  // ✅ 使用react-hook-form进行表单管理
  const schema = isRegisterMode ? registerSchema : loginSchema;
  const {
    register,
    handleSubmit: handleFormSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LoginFormData | RegisterFormData>({
    resolver: zodResolver(schema),
    mode: 'onBlur', // 失焦时验证
  });

  const email = watch('email') || '';
  const password = watch('password') || '';
  const confirmPassword = watch('confirmPassword') || '';

  // Load remembered email and check auto-login on mount
  useEffect(() => {
    if (isRegisterMode) {
      setIsCheckingAutoLogin(false);
      return;
    }

    const checkAutoLogin = async () => {
      // Check if user is already logged in (from zustand store)
      if (user && accessToken) {
        // User is already logged in, redirect
        if (isAdmin) {
          router.push('/admin');
        } else {
          router.push('/');
        }
        setIsCheckingAutoLogin(false);
        return;
      }

      // Check if there's a valid token in localStorage
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        try {
          // Try to validate token by calling /api/auth/me
          // Note: axios interceptor will automatically add Authorization header
          const response = await api.post('/api/auth/me');

          // Token is valid, auto-login
          const userData = response.data;
          // 使用原子操作同时设置用户和token，确保状态一致性
          setAuth(userData, storedToken);
          
          // 等待状态同步完成
          await new Promise(resolve => setTimeout(resolve, 100));
          
          toast.success('自动登录成功！');
          
          if (isAdmin) {
            router.push('/admin');
          } else {
            router.push('/');
          }
          setIsCheckingAutoLogin(false);
          return;
        } catch (error) {
          // Token is invalid, clear it
          localStorage.removeItem('accessToken');
          localStorage.removeItem('auth-storage');
        }
      }

      // Load remembered email (only email, no password for security)
      const rememberedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      const rememberCredentialsEnabled = localStorage.getItem(REMEMBER_CREDENTIALS_KEY) === 'true';
      const rememberPolicyAgreed = localStorage.getItem(REMEMBER_POLICY_AGREED_KEY) === 'true';

      // 记住邮箱：自动填充 + 自动勾选政策（仅当用户之前选择了"一键登录"）
      if (rememberCredentialsEnabled) {
        if (rememberedEmail) setValue('email', rememberedEmail);
        setRememberPassword(true);
        if (rememberPolicyAgreed) setAgreed(true);

        // 自动聚焦密码输入框
        setTimeout(() => {
          const passwordInput = document.getElementById('password') as HTMLInputElement;
          if (passwordInput) passwordInput.focus();
        }, 100);
      }

      setIsCheckingAutoLogin(false);
    };

    checkAutoLogin();
  }, [isRegisterMode, user, accessToken, isAdmin, router, setUser, setAccessToken]);

  // ✅ 使用react-hook-form的handleSubmit，zod会自动验证
  const onSubmitForm = async (data: LoginFormData | RegisterFormData) => {
    // 额外的业务逻辑验证
    if (!agreed) {
      toast.error('请先勾选同意单账户政策');
      return;
    }

    // Turnstile 验证是可选的，只有在配置了 siteKey 时才需要验证
    if (turnstileSiteKey && !turnstileToken) {
      toast.error('请先完成人机验证（Turnstile）');
      return;
    }

    setLoading(true);

    try {
      // Use custom onSubmit if provided, otherwise use default behavior
      if (onSubmit) {
        await onSubmit({
          email: data.email,
          password: data.password,
          confirmPassword: isRegisterMode ? (data as RegisterFormData).confirmPassword : undefined,
        });
      } else {
        await handleDefaultSubmit(data);
      }
    } catch (error) {
      // Error handling for custom onSubmit
      if (isRegisterMode) {
        toast.error(getErrorMessage(error) || '注册失败，请重试');
      } else {
        // 登录错误：显示具体的错误消息（如"邮箱或密码错误"）
        // axios 拦截器已经对登录API的401错误进行了静默处理，不会显示"登录过期"
        const errorMessage = getErrorMessage(error);
        // 排除"登录过期"相关的消息，只显示业务错误（如密码错误）
        if (errorMessage && 
            !errorMessage.includes('登录过期') && 
            !errorMessage.includes('SESSION_EXPIRED') &&
            !errorMessage.includes('401')) {
          toast.error(errorMessage || '登录失败，请重试');
        }
      }
      console.error(`${mode} failed:`, error);
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDefaultSubmit = async (data: LoginFormData | RegisterFormData) => {
    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    
    // Support username-only login: if input doesn't contain @, append @admin.com
    // This allows users to login with just "123456" instead of "123456@admin.com"
    let loginEmail = data.email;
    if (!isRegisterMode && !data.email.includes('@')) {
      loginEmail = `${data.email}@admin.com`;
    }
    
    // Generate enhanced browser fingerprint (hardware-based, most reliable for device identification)
    const browserFingerprint = generateFingerprintHash();
    
    console.log('发送登录请求:', {
      endpoint,
      email: loginEmail,
      originalEmail: data.email,
      hasPassword: !!data.password,
      hasTurnstileToken: !!turnstileToken,
      hasBrowserFingerprint: !!browserFingerprint,
    });

    try {
      const response = await api.post(endpoint, {
        email: loginEmail,
        password: data.password,
        turnstileToken,
        browserFingerprint, // Send enhanced browser fingerprint for reliable device identification
      });

      console.log('登录成功:', response.data);

      const { accessToken: token, user: userData } = response.data;
      
      // 先保存到 localStorage，确保持久化
      localStorage.setItem('accessToken', token);
      
      // 使用原子操作同时更新 user 和 token
      setAuth(userData, token);
      
      // 等待状态同步完成（确保 zustand persist 写入完成）
      await new Promise(resolve => setTimeout(resolve, 150));

      // Handle "Remember Credentials" - save email only (no password for security)
      if (!isRegisterMode && rememberPassword) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, data.email);
        localStorage.setItem(REMEMBER_CREDENTIALS_KEY, 'true');
        localStorage.setItem(REMEMBER_POLICY_AGREED_KEY, agreed ? 'true' : 'false');
      } else if (!isRegisterMode && !rememberPassword) {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        localStorage.removeItem(REMEMBER_CREDENTIALS_KEY);
        localStorage.removeItem(REMEMBER_POLICY_AGREED_KEY);
      }

      if (isRegisterMode) {
        toast.success('注册成功！');
        router.push('/');
      } else if (isAdmin) {
        // 管理员登录后跳转到管理面板
        toast.success('登录成功！');
        router.push('/admin');
      } else {
        // 普通用户登录后跳转到首页
        toast.success('登录成功！');
        router.push('/');
      }
    } catch (error: any) {
      console.error('登录请求失败:', error);
      // 错误会在 axios 拦截器中处理，这里只记录日志
      throw error;
    }
  };

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token);
  };

  const handleTurnstileError = () => {
    setTurnstileToken(null);
  };

  const defaultTitle = isRegisterMode ? '注册' : (isAdmin ? '管理员登录' : '登录');
  const defaultDescription = isRegisterMode
    ? '创建您的芸仔AI账户'
    : (isAdmin ? '登录管理员后台，管理系统配置和用户' : '登录您的芸仔AI账户');
  
  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;
  const submitButtonText = loading
    ? isRegisterMode
      ? '注册中...'
      : '登录中...'
    : displayTitle;

  // Show loading state while checking auto-login
  if (isCheckingAutoLogin && !inModal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
        <div className="text-center">
          <p className="text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  // 如果在模态框中，不显示Card包装
  const formContent = (
    <>
      {/* Network Error Banner */}
      {networkError && (
        <div className="bg-white rounded-xl p-4 shadow-soft border border-red-200 flex items-center gap-3 mb-4">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-gray-800 flex-1">{networkError}</span>
          <button
            onClick={() => setNetworkError(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
            aria-label="关闭错误提示"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      
      <form onSubmit={handleFormSubmit(onSubmitForm)} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                {isAdmin ? '用户名或邮箱' : '邮箱'}
              </label>
              <input
                id="email"
                type={isAdmin ? "text" : "email"}
                {...register('email')}
                placeholder={isAdmin ? "输入用户名（如：123456）或完整邮箱" : "输入邮箱地址"}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
              {isAdmin && !email.includes('@') && email.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  提示：输入用户名将自动补全为 {email}@admin.com
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1">
                密码
              </label>
              <input
                id="password"
                type="password"
                {...register('password')}
                className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                  errors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                }`}
              />
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
              {isRegisterMode && !errors.password && (
                <p className="text-xs text-gray-500 mt-1">密码长度至少8位</p>
              )}
            </div>

            {isRegisterMode && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-1">
                  确认密码
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register('confirmPassword')}
                  className={`w-full px-4 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary ${
                    (errors as { confirmPassword?: { message?: string } }).confirmPassword ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'
                  }`}
                />
                {(errors as { confirmPassword?: { message?: string } }).confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">{(errors as { confirmPassword?: { message?: string } }).confirmPassword?.message}</p>
                )}
              </div>
            )}

            {/* One-Account Policy Checkbox */}
            <div className="flex items-start gap-2">
              <Checkbox
                id="policy"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
                className="mt-1"
              />
              <label htmlFor="policy" className="text-sm text-gray-600 cursor-pointer">
                我已阅读并同意 <strong>一人一账户政策</strong>。我承诺仅使用一个账户，不会创建多个账户、共享账户或转让账户。
              </label>
            </div>

            {/* Remember Email Checkbox (only for login mode, no password storage for security) */}
            {!isRegisterMode && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="rememberPassword"
                  checked={rememberPassword}
                  onCheckedChange={(checked) => {
                    const v = checked === true;
                    setRememberPassword(v);
                  }}
                />
                <label htmlFor="rememberPassword" className="text-sm text-gray-600 cursor-pointer">
                  记住邮箱（下次自动填充）
                </label>
              </div>
            )}

            {/* Cloudflare Turnstile */}
            {turnstileSiteKey && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={turnstileSiteKey}
                  onVerify={handleTurnstileVerify}
                  onError={handleTurnstileError}
                />
              </div>
            )}

            <Button
              type="submit"
              className="w-full rounded-full"
              disabled={loading || !agreed || !!(turnstileSiteKey && !turnstileToken)}
            >
              {submitButtonText}
            </Button>
            
            {/* 按钮禁用时的提示 */}
            {(loading || !agreed || !!(turnstileSiteKey && !turnstileToken)) && (
              <div className="text-xs text-gray-500 mt-2 text-center">
                {loading && '正在处理中...'}
                {!loading && !agreed && '请先勾选同意单账户政策'}
                {!loading && agreed && turnstileSiteKey && !turnstileToken && '请先完成人机验证'}
              </div>
            )}

          </form>
    </>
  );

  // 如果在模态框中，只返回表单内容
  if (inModal) {
    return formContent;
  }

  // 否则返回完整页面布局
  return (
    <div className="min-h-screen flex items-center justify-center bg-background-secondary p-4">
      <div className="w-full max-w-md space-y-4">
        <Card className="w-full rounded-2xl shadow-soft">
          <CardHeader>
            <CardTitle className="text-2xl text-center">{displayTitle}</CardTitle>
            <CardDescription className="text-center">{displayDescription}</CardDescription>
          </CardHeader>
          <CardContent>
            {formContent}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
