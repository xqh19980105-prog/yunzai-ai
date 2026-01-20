'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { UserHeader } from '@/components/layout/UserHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ApiKeyModal } from '@/components/modals/ApiKeyModal';
import { PricingModal } from '@/components/modals/PricingModal';
import { ActivationInput } from '@/components/ActivationInput';
import { Key, CreditCard, BadgeCheck, Settings as SettingsIcon, LogOut } from 'lucide-react';
import api from '@/lib/api/axios';
import { getSystemConfig } from '@/lib/api/system-config';

export default function SettingsPage() {
  const router = useRouter();
  const { user, setUser, logout } = useAuthStore();
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [packages, setPackages] = useState<any[]>([]);
  const [buyLink, setBuyLink] = useState<string>('');

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/login');
    }
  }, [user, router]);

  // Load system config for buy link and packages
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getSystemConfig();
        // Try to get buy link from system config
        if (config.buy_link) {
          setBuyLink(config.buy_link);
        } else if (config.pricing?.buyLink) {
          setBuyLink(config.pricing.buyLink);
        }
        // Load packages if available
        if (config.packages && Array.isArray(config.packages)) {
          setPackages(config.packages);
        }
      } catch (error) {
        console.error('Failed to load system config:', error);
      }
    };
    loadConfig();
  }, []);

  // Refresh user data when page becomes visible (e.g., when user switches back to tab)
  useEffect(() => {
    const refreshUserData = async () => {
      try {
        const response = await api.post('/api/auth/me');
        setUser(response.data);
      } catch (error) {
        console.error('Failed to refresh user data:', error);
      }
    };

    // Refresh on mount
    refreshUserData();

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [setUser]);

  const handleActivationSuccess = async () => {
    // Refresh user data after activation
    try {
      const response = await api.post('/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  if (!user) {
    return null;
  }

  const isMember = user.membershipExpireAt && new Date(user.membershipExpireAt) > new Date();
  const daysRemaining = isMember
    ? Math.ceil((new Date(user.membershipExpireAt!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 0;

  return (
    <>
      <UserHeader />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <SettingsIcon className="w-8 h-8 text-primary" />
            账户设置
          </h1>
          <p className="text-gray-500 mt-2">管理您的API密钥、会员状态和账户信息</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* API Key Management */}
          <Card className="rounded-xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                API密钥管理
              </CardTitle>
              <CardDescription>设置您的API密钥以使用AI服务（请从中转站获取）</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() => setShowApiKeyModal(true)}
                className="w-full rounded-full"
                variant="outline"
              >
                <Key className="w-4 h-4 mr-2" />
                设置API密钥
              </Button>
            </CardContent>
          </Card>

          {/* Membership Status */}
          <Card className="rounded-xl shadow-soft">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-primary" />
                会员状态
              </CardTitle>
              <CardDescription>
                {isMember
                  ? `会员有效期至 ${new Date(user.membershipExpireAt!).toLocaleDateString('zh-CN')}`
                  : '您还不是会员'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {isMember ? (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-700">
                    <span className="font-semibold">剩余天数：</span>
                    {daysRemaining} 天
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
                  <p className="text-sm text-gray-600 mb-3">您还不是会员，请购买会员或使用激活码激活</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setShowPricingModal(true)}
                      className="flex-1 rounded-full"
                      size="sm"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      购买会员
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activation Code Input */}
          <Card className="rounded-xl shadow-soft md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BadgeCheck className="w-5 h-5 text-primary" />
                激活码激活
              </CardTitle>
              <CardDescription>如果您有激活码，可以在这里激活会员功能</CardDescription>
            </CardHeader>
            <CardContent>
              <ActivationInput onSuccess={handleActivationSuccess} />
            </CardContent>
          </Card>

          {/* Logout */}
          <Card className="rounded-xl shadow-soft md:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="w-5 h-5 text-red-600" />
                账户操作
              </CardTitle>
              <CardDescription>退出当前账户</CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full rounded-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <LogOut className="w-4 h-4 mr-2" />
                退出登录
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <ApiKeyModal open={showApiKeyModal} onOpenChange={setShowApiKeyModal} />
      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        packages={packages}
        buyLink={buyLink}
      />
    </>
  );
}
