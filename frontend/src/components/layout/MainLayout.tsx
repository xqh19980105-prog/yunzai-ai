'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainLayoutProps {
  children: React.ReactNode;
  showSidebar?: boolean;
  currentDomainId?: string; // 当前功能板块ID，用于加载对应的历史记录
  className?: string;
}

export function MainLayout({ children, showSidebar = true, currentDomainId, className }: MainLayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!showSidebar) {
    return <main className={cn('min-h-screen', className)}>{children}</main>;
  }

  return (
    <div className="flex h-screen bg-background-secondary overflow-hidden">
      {/* 桌面端侧边栏 */}
      <div className="hidden md:block">
        <Sidebar currentDomainId={currentDomainId} />
      </div>

      {/* 移动端侧边栏遮罩 */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-fade-in"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 移动端侧边栏 */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 md:hidden',
          'transform transition-transform duration-300 ease-in-out',
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar currentDomainId={currentDomainId} />
      </div>

      {/* 主内容区 */}
      <main className={cn('flex-1 flex flex-col overflow-hidden', className)}>
        {/* 移动端顶部栏 */}
        <header className="md:hidden h-14 bg-white border-b border-border-light flex items-center px-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 -ml-2 text-foreground-secondary hover:text-foreground rounded-lg hover:bg-background-secondary transition-colors"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <span className="ml-3 text-lg font-semibold text-foreground">芸仔AI</span>
        </header>

        {/* 页面内容 */}
        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
