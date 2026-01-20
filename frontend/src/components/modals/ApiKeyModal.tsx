'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api/axios';
import { toast } from 'sonner';
import { Key, Loader2, CheckCircle2, XCircle, TestTube, ExternalLink, Trash2 } from 'lucide-react';
import { apiKeySchema, type ApiKeyFormData } from '@/lib/validations/api-key.schema';

interface ApiKeyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApiKeyModal({ open, onOpenChange }: ApiKeyModalProps) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [apiKeyLink, setApiKeyLink] = useState<string | null>(null);
  const [relayName, setRelayName] = useState<string | null>(null);
  const [relayBaseUrl, setRelayBaseUrl] = useState<string | null>(null);
  const [isPlaceholder, setIsPlaceholder] = useState(false);

  // ✅ 使用react-hook-form进行表单管理
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ApiKeyFormData>({
    resolver: zodResolver(apiKeySchema),
    mode: 'onBlur',
    defaultValues: {
      apiKey: '',
      apiBaseUrl: '',
    },
  });

  const apiKey = watch('apiKey') || '';
  const apiBaseUrl = watch('apiBaseUrl') || '';

  // Load current API key status and active relay info
  useEffect(() => {
    if (open) {
      loadStatus();
      loadActiveRelay();
    }
  }, [open]);

  const loadStatus = async () => {
    try {
      const response = await api.get('/api/api-key/status');
      if (response.data.hasApiKey) {
        setStatus('success');
        setStatusMessage('已配置API密钥');
        // Don't show the actual key, just indicate it's set
        setValue('apiKey', '••••••••••••••••');
        setIsPlaceholder(true);
      } else {
        setStatus('idle');
        setStatusMessage('未配置API密钥');
        setValue('apiKey', '');
        setIsPlaceholder(false);
      }
    } catch (error) {
      console.error('Failed to load API key status:', error);
    }
  };

  const loadActiveRelay = async () => {
    try {
      const response = await api.get('/api/ai-domains/active-relay');
      setRelayName(response.data.name);
      setApiKeyLink(response.data.apiKeyLink);
      setRelayBaseUrl(response.data.baseUrl);
      // 同步管理员配置的基础URL，用于测试连接（不是apiKeyLink）
      if (response.data.baseUrl) {
        setValue('apiBaseUrl', response.data.baseUrl);
      }
    } catch (error) {
      console.error('Failed to load active relay:', error);
    }
  };

  // Clean API key: remove control characters (newlines, carriage returns, etc.)
  const cleanApiKey = (key: string): string => {
    return key
      .trim() // Remove leading/trailing whitespace
      .replace(/[\r\n\t]/g, '') // Remove newlines, carriage returns, tabs
      .replace(/[^\x20-\x7E]/g, ''); // Remove any non-printable ASCII characters
  };

  const handleTest = async () => {
    if (!relayBaseUrl) {
      toast.error('当前没有激活的中转站，无法测试连接');
      return;
    }

    // Check if apiKey is a placeholder (dots/bullets)
    // Common placeholder patterns: •••, ···, ●●●, or any repeated bullet characters
    // Only placeholders will use stored key, empty input requires user to enter key
    const trimmedKey = apiKey.trim();
    const isPlaceholder = trimmedKey && /^[•·●\u2022\u25CF\u00B7\s]+$/.test(trimmedKey) && trimmedKey.length <= 50;
    
    // If user has entered a new key, validate it
    if (trimmedKey && !isPlaceholder) {
      const cleanedKey = cleanApiKey(apiKey);
      if (!cleanedKey) {
        toast.error('API密钥格式无效，请检查是否包含无效字符');
        return;
      }
    } else if (!trimmedKey) {
      // If input is empty (user cleared it), require them to enter a key
      // Don't automatically use stored key - this prevents confusion
      toast.error('请先输入API密钥');
      return;
    }
    // If isPlaceholder is true, backend will use stored key automatically

    setTesting(true);
    setStatus('idle');
    setStatusMessage('');

    try {
      // Send apiKey (even if it's placeholder, backend will use stored key)
      await api.post('/api/api-key/test', {
        apiKey: apiKey.trim() || '', // Send empty or placeholder, backend will use stored key
        apiBaseUrl: apiBaseUrl.trim() || undefined,
      });

      setStatus('success');
      setStatusMessage('API密钥验证成功');
      toast.success('API密钥验证成功');
    } catch (error: any) {
      setStatus('error');
      setStatusMessage(error.response?.data?.message || 'API密钥验证失败');
      toast.error(error.response?.data?.message || 'API密钥验证失败');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (data: ApiKeyFormData) => {
    // Check if user is trying to save a placeholder
    const trimmedKey = data.apiKey.trim();
    const isPlaceholderKey = trimmedKey && /^[•·●\u2022\u25CF\u00B7\s]+$/.test(trimmedKey) && trimmedKey.length <= 50;
    
    // If it's a placeholder and user hasn't modified it, close dialog without saving
    if (isPlaceholderKey && status === 'success') {
      // User already has a key configured, and hasn't entered a new one
      toast.info('密钥未修改，无需保存');
      onOpenChange(false);
      return;
    }
    
    if (isPlaceholderKey) {
      toast.error('请先清空输入框，然后输入新的API密钥');
      return;
    }

    // Clean API key before sending
    const cleanedKey = cleanApiKey(data.apiKey);
    if (!cleanedKey) {
      toast.error('API密钥格式无效，请检查是否包含无效字符');
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/api-key/set', {
        apiKey: cleanedKey,
        apiBaseUrl: data.apiBaseUrl?.trim() || undefined,
      });

      toast.success('API密钥已保存');
      setStatus('success');
      setStatusMessage('已保存');
      setIsPlaceholder(true);
      loadStatus(); // Reload status to update UI
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('确定要删除API密钥吗？删除后您将无法使用AI服务。')) {
      return;
    }

    setLoading(true);
    try {
      await api.post('/api/api-key/delete');

      toast.success('API密钥已删除');
      setStatus('idle');
      setStatusMessage('未配置API密钥');
      reset();
      setIsPlaceholder(false);
      loadStatus(); // Reload status to update UI
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Key className="w-6 h-6 text-primary" />
            API密钥设置
          </DialogTitle>
          <DialogDescription>
            请设置您的API密钥以使用AI服务。密钥应从中转站获取。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Active Relay Info Banner */}
          {relayName && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-blue-900 mb-1">
                    当前激活的中转站
                  </p>
                  <p className="text-sm text-blue-700">
                    <span className="font-semibold">{relayName}</span>
                  </p>
                  {apiKeyLink && (
                    <p className="text-xs text-blue-600 mt-1">
                      请使用该中转站提供的API密钥
                    </p>
                  )}
                </div>
                {apiKeyLink && (
                  <a
                    href={apiKeyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1 whitespace-nowrap"
                  >
                    <ExternalLink className="w-3 h-3" />
                    获取密钥
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Status Display */}
          {status !== 'idle' && (
            <div
              className={`flex items-center gap-2 p-3 rounded-xl ${
                status === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {status === 'success' ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="text-sm font-medium">{statusMessage}</span>
            </div>
          )}

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API密钥
              {apiKeyLink && relayName && (
                <span className="text-xs font-normal text-gray-500 ml-2">
                  ({relayName}提供的密钥)
                </span>
              )}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={relayName ? `请输入${relayName}提供的API密钥` : 'sk-...'}
              {...register('apiKey', {
                onChange: (e) => {
                  // Auto-clean on input to prevent issues
                  const cleaned = e.target.value.replace(/[\r\n\t]/g, '');
                  setValue('apiKey', cleaned);
                  setIsPlaceholder(false);
                  setStatus('idle');
                  setStatusMessage('');
                },
              })}
              onPaste={(e) => {
                // Clean pasted content to remove hidden characters
                e.preventDefault();
                const pastedText = e.clipboardData.getData('text');
                const cleaned = cleanApiKey(pastedText);
                setValue('apiKey', cleaned);
                setIsPlaceholder(false);
                setStatus('idle');
                setStatusMessage('');
              }}
              disabled={loading || testing}
              className={`font-mono ${errors.apiKey ? 'border-red-300 focus:ring-red-500' : ''}`}
            />
            {errors.apiKey && (
              <p className="text-xs text-red-500 mt-1">{errors.apiKey.message}</p>
            )}
            <p className="text-xs text-gray-500">
              您的API密钥将被加密存储，仅用于调用AI服务。
              {status === 'success' && apiKey && /^[•·●\u2022\u25CF\u00B7\s]+$/.test(apiKey.trim()) && (
                <span className="block mt-1 text-blue-600 font-medium">
                  💡 提示：如需修改密钥，请先<strong className="underline">清空输入框</strong>，然后输入新密钥。
                </span>
              )}
              <span className="block mt-1 text-amber-600">
                ⚠️ 注意：实际调用AI服务时将使用管理员配置的中转站地址，而非您的自定义API地址。
              </span>
            </p>
          </div>

          {/* API Base URL (Synced from Admin Config) */}
          <div className="space-y-2">
            <Label htmlFor="apiBaseUrl">
              自定义API地址
              <span className="text-xs font-normal text-gray-400 ml-1">(仅用于测试连接)</span>
            </Label>
            <Input
              id="apiBaseUrl"
              type="url"
              placeholder={relayBaseUrl || "等待加载中转站地址..."}
              {...register('apiBaseUrl')}
              readOnly
              disabled={loading || testing || !relayBaseUrl}
              className="bg-gray-50 cursor-not-allowed"
            />
            {errors.apiBaseUrl && (
              <p className="text-xs text-red-500 mt-1">{errors.apiBaseUrl.message}</p>
            )}
            <p className="text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
              <strong>说明：</strong>此字段已自动同步管理员配置的中转站API地址，仅用于测试您的API密钥连接性，不会影响实际服务调用。
              <br />
              <span className="text-amber-600 mt-1 block">
                实际调用AI服务时，系统将自动使用管理员配置的中转站地址，您无法更改。
              </span>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={loading || testing || !relayBaseUrl}
              className="flex-1"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <TestTube className="w-4 h-4 mr-2" />
                  测试连接
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmit(handleSave)}
              disabled={
                loading || 
                testing || 
                !apiKey.trim() || 
                // Disable if showing placeholder (user needs to clear and enter new key)
                isPlaceholder
              }
              className="flex-1 rounded-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '保存'
              )}
            </Button>
            {status === 'success' && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={loading || testing}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
