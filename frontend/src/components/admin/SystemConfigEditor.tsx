'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save } from 'lucide-react';

interface SystemConfig {
  site_info?: {
    title?: string;
    description?: string;
    keywords?: string;
  };
  announcement?: string;
  watermark_config?: {
    enabled?: boolean;
    text?: string;
  };
}

export function SystemConfigEditor() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SystemConfig>({
    site_info: {},
    watermark_config: {},
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await api.get('/api/admin/system-config');
      // Ensure config has default structure
      setConfig({
        site_info: response.data?.site_info || {},
        announcement: response.data?.announcement || '',
        watermark_config: response.data?.watermark_config || {},
      });
    } catch (error) {
      console.error('Failed to load config:', error);
      toast.error('加载配置失败');
      // Set default config on error
      setConfig({ site_info: {}, announcement: '', watermark_config: {} });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/system-config', config);
      toast.success('配置已保存');
    } catch (error: any) {
      toast.error(error.response?.data?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">系统配置</h1>
        <Button onClick={handleSave} disabled={saving} className="rounded-full">
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              保存中...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              保存
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Site Info */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>网站信息</CardTitle>
            <CardDescription>SEO 和网站基本信息</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="site-title">网站标题</Label>
              <Input
                id="site-title"
                value={config.site_info?.title || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    site_info: { ...config.site_info, title: e.target.value },
                  })
                }
                placeholder="芸仔AI - AI工具平台"
              />
            </div>
            <div>
              <Label htmlFor="site-description">网站描述</Label>
              <Textarea
                id="site-description"
                value={config.site_info?.description || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    site_info: { ...config.site_info, description: e.target.value },
                  })
                }
                placeholder="Yunzai AI SaaS Platform"
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="site-keywords">关键词</Label>
              <Input
                id="site-keywords"
                value={config.site_info?.keywords || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    site_info: { ...config.site_info, keywords: e.target.value },
                  })
                }
                placeholder="AI, 工具, 平台"
              />
            </div>
          </CardContent>
        </Card>

        {/* Announcement */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>公告</CardTitle>
            <CardDescription>网站公告内容</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={config.announcement || ''}
              onChange={(e) => setConfig({ ...config, announcement: e.target.value })}
              placeholder="输入公告内容..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Watermark Config */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>水印设置</CardTitle>
            <CardDescription>聊天界面水印配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="watermark-enabled">启用水印</Label>
              <Switch
                id="watermark-enabled"
                checked={config.watermark_config?.enabled !== false}
                onCheckedChange={(checked) =>
                  setConfig({
                    ...config,
                    watermark_config: { ...config.watermark_config, enabled: checked },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="watermark-text">水印文本</Label>
              <Input
                id="watermark-text"
                value={config.watermark_config?.text || ''}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    watermark_config: { ...config.watermark_config, text: e.target.value },
                  })
                }
                placeholder="芸仔AI - UID:xxx"
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
