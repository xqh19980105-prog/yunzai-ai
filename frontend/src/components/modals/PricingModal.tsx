'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StrictAgreementModal } from './StrictAgreementModal';
import { CreditCard } from 'lucide-react';

interface Package {
  id: string;
  name: string;
  price: number;
  days: number;
  description?: string;
}

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packages?: Package[];
  buyLink?: string;
}

export function PricingModal({ open, onOpenChange, packages = [], buyLink }: PricingModalProps) {
  const [showAgreement, setShowAgreement] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const handleBuyClick = (pkgId: string) => {
    setSelectedPackage(pkgId);
    setShowAgreement(true);
  };

  const handleAgreementConfirm = () => {
    setShowAgreement(false);
    // The external link is already opened in StrictAgreementModal
    // You can add additional logic here if needed
  };

  const handleAgreementCancel = () => {
    setShowAgreement(false);
    setSelectedPackage(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <CreditCard className="w-6 h-6 text-primary" />
              购买会员
            </DialogTitle>
            <DialogDescription>选择套餐，立即解锁所有功能</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className={`p-6 border-2 rounded-xl cursor-pointer transition-all ${
                  selectedPackage === pkg.id
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-primary/50'
                }`}
              >
                <div className="text-center space-y-3">
                  <h3 className="text-xl font-bold">{pkg.name}</h3>
                  <div className="text-3xl font-bold text-primary">
                    ¥{pkg.price}
                  </div>
                  <div className="text-sm text-gray-500">
                    {pkg.days} 天有效期
                  </div>
                  {pkg.description && (
                    <p className="text-sm text-gray-600">{pkg.description}</p>
                  )}
                  <Button
                    onClick={() => handleBuyClick(pkg.id)}
                    className="w-full rounded-full"
                  >
                    购买
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pre-Purchase Interceptor: The Death Warrant */}
      <StrictAgreementModal
        open={showAgreement}
        onConfirm={handleAgreementConfirm}
        onCancel={handleAgreementCancel}
        externalLink={buyLink || 'https://example.com/buy'}
      />
    </>
  );
}
