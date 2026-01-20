'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/axios';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Save, Eye, FileText } from 'lucide-react';

const DEFAULT_LEGAL_TEXT = `在使用本服务前，您必须明确承诺将合法、合规地使用本平台提供的所有功能。
您需对使用本服务产生的所有内容承担完全责任，并保证不会利用本服务进行任何
侵犯版权、知识产权或违反法律法规的行为。

如因您的使用行为导致任何法律纠纷或损失，您将承担全部法律责任。
平台不对您的使用行为及其产生的后果承担任何责任。`;

export function LegalCMS() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [legalText, setLegalText] = useState(DEFAULT_LEGAL_TEXT);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    loadLegalText();
  }, []);

  const loadLegalText = async () => {
    try {
      const response = await api.get('/api/admin/legal/text');
      if (response.data.text) {
        setLegalText(response.data.text);
      }
    } catch (error) {
      console.error('Failed to load legal text:', error);
      // Use default text if API fails
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/admin/legal/text', {
        text: legalText,
      });
      toast.success('法律声明已保存');
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
        <h1 className="text-3xl font-bold">法律 CMS</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setPreview(!preview)}
            variant="outline"
            className="rounded-full"
          >
            <Eye className="w-4 h-4 mr-2" />
            {preview ? '编辑' : '预览'}
          </Button>
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>编辑法律声明</CardTitle>
            <CardDescription>修改法律声明确认页面的文本内容</CardDescription>
          </CardHeader>
          <CardContent>
            {preview ? (
              <div className="bg-gray-50 rounded-xl p-6 min-h-[400px] whitespace-pre-wrap">
                {legalText}
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="legal-text">法律声明内容</Label>
                <Textarea
                  id="legal-text"
                  value={legalText}
                  onChange={(e) => setLegalText(e.target.value)}
                  placeholder="输入法律声明内容..."
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-sm text-gray-500">
                  提示：用户需要手动输入 "我承诺合法使用" 来确认此声明
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>预览效果</CardTitle>
            <CardDescription>法律声明确认模态框预览</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-xl font-bold">法律声明确认</h2>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">使用承诺</h3>
                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {legalText.split('\n\n')[0] || legalText}
                  </p>
                </div>
                {legalText.includes('\n\n') && (
                  <div>
                    <h3 className="font-semibold mb-2">责任声明</h3>
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {legalText.split('\n\n')[1] || ''}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <Label className="block mb-2">请手动输入以下文字以确认：</Label>
                <div className="bg-primary/10 border-2 border-primary rounded-xl p-4 mb-3">
                  <p className="text-lg font-mono text-center text-primary">
                    我承诺合法使用
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="请在此输入上述文字"
                  className="w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-center text-lg"
                  disabled
                />
              </div>

              <Button className="w-full rounded-full" disabled>
                确认并提交
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
