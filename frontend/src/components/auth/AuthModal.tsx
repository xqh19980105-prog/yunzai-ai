'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Dialog, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { AuthForm } from './AuthForm';
import { HomePage } from '@/components/pages/HomePage';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuthModalProps {
  defaultMode?: 'login' | 'register';
  isAdmin?: boolean;
}

export function AuthModal({ defaultMode = 'login', isAdmin = false }: AuthModalProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'login' | 'register'>(defaultMode);

  // 从URL参数中读取模式（如果有）
  useEffect(() => {
    const urlMode = searchParams.get('mode');
    if (urlMode === 'register' || urlMode === 'login') {
      setMode(urlMode);
    }
  }, [searchParams]);

  // 关闭模态框，返回首页
  const handleClose = (open: boolean) => {
    if (!open) {
      setOpen(false);
      router.push('/');
    }
  };

  // 切换登录/注册模式
  const handleModeSwitch = (newMode: 'login' | 'register') => {
    setMode(newMode);
    // 更新URL参数
    const newUrl = new URL(window.location.href);
    newUrl.searchParams.set('mode', newMode);
    router.push(newUrl.pathname + newUrl.search, { scroll: false });
  };

  return (
    <>
      {/* 背景：显示主页面（虚化） */}
      <div className="fixed inset-0 z-40 overflow-auto">
        <div className="backdrop-blur-md bg-white/70">
          <HomePage />
        </div>
      </div>

      {/* 登录/注册模态框 - 使用自定义Portal，不显示默认Overlay */}
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          {/* 自定义背景层 - 半透明遮罩，增强虚化效果 */}
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm" />
          
          {/* 模态框内容 */}
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-[60] grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white/95 backdrop-blur-md p-6 shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-2xl',
            )}
            onPointerDownOutside={(e) => {
              // 允许点击外部关闭
              handleClose(false);
            }}
            onEscapeKeyDown={() => handleClose(false)}
          >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              {mode === 'register' ? '注册' : (isAdmin ? '管理员登录' : '登录')}
            </DialogTitle>
            <DialogDescription className="text-center">
              {mode === 'register'
                ? '创建您的芸仔AI账户'
                : isAdmin
                ? '登录管理员后台，管理系统配置和用户'
                : '登录您的芸仔AI账户'}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            <AuthForm
              mode={mode}
              isAdmin={isAdmin}
              inModal={true}
            />
          </div>

          {/* 切换登录/注册按钮 */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            {mode === 'login' ? (
              <div className="text-center text-sm text-gray-600">
                还没有账户？{' '}
                <button
                  onClick={() => handleModeSwitch('register')}
                  className="text-primary hover:underline font-medium"
                >
                  立即注册
                </button>
              </div>
            ) : (
              <div className="text-center text-sm text-gray-600">
                已有账户？{' '}
                <button
                  onClick={() => handleModeSwitch('login')}
                  className="text-primary hover:underline font-medium"
                >
                  立即登录
                </button>
              </div>
            )}
          </div>
          
          {/* 关闭按钮 */}
          <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </Dialog>
    </>
  );
}
