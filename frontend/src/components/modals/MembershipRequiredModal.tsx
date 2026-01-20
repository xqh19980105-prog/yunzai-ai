'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PricingModal } from './PricingModal';
import { ActivationInput } from '@/components/ActivationInput';
import { CreditCard, Key, AlertCircle } from 'lucide-react';
import { getSystemConfig } from '@/lib/api/system-config';
import { useAuthStore } from '@/stores/auth-store';
import api from '@/lib/api/axios';
import { cn } from '@/lib/utils';

interface MembershipRequiredModalProps {
  open: boolean;
  onClose: () => void;
}

export function MembershipRequiredModal({ open, onClose }: MembershipRequiredModalProps) {
  const [packages, setPackages] = useState<any[]>([]);
  const [buyLink, setBuyLink] = useState<string>('');
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'activation' | 'purchase'>('activation');
  const { user, setUser } = useAuthStore();

  // Load system config for buy link and packages
  useEffect(() => {
    if (!open) return;
    
    const loadConfig = async () => {
      try {
        const config = await getSystemConfig();
        if (config.buy_link) {
          setBuyLink(config.buy_link);
        } else if (config.pricing?.buyLink) {
          setBuyLink(config.pricing.buyLink);
        }
        if (config.packages && Array.isArray(config.packages)) {
          setPackages(config.packages);
        }
      } catch (error) {
        console.error('Failed to load system config:', error);
      }
    };
    loadConfig();
  }, [open]);

  const handleActivationSuccess = async () => {
    // Refresh user data after activation
    try {
      const response = await api.post('/api/auth/me');
      setUser(response.data);
      // Check if user is now a member
      const isMember = response.data.membershipExpireAt && 
        new Date(response.data.membershipExpireAt) > new Date();
      if (isMember) {
        onClose();
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-orange-500" />
              <DialogTitle className="text-xl">需要会员权限</DialogTitle>
            </div>
            <DialogDescription>
              您还不是会员，请购买会员或使用激活码激活以使用工具功能
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tab Buttons */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setActiveTab('activation')}
                className={cn(
                  'flex-1 py-3 px-4 text-center font-medium transition-colors border-b-2',
                  activeTab === 'activation'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <Key className="w-4 h-4" />
                  激活码激活
                </div>
              </button>
              <button
                onClick={() => setActiveTab('purchase')}
                className={cn(
                  'flex-1 py-3 px-4 text-center font-medium transition-colors border-b-2',
                  activeTab === 'purchase'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                )}
              >
                <div className="flex items-center justify-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  购买会员
                </div>
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'activation' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm text-blue-800">
                    如果您有激活码，请在下方输入以激活会员功能
                  </p>
                </div>
                <ActivationInput onSuccess={handleActivationSuccess} />
              </div>
            )}

            {activeTab === 'purchase' && (
              <div className="space-y-4">
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <p className="text-sm text-green-800 mb-3">
                    选择套餐购买会员，立即解锁所有功能
                  </p>
                  <Button
                    onClick={() => setShowPricingModal(true)}
                    className="w-full rounded-full"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    查看套餐并购买
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <PricingModal
        open={showPricingModal}
        onOpenChange={setShowPricingModal}
        packages={packages}
        buyLink={buyLink}
      />
    </>
  );
}
