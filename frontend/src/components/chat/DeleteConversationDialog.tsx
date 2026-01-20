'use client';

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

interface DeleteConversationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  conversationTitle?: string;
}

export function DeleteConversationDialog({
  open,
  onOpenChange,
  onConfirm,
  conversationTitle,
}: DeleteConversationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-[16px] shadow-soft-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FFF1F0]">
              <AlertTriangle className="h-6 w-6 text-[#FF4D4F]" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-[#212121] leading-[24px]">删除对话</DialogTitle>
              <DialogDescription className="mt-1 text-[#737373] text-sm leading-[20px]">
                此操作无法撤销，确定要删除这个对话吗？
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {conversationTitle && (
          <div className="rounded-[12px] bg-[#FAFAFA] p-3 border border-[#F5F5F5]">
            <p className="text-sm text-[#525252] leading-[20px]">
              <span className="font-medium">对话标题：</span>
              <span className="ml-2">{conversationTitle}</span>
            </p>
          </div>
        )}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1 sm:flex-initial"
          >
            取消
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="flex-1 sm:flex-initial"
          >
            删除
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
