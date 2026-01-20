'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface StrictAgreementModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  externalLink: string;
}

export function StrictAgreementModal({
  open,
  onConfirm,
  onCancel,
  externalLink,
}: StrictAgreementModalProps) {
  const [countdown, setCountdown] = useState(5);
  const [canConfirm, setCanConfirm] = useState(false);

  useEffect(() => {
    if (!open) {
      setCountdown(5);
      setCanConfirm(false);
      return;
    }

    // Countdown timer
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanConfirm(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open]);

  const handleConfirm = () => {
    if (canConfirm) {
      // Open external link in new window
      window.open(externalLink, '_blank', 'noopener,noreferrer');
      onConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onCancel}>
      <DialogContent className="sm:max-w-[500px] border-red-500 border-2">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <DialogTitle className="text-red-600 text-xl">严格协议确认</DialogTitle>
          </div>
          <DialogDescription className="pt-4 space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <div>
                <h4 className="font-semibold text-red-800 mb-2">一人一账户政策</h4>
                <p className="text-sm text-red-700">
                  每个用户仅允许拥有一个账户。禁止使用多个账户、共享账户或转让账户。
                  违反此政策将导致账户永久封禁。
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-red-800 mb-2">版权责任</h4>
                <p className="text-sm text-red-700">
                  用户需对使用本服务产生的所有内容承担完全责任。禁止使用本服务进行任何
                  侵犯版权、知识产权或违反法律法规的行为。违反者将承担全部法律责任。
                </p>
              </div>
            </div>
            <div className="text-center pt-2">
              {!canConfirm ? (
                <p className="text-lg font-semibold text-gray-600">
                  请仔细阅读协议，{countdown} 秒后可确认
                </p>
              ) : (
                <p className="text-lg font-semibold text-green-600">
                  已阅读完毕，可以确认
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            取消
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            {canConfirm ? '我承诺' : `等待 ${countdown} 秒`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
