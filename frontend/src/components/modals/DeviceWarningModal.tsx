'use client';

import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useErrorModalStore } from '@/stores/error-modal-store';

export function DeviceWarningModal() {
  const { deviceWarningCount, showDeviceWarning, closeDeviceWarning } = useErrorModalStore();

  if (!showDeviceWarning) return null;

  return (
    <Dialog open={showDeviceWarning} onOpenChange={closeDeviceWarning}>
      <DialogContent className="sm:max-w-md rounded-2xl border-2 border-yellow-500">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-yellow-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
            <DialogTitle className="text-xl text-yellow-700">设备数量警告</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            <p className="text-gray-700 mb-2">
              检测到您今日已在 <strong className="text-yellow-700">{deviceWarningCount} 台设备</strong> 上登录。
            </p>
            <p className="text-gray-600 text-sm">
              根据安全策略，24小时内最多允许5台设备登录。如果继续在新设备登录，您的账户将被锁定以保护资产安全。
            </p>
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end pt-4">
          <Button
            onClick={closeDeviceWarning}
            className="rounded-full bg-yellow-600 hover:bg-yellow-700 text-white"
          >
            我知道了
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
