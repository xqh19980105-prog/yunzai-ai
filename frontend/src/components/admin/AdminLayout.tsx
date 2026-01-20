'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Settings,
  Workflow,
  Key,
  FileText,
  LogOut,
  Menu,
  X,
  Users,
  Server,
  History,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const menuItems = [
  { href: '/admin', label: '仪表板', icon: LayoutDashboard },
  { href: '/admin/users', label: '用户管理', icon: Users },
  { href: '/admin/relay', label: '中转站配置', icon: Server },
  { href: '/admin/workflow', label: '工作流编辑器', icon: Workflow },
  { href: '/admin/activation', label: '激活码工厂', icon: Key },
  { href: '/admin/legal', label: '法律CMS', icon: FileText },
  { href: '/admin/legal-logs', label: '法律日志', icon: History },
  { href: '/admin/config', label: '系统配置', icon: Settings },
];

// 检查是否是管理员邮箱
function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase().includes('admin');
}

// 从 localStorage 获取用户邮箱
function getEmailFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const storedAuth = localStorage.getItem('auth-storage');
    if (storedAuth) {
      const parsed = JSON.parse(storedAuth);
      if (parsed.state?.user?.email) {
        return parsed.state.user.email;
      }
    }
  } catch {
    // ignore
  }
  return null;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, accessToken, isHydrated } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authState, setAuthState] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'forbidden'>('loading');
  const [displayEmail, setDisplayEmail] = useState<string>('管理员');
  const [checkCount, setCheckCount] = useState(0);

  // Allow access to login page without authentication check
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (isLoginPage) {
      return;
    }

    const checkAuth = () => {
      // 获取 token
      const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null);
      
      // 没有 token，未登录
      if (!token) {
        setAuthState('unauthenticated');
        return;
      }

      // 有 token，检查用户信息
      // 优先使用 zustand store 中的用户信息
      let currentEmail: string | null | undefined = user?.email;
      
      // 如果 zustand 中没有，尝试从 localStorage 获取
      if (!currentEmail) {
        currentEmail = getEmailFromStorage();
      }

      // 如果有用户邮箱
      if (currentEmail) {
        setDisplayEmail(currentEmail);
        
        if (isAdminEmail(currentEmail)) {
          setAuthState('authenticated');
        } else {
          setAuthState('forbidden');
        }
        return;
      }

      // 有 token 但没有用户信息
      // 如果还没有水合完成，或者检查次数不够，继续等待
      if (!isHydrated || checkCount < 3) {
        setCheckCount(prev => prev + 1);
        return;
      }

      // 多次检查后仍然没有用户信息，但有 token
      // 可能是 token 有效但用户信息丢失，允许访问（让页面自己处理）
      setAuthState('authenticated');
    };

    // 初始检查
    checkAuth();

    // 如果还在加载中，设置定时器继续检查
    if (authState === 'loading' && checkCount < 5) {
      const timer = setTimeout(checkAuth, 200);
      return () => clearTimeout(timer);
    }
  }, [isLoginPage, user, accessToken, isHydrated, authState, checkCount]);

  // 登录页面直接渲染
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 加载中状态
  if (authState === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-gray-500">验证登录状态...</p>
        </div>
      </div>
    );
  }

  // 未登录
  if (authState === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">请先登录</h1>
          <p className="text-gray-500 mb-4">您需要登录才能访问管理面板</p>
          <Button onClick={() => router.push('/admin/login')} className="rounded-full">
            前往管理员登录
          </Button>
        </div>
      </div>
    );
  }

  // 无权限
  if (authState === 'forbidden') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">访问被拒绝</h1>
          <p className="text-gray-500">您没有权限访问管理面板</p>
          <p className="text-sm text-gray-400 mt-2">管理员邮箱需要包含 &quot;admin&quot;</p>
          <div className="mt-4 space-x-2">
            <Button variant="outline" onClick={() => {
              logout();
              router.push('/admin/login');
            }} className="rounded-full">
              重新登录
            </Button>
            <Button variant="outline" onClick={() => router.push('/')} className="rounded-full">
              返回首页
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background-secondary">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h1 className="text-xl font-bold">管理面板</h1>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Menu */}
          <nav className="flex-1 p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-gray-700 hover:bg-gray-100',
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200">
            <div className="mb-3 text-sm text-gray-600">
              <p className="font-medium">{displayEmail}</p>
            </div>
            <Button
              variant="outline"
              className="w-full rounded-full"
              onClick={() => {
                logout();
                router.push('/admin/login');
              }}
            >
              <LogOut className="w-4 h-4 mr-2" />
              退出登录
            </Button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Menu Button */}
        <div className="md:hidden p-4 border-b border-gray-200 bg-white">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
