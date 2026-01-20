'use client';

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
import { AlertCircle } from 'lucide-react';

export function AccountLockedModal() {
  const router = useRouter();
  const { isAccountLockedModalOpen, closeAccountLockedModal } = useErrorModalStore();
  const { logout } = useAuthStore();

  const handleConfirm = () => {
    logout();
    closeAccountLockedModal();
    router.push('/login');
  };

  return (
    <Dialog open={isAccountLockedModalOpen} onOpenChange={closeAccountLockedModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <DialogTitle className="text-red-600">账户已锁定</DialogTitle>
          </div>
          <DialogDescription className="pt-2">
            由于安全保护机制，您的账户已被锁定。24 小时内检测到超过 5 台设备访问。
            请联系管理员解锁账户。
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={handleConfirm} variant="destructive" className="w-full">
            返回登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
