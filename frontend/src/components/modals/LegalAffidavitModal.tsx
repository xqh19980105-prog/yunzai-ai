'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, X } from 'lucide-react';
import api from '@/lib/api/axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface LegalAffidavitModalProps {
  open: boolean;
  onComplete: () => void;
  onCancel?: () => void; // 允许关闭但不完成
}

const REQUIRED_TEXT = '我承诺合法使用';

export function LegalAffidavitModal({ open, onComplete, onCancel }: LegalAffidavitModalProps) {
  const [signature, setSignature] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, setUser } = useAuthStore();

  const isValid = signature.trim() === REQUIRED_TEXT;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isValid || !user) return;

    setLoading(true);
    try {
      // Get user's IP (simplified, in production use a proper method)
      const ip = await fetch('https://api.ipify.org?format=json')
        .then(res => res.json())
        .then(data => data.ip)
        .catch(() => 'unknown');

      // Call API to save LegalLog and update is_legal_signed
      await api.post('/api/legal/sign', {
        signatureText: signature,
        ip: ip || 'unknown',
        userAgent: navigator.userAgent,
      });

      // Update user state
      setUser({
        ...user,
        isLegalSigned: true,
      });

      toast.success('法律声明已确认');
      onComplete();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '提交失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop blur */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      
      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-8 w-8 text-primary" />
            <h2 className="text-2xl font-bold">法律声明确认</h2>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
              aria-label="关闭"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        <div className="space-y-6 mb-8">
          <div className="bg-gray-50 rounded-xl p-6 space-y-4">
            <div>
              <h3 className="font-semibold mb-2">使用承诺</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                在使用本服务前，您必须明确承诺将合法、合规地使用本平台提供的所有功能。
                您需对使用本服务产生的所有内容承担完全责任，并保证不会利用本服务进行任何
                侵犯版权、知识产权或违反法律法规的行为。
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">责任声明</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                如因您的使用行为导致任何法律纠纷或损失，您将承担全部法律责任。
                平台不对您的使用行为及其产生的后果承担任何责任。
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="signature" className="block text-sm font-medium mb-2">
              请手动输入以下文字以确认您已阅读并同意：
            </label>
            <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 mb-3">
              <p className="text-lg font-mono text-center text-primary">
                {REQUIRED_TEXT}
              </p>
            </div>
            <input
              id="signature"
              type="text"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="请在此输入上述文字"
              className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg"
              autoFocus
            />
            {signature && !isValid && (
              <p className="text-sm text-red-500 mt-2 text-center">
                输入的文字不匹配，请仔细核对
              </p>
            )}
            {isValid && (
              <p className="text-sm text-green-500 mt-2 text-center">
                ✓ 输入正确
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <Button
            type="submit"
            disabled={!isValid || loading}
            className="w-full rounded-full h-12 text-lg"
          >
            {loading ? '提交中...' : '确认并提交'}
          </Button>
        </form>
        
        <p className="text-xs text-gray-500 text-center mt-3">
          提示：关闭后您将无法使用任何工具，直到完成法律声明确认
        </p>
      </div>
    </div>
  );
}
