'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api/axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getSystemConfig } from '@/lib/api/system-config';
import { useAuthStore } from '@/stores/auth-store';
import { AlertCircle, Search, User, LogOut, Settings, ChevronDown, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIDomain {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  isVisible: boolean;
  isMaintenance: boolean;
}

export function HomePage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [domains, setDomains] = useState<AIDomain[]>([]);
  const [filteredDomains, setFilteredDomains] = useState<AIDomain[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState<string>('');
  const [siteTitle, setSiteTitle] = useState<string>('芸仔AI');
  const [siteDescription, setSiteDescription] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch AI domains
    api
      .get<AIDomain[]>('/api/ai-domains')
      .then((response) => {
        if (response && response.data && Array.isArray(response.data)) {
          setDomains(response.data);
          setFilteredDomains(response.data);
        } else {
          setDomains([]);
          setFilteredDomains([]);
        }
      })
      .catch((error) => {
        console.error('Failed to fetch domains:', error);
        setDomains([]);
        setFilteredDomains([]);
      })
      .finally(() => {
        setLoading(false);
      });

    // Fetch system config
    getSystemConfig()
      .then((config) => {
        if (config && typeof config === 'object') {
          if (config.announcement && typeof config.announcement === 'string') {
            setAnnouncement(config.announcement);
          }
          if (config.site_info && typeof config.site_info === 'object') {
            if (config.site_info.title && typeof config.site_info.title === 'string') {
              setSiteTitle(config.site_info.title);
            }
            if (config.site_info.description && typeof config.site_info.description === 'string') {
              setSiteDescription(config.site_info.description);
            }
          }
        }
      })
      .catch((error) => {
        console.error('Failed to fetch system config:', error);
      });
  }, []);

  // 搜索过滤
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredDomains(domains);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredDomains(
        domains.filter(
          (domain) =>
            domain.title.toLowerCase().includes(query) ||
            (domain.description && domain.description.toLowerCase().includes(query))
        )
      );
    }
  }, [searchQuery, domains]);

  const handleCardClick = (domainId: string) => {
    router.push(`/chat/${domainId}`);
  };

  const handleLogout = async () => {
    await logout();
    setUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* 左上角 Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">{siteTitle}</span>
            </Link>

            {/* 中间搜索框 */}
            <div className="hidden md:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索 AI 工具..."
                  className={cn(
                    'w-full h-10 pl-10 pr-4 rounded-full',
                    'bg-gray-100 border border-gray-200',
                    'text-gray-900 placeholder:text-gray-400',
                    'focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20',
                    'transition-all duration-200'
                  )}
                />
              </div>
            </div>

            {/* 右上角登录/用户按钮 */}
            <div className="flex items-center gap-3">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  >
                    <User className="w-5 h-5 text-gray-600" />
                    <span className="hidden sm:block text-sm text-gray-700 max-w-[120px] truncate">
                      {user.email?.split('@')[0] || '用户'}
                    </span>
                    <ChevronDown className={cn(
                      'w-4 h-4 text-gray-500 transition-transform',
                      userMenuOpen && 'rotate-180'
                    )} />
                  </button>

                  {/* 用户下拉菜单 */}
                  {userMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setUserMenuOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-20">
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="w-4 h-4" />
                          设置
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          退出登录
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-full"
                    onClick={() => router.push('/login')}
                  >
                    登录
                  </Button>
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => router.push('/register')}
                  >
                    注册
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* 移动端搜索框 */}
          <div className="md:hidden pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索 AI 工具..."
                className={cn(
                  'w-full h-10 pl-10 pr-4 rounded-full',
                  'bg-gray-100 border border-gray-200',
                  'text-gray-900 placeholder:text-gray-400',
                  'focus:outline-none focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20',
                  'transition-all duration-200'
                )}
              />
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="container mx-auto px-4 py-8">
        {/* 公告 */}
        {announcement && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-soft">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-1">平台公告</h3>
                <p className="text-sm text-blue-800 whitespace-pre-wrap">{announcement}</p>
              </div>
            </div>
          </div>
        )}

        {/* 标题和描述 */}
        {(siteTitle || siteDescription) && (
          <div className="mb-8 text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
              AI 工具
            </h1>
            {siteDescription && (
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                {siteDescription}
              </p>
            )}
          </div>
        )}

        {/* 功能板块网格 */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Card key={i} className="aspect-square animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : filteredDomains.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-gray-300" />
            </div>
            {searchQuery ? (
              <>
                <p className="text-lg font-medium text-gray-700 mb-2">未找到匹配的工具</p>
                <p className="text-gray-500">尝试使用其他关键词搜索</p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-700 mb-2">暂无可用工具</p>
                <p className="text-gray-500">请联系管理员添加 AI 工具</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredDomains.map((domain) => (
              <Card
                key={domain.id}
                className={cn(
                  'relative aspect-square p-4 rounded-xl cursor-pointer',
                  'bg-white border border-gray-100 shadow-soft',
                  'hover:shadow-md hover:border-gray-200 hover:-translate-y-1',
                  'transition-all duration-200'
                )}
                onClick={() => handleCardClick(domain.id)}
              >
                {/* 维护中标识 */}
                {domain.isMaintenance && (
                  <div className="absolute top-2 right-2 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    维护中
                  </div>
                )}

                <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
                  {/* 图标 */}
                  {domain.icon ? (
                    <div className="text-4xl">{domain.icon}</div>
                  ) : (
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  
                  {/* 标题 */}
                  <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
                    {domain.title}
                  </h3>
                  
                  {/* 描述 */}
                  {domain.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">
                      {domain.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* 底部 */}
      <footer className="mt-16 py-6 border-t border-gray-100">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-400">
            © 2024 {siteTitle}. AI 生成的内容仅供参考。
          </p>
        </div>
      </footer>
    </div>
  );
}
