'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, MessageSquare, Trash2, Home, Sparkles } from 'lucide-react';
import { formatConversationTime } from '@/lib/utils/date';
import { DeleteConversationDialog } from './DeleteConversationDialog';

interface ChatHistory {
  id: string;
  title: string;
  updatedAt: Date;
}

interface ChatSidebarProps {
  history: ChatHistory[];
  domainId: string;
  domainTitle?: string; // 当前功能板块标题
  onSelectHistory: (id: string) => void;
  onNewChat: () => void;
  onDeleteHistory: (id: string) => void;
  currentHistoryId?: string | null;
  deletingHistoryId?: string | null;
}

export function ChatSidebar({
  history,
  domainId,
  domainTitle,
  onSelectHistory,
  onNewChat,
  onDeleteHistory,
  currentHistoryId,
  deletingHistoryId,
}: ChatSidebarProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingDeleteTitle, setPendingDeleteTitle] = useState<string>('');

  const handleNewChat = () => {
    onNewChat();
  };

  const handleDeleteClick = (e: React.MouseEvent, item: ChatHistory) => {
    e.stopPropagation();
    setPendingDeleteId(item.id);
    setPendingDeleteTitle(item.title);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (pendingDeleteId) {
      onDeleteHistory(pendingDeleteId);
      setPendingDeleteId(null);
      setPendingDeleteTitle('');
    }
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* Logo 和返回首页 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <Link 
            href="/" 
            className="flex items-center gap-2 text-gray-700 hover:text-primary transition-colors"
          >
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold">芸仔AI</span>
          </Link>
        </div>

        {/* 当前功能板块标题 */}
        {domainTitle && (
          <div className="px-4 py-2 border-b border-gray-100">
            <p className="text-sm text-gray-500">当前工具</p>
            <p className="font-medium text-gray-900 truncate">{domainTitle}</p>
          </div>
        )}
        
        {/* 新建对话按钮 */}
        <div className="p-4 border-b border-gray-100">
          <Button 
            onClick={handleNewChat} 
            className="w-full h-9 rounded-full shadow-soft hover:shadow-md transition-all duration-200 text-sm font-medium" 
          >
            <Plus className="w-4 h-4 mr-2" />
            新建对话
          </Button>
        </div>

        {/* 历史对话列表 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <p className="text-xs text-gray-400 font-medium">历史记录</p>
          </div>
          {history.length === 0 ? (
            <div className="text-center text-gray-400 text-sm py-12 px-4">
              <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-gray-500">暂无对话历史</p>
            </div>
          ) : (
            <div className="px-2 pb-4 space-y-1">
              {history.map((item) => {
                const isDeleting = deletingHistoryId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`transition-all duration-300 ease-in-out ${
                      isDeleting
                        ? 'opacity-0 max-h-0 overflow-hidden mb-0'
                        : 'opacity-100 max-h-32 mb-1'
                    }`}
                  >
                    <button
                      onClick={() => !isDeleting && onSelectHistory(item.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl transition-all duration-200 group flex items-center justify-between ${
                        currentHistoryId === item.id
                          ? 'bg-primary/10 hover:bg-primary/15 border border-primary/20'
                          : 'hover:bg-gray-50 active:bg-gray-100 border border-transparent'
                      } ${isDeleting ? 'pointer-events-none' : 'cursor-pointer'}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${
                          currentHistoryId === item.id ? 'text-primary' : 'text-gray-900'
                        }`}>
                          {item.title}
                        </p>
                        <p className={`text-xs mt-1 ${
                          currentHistoryId === item.id ? 'text-primary/70' : 'text-gray-400'
                        }`}>
                          {formatConversationTime(new Date(item.updatedAt))}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDeleteClick(e, item)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 rounded-lg transition-all duration-200"
                        title="删除对话"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 底部返回首页按钮 */}
        <div className="p-4 border-t border-gray-100">
          <Link href="/">
            <Button 
              variant="outline" 
              className="w-full h-9 rounded-full text-sm font-medium"
            >
              <Home className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </Link>
        </div>
      </div>

      {/* 删除确认对话框 */}
      <DeleteConversationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        conversationTitle={pendingDeleteTitle}
      />
    </>
  );
}
