'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useErrorModalStore } from '@/stores/error-modal-store';
import { useAuthStore } from '@/stores/auth-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function KickOutModal() {
  const router = useRouter();
  const { isKickOutModalOpen, closeKickOutModal } = useErrorModalStore();
  const { logout } = useAuthStore();

  // 当弹窗打开时，自动清除所有认证数据
  useEffect(() => {
    if (isKickOutModalOpen) {
      // 清除所有认证相关的 localStorage 数据
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('auth-storage');
        // 清除 zustand persist 存储
        logout();
      }
    }
  }, [isKickOutModalOpen, logout]);

  const handleConfirm = () => {
    logout();
    closeKickOutModal();
    // 根据当前路径判断跳转到哪个登录页面
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isAdminPath = currentPath.startsWith('/admin');
    router.push(isAdminPath ? '/admin/login' : '/login');
  };

  return (
    <Dialog open={isKickOutModalOpen} onOpenChange={closeKickOutModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>需要重新登录</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>您的登录会话已失效，可能是由于以下原因：</p>
            <ul className="list-disc list-inside text-sm space-y-1 ml-2">
              <li>会话已超过有效期（7天未使用）</li>
              <li>服务器重启导致会话数据丢失</li>
              <li>您在其他设备或浏览器上登录了此账户</li>
              <li>出于安全考虑，系统要求重新验证身份</li>
            </ul>
            <p className="text-sm mt-2">请重新登录以继续使用。系统已尝试自动恢复会话，但需要您重新验证身份。</p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            前往登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
