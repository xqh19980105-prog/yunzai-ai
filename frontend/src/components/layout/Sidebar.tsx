'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api/axios';
import { 
  Settings, 
  LogOut, 
  ChevronLeft,
  ChevronRight,
  User,
  Sparkles,
  Plus,
  MessageSquare,
  Trash2,
  Home
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  className?: string;
  currentDomainId?: string; // 当前功能板块ID
}

interface ChatHistory {
  id: string;
  title: string;
  createdAt: string;
  domainId: string;
}

export function Sidebar({ className, currentDomainId }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);
  const [histories, setHistories] = useState<ChatHistory[]>([]);
  const [loading, setLoading] = useState(false);

  // 加载当前功能板块的历史对话
  useEffect(() => {
    if (!currentDomainId || !user) {
      setHistories([]);
      return;
    }

    setLoading(true);
    api.get<ChatHistory[]>(`/api/chat-histories?domainId=${currentDomainId}`)
      .then((response) => {
        if (response && response.data && Array.isArray(response.data)) {
          setHistories(response.data);
        } else {
          setHistories([]);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch chat histories:', error);
        setHistories([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [currentDomainId, user]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleNewChat = () => {
    if (currentDomainId) {
      router.push(`/chat/${currentDomainId}`);
    } else {
      router.push('/');
    }
  };

  const handleDeleteHistory = async (historyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    try {
      await api.delete(`/api/chat-histories/${historyId}`);
      setHistories(prev => prev.filter(h => h.id !== historyId));
    } catch (error) {
      console.error('Failed to delete history:', error);
    }
  };

  // 判断是否在首页
  const isHomePage = pathname === '/';
  // 判断是否在对话页面
  const isInChatPage = pathname.startsWith('/chat/');

  return (
    <aside
      className={cn(
        'h-full bg-white border-r border-border-light flex flex-col transition-all duration-300',
        collapsed ? 'w-[72px]' : 'w-64',
        className
      )}
    >
      {/* Logo区域 */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border-light">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-foreground">芸仔AI</span>
          </Link>
        )}
        {collapsed && (
          <Link href="/" className="mx-auto">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </Link>
        )}
      </div>

      {/* 新建对话按钮 */}
      <div className="p-3">
        <button
          onClick={handleNewChat}
          className={cn(
            'w-full flex items-center gap-3 px-4 py-3',
            'bg-primary text-white font-medium rounded-xl',
            'transition-all duration-200',
            'hover:bg-primary-600 hover:shadow-soft-md',
            'active:scale-[0.98]',
            collapsed && 'justify-center px-0'
          )}
        >
          <Plus className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>新建对话</span>}
        </button>
      </div>

      {/* 历史对话列表 */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto scrollbar-thin">
        {isInChatPage && currentDomainId ? (
          <>
            {!collapsed && (
              <div className="px-2 py-2 text-xs font-medium text-foreground-tertiary uppercase tracking-wider">
                历史对话
              </div>
            )}
            
            {loading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-10 bg-background-secondary rounded-lg animate-pulse" />
                ))}
              </div>
            ) : histories.length === 0 ? (
              <div className={cn(
                'text-center py-8 text-foreground-tertiary',
                collapsed && 'hidden'
              )}>
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">暂无对话记录</p>
              </div>
            ) : (
              <div className="space-y-1">
                {histories.map((history) => {
                  const isActive = pathname === `/chat/${currentDomainId}/${history.id}`;
                  
                  return (
                    <Link
                      key={history.id}
                      href={`/chat/${currentDomainId}/${history.id}`}
                      className={cn(
                        'group flex items-center gap-2 px-3 py-2.5 rounded-xl',
                        'transition-all duration-200',
                        isActive
                          ? 'bg-primary-50 text-primary'
                          : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground',
                        collapsed && 'justify-center px-2'
                      )}
                    >
                      <MessageSquare className={cn(
                        'w-4 h-4 flex-shrink-0',
                        isActive && 'text-primary'
                      )} />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate text-sm">
                            {history.title || '新对话'}
                          </span>
                          <button
                            onClick={(e) => handleDeleteHistory(history.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-foreground-tertiary hover:text-error rounded transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // 首页状态：显示返回首页按钮
          !isHomePage && (
            <Link
              href="/"
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-xl',
                'text-foreground-secondary hover:bg-background-secondary hover:text-foreground',
                'transition-all duration-200',
                collapsed && 'justify-center px-0'
              )}
            >
              <Home className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>返回首页</span>}
            </Link>
          )
        )}
      </nav>

      {/* 底部区域 */}
      <div className="border-t border-border-light p-3">
        {/* 设置按钮 */}
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl mb-2',
            'transition-all duration-200',
            pathname === '/settings'
              ? 'bg-primary-50 text-primary font-medium'
              : 'text-foreground-secondary hover:bg-background-secondary hover:text-foreground',
            collapsed && 'justify-center px-0'
          )}
        >
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span>设置</span>}
        </Link>

        {/* 用户信息 */}
        {user && (
          <div
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl',
              'bg-background-secondary',
              collapsed && 'justify-center px-2'
            )}
          >
            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.email?.split('@')[0] || '用户'}
                </p>
                <p className="text-xs text-foreground-tertiary truncate">
                  {user.membershipExpireAt && new Date(user.membershipExpireAt) > new Date()
                    ? '会员用户'
                    : '普通用户'}
                </p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="p-2 text-foreground-tertiary hover:text-error rounded-lg hover:bg-error-light transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* 未登录状态 */}
        {!user && (
          <div className={cn('space-y-2', collapsed && 'px-1')}>
            <button
              onClick={() => router.push('/login')}
              className={cn(
                'w-full flex items-center justify-center gap-2 px-4 py-2.5',
                'bg-primary text-white font-medium rounded-xl',
                'transition-all duration-200',
                'hover:bg-primary-600',
                collapsed && 'px-2'
              )}
            >
              {!collapsed && '登录'}
              {collapsed && <User className="w-5 h-5" />}
            </button>
          </div>
        )}

        {/* 折叠按钮 */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            'w-full flex items-center justify-center gap-2 px-4 py-2 mt-3',
            'text-foreground-tertiary rounded-lg',
            'transition-all duration-200',
            'hover:bg-background-secondary hover:text-foreground'
          )}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">收起侧边栏</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
