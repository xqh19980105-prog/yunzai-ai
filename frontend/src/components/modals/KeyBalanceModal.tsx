'use client';

import { useErrorModalStore } from '@/stores/error-modal-store';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function KeyBalanceModal() {
  const { isKeyBalanceModalOpen, closeKeyBalanceModal } = useErrorModalStore();

  return (
    <Dialog open={isKeyBalanceModalOpen} onOpenChange={closeKeyBalanceModal}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>余额不足</DialogTitle>
          <DialogDescription className="space-y-2">
            <p>
              您提供的第三方 API 密钥余额不足或请求频率过高。
            </p>
            <p className="text-sm text-gray-600">
              <strong>重要提示：</strong>本平台采用 BYOK（自带密钥）模式，您需要在第三方服务商（如云雾AI、OpenAI等）的账户中充值，而不是在本平台充值。
            </p>
            <p className="text-sm text-gray-600">
              请前往您使用的第三方服务商平台检查 API 密钥余额，或稍后再试。
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={closeKeyBalanceModal} className="w-full">
            我知道了
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
