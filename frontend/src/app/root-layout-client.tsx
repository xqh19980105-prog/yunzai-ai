'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getSystemConfig, SystemConfig } from '@/lib/api/system-config';
import { Watermark } from '@/components/Watermark';
import { KickOutModal } from '@/components/modals/KickOutModal';
import { KeyBalanceModal } from '@/components/modals/KeyBalanceModal';
import { AccountLockedModal } from '@/components/modals/AccountLockedModal';
import { LegalAffidavitModal } from '@/components/modals/LegalAffidavitModal';
import { MembershipRequiredModal } from '@/components/modals/MembershipRequiredModal';
import { DeviceWarningModal } from '@/components/modals/DeviceWarningModal';
import { useAuthStore } from '@/stores/auth-store';
import { useErrorModalStore } from '@/stores/error-modal-store';
import { setOrCreateMetaTag, injectScript, removeInjectedScripts } from '@/lib/utils/dom';
import { toast } from 'sonner';

/**
 * Inject SEO meta tags from site_info configuration
 */
function injectSEOMetaTags(siteInfo: NonNullable<SystemConfig['site_info']>): void {
  const { title, description, keywords } = siteInfo;

  if (title) {
    document.title = title;
    setOrCreateMetaTag({ property: 'og:title', content: title });
  }

  if (description) {
    setOrCreateMetaTag({ name: 'description', content: description });
    setOrCreateMetaTag({ property: 'og:description', content: description });
  }

  if (keywords) {
    setOrCreateMetaTag({ name: 'keywords', content: keywords });
  }
}

/**
 * Inject analytics scripts from scripts configuration
 */
function injectAnalyticsScripts(scripts: NonNullable<SystemConfig['scripts']>): void {
  const { head, body } = scripts;

  if (head) {
    injectScript(head, 'head');
  }

  if (body) {
    injectScript(body, 'body');
  }
}

export function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const user = useAuthStore((state) => state.user);
  const pathname = usePathname();
  const errorModalShowLegal = useErrorModalStore((state) => state.showLegalModal);
  const closeErrorLegalModal = useErrorModalStore((state) => state.closeLegalModal);
  const errorModalShowMembership = useErrorModalStore((state) => state.showMembershipModal);
  const closeErrorMembershipModal = useErrorModalStore((state) => state.closeMembershipModal);

  useEffect(() => {
    // 在登录页面和注册页面，清除旧的认证数据，避免触发不必要的错误
    const isLoginPage = pathname === '/admin/login' || pathname === '/login';
    const isRegisterPage = pathname === '/register';
    
    if (isLoginPage || isRegisterPage) {
      // 清除可能存在的旧 token，避免在登录页面触发 401 错误
      if (typeof window !== 'undefined') {
        const oldToken = localStorage.getItem('accessToken');
        if (oldToken) {
          // 清除旧的认证数据
          localStorage.removeItem('accessToken');
          localStorage.removeItem('auth-storage');
          useAuthStore.getState().logout();
        }
      }
      // 登录页面不需要加载系统配置，避免触发认证检查
      setConfig({});
      return;
    }

    // Fetch system config on mount (only for non-login pages)
    let cancelled = false;
    
    getSystemConfig()
      .then((config) => {
        if (!cancelled) {
          setConfig(config);
        }
      })
      .catch((error) => {
        // Silently handle config fetch errors
        // getSystemConfig already returns {} on error, so this is just for safety
        if (!cancelled) {
          console.error('Failed to load system config:', error);
          setConfig({}); // Set empty config to prevent undefined errors
        }
      });
    
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Inject SEO meta tags
  useEffect(() => {
    if (!config?.site_info) return;

    injectSEOMetaTags(config.site_info);
  }, [config?.site_info]);

  // Inject analytics scripts
  useEffect(() => {
    if (!config?.scripts) return;

    injectAnalyticsScripts(config.scripts);

    // Cleanup: Remove injected scripts on unmount
    return () => {
      removeInjectedScripts();
    };
  }, [config?.scripts]);

  // Step 2: The Gatekeeper - Global check for legal signature
  useEffect(() => {
    if (!user) return;

    const isMember = user.membershipExpireAt && new Date(user.membershipExpireAt) > new Date();
    const needsLegalSignature = isMember && !user.isLegalSigned;

    if (!needsLegalSignature) return;

    setShowLegalModal(true);
  }, [user]);

  // Also listen to error modal store for legal modal triggered from API errors
  useEffect(() => {
    if (errorModalShowLegal) {
      setShowLegalModal(true);
    }
  }, [errorModalShowLegal]);

  const handleLegalComplete = () => {
    setShowLegalModal(false);
    // Also close the error modal store state
    closeErrorLegalModal();
  };

  const handleLegalCancel = () => {
    // 允许关闭模态框，但用户仍然无法使用工具（后端会阻止）
    setShowLegalModal(false);
    // Also close the error modal store state
    closeErrorLegalModal();
    // 显示提示信息
    toast.warning('您已关闭法律声明窗口。在使用任何工具前，请先完成法律声明确认。', {
      duration: 5000,
    });
  };

  const handleMembershipClose = () => {
    closeErrorMembershipModal();
  };

  return (
    <>
      {children}
      {/* Watermark: Fixed overlay, pointer-events: none */}
      {config?.watermark_config?.enabled !== false && (
        <Watermark text={config?.watermark_config?.text} />
      )}
      {/* Error Modals */}
      <KickOutModal />
      <KeyBalanceModal />
      <AccountLockedModal />
      <DeviceWarningModal />
      {/* Legal Gatekeeper Modal */}
      <LegalAffidavitModal 
        open={showLegalModal} 
        onComplete={handleLegalComplete}
        onCancel={handleLegalCancel}
      />
      {/* Membership Required Modal */}
      <MembershipRequiredModal 
        open={errorModalShowMembership} 
        onClose={handleMembershipClose}
      />
    </>
  );
}
