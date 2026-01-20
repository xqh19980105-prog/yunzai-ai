'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Edit, Save, X, Server, AlertTriangle, HelpCircle, ExternalLink, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface RelayConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyLink: string | null; // Link to get API key
  buyLink: string | null; // Link to purchase/recharge credits
  isActive: boolean;
  availableModels?: string[]; // Array of model names supported by this relay
  createdAt: string;
  updatedAt: string;
  warning?: string; // Warning message when switching relay
  incompatibleDomains?: Array<{ id: string; title: string; currentModel: string }>;
}

export function RelayConfigManagement() {
  const [configs, setConfigs] = useState<RelayConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    baseUrl: '',
    apiKeyLink: '', // Link to get API key
    buyLink: '', // Link to purchase/recharge credits
    isActive: true,
    availableModels: '', // Comma-separated model names
  });
  const [saving, setSaving] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/relay-configs');
      // Ensure configs is always an array
      const data = response.data;
      setConfigs(Array.isArray(data) ? data : []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '加载配置失败');
      setConfigs([]); // Ensure configs is empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.baseUrl) {
      toast.error('请填写名称和API服务地址');
      return;
    }

    setSaving(true);
    try {
      const models = formData.availableModels
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      if (formData.isActive && models.length === 0) {
        toast.error('激活的中转站必须配置支持的模型列表');
        setSaving(false);
        return;
      }

      const response = await api.post('/api/admin/relay-configs', {
        name: formData.name,
        baseUrl: formData.baseUrl,
        apiKeyLink: formData.apiKeyLink || undefined,
        buyLink: formData.buyLink || undefined,
        isActive: formData.isActive,
        availableModels: models,
      });

      // Check for warnings about incompatible models
      if (response.data.warning) {
        toast.warning(response.data.warning, {
          duration: 10000,
        });
      } else {
        toast.success('创建成功');
      }

      setShowForm(false);
      setFormData({ name: '', baseUrl: '', apiKeyLink: '', buyLink: '', isActive: true, availableModels: '' });
      loadConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '创建失败');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: string) => {
    setSaving(true);
    try {
      const config = configs.find((c) => c.id === id);
      if (!config) return;

      const models = formData.availableModels
        .split(',')
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      if (formData.isActive && models.length === 0) {
        toast.error('激活的中转站必须配置支持的模型列表');
        setSaving(false);
        return;
      }

      const response = await api.put(`/api/admin/relay-configs/${id}`, {
        name: formData.name,
        baseUrl: formData.baseUrl,
        apiKeyLink: formData.apiKeyLink || undefined,
        buyLink: formData.buyLink || undefined,
        isActive: formData.isActive,
        availableModels: models,
      });

      // Check for warnings about incompatible models
      if (response.data.warning) {
        toast.warning(response.data.warning, {
          duration: 10000,
        });
      } else {
        toast.success('更新成功');
      }

      setEditingId(null);
      setFormData({ name: '', baseUrl: '', apiKeyLink: '', buyLink: '', isActive: true, availableModels: '' });
      loadConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个中转站配置吗？')) return;

    try {
      await api.delete(`/api/admin/relay-configs/${id}`);
      toast.success('删除成功');
      loadConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '删除失败');
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const config = configs.find((c) => c.id === id);
      if (!config) return;

      const response = await api.put(`/api/admin/relay-configs/${id}`, {
        isActive: !currentActive,
        availableModels: config.availableModels || [],
      });

      // Check for warnings about incompatible models when activating
      if (response.data.warning) {
        toast.warning(response.data.warning, {
          duration: 10000,
        });
      } else {
        toast.success(currentActive ? '已停用' : '已启用');
      }

      loadConfigs();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '操作失败');
    }
  };

  const startEdit = (config: RelayConfig) => {
    setEditingId(config.id);
    setFormData({
      name: config.name,
      baseUrl: config.baseUrl,
      apiKeyLink: config.apiKeyLink || '',
      buyLink: config.buyLink || '',
      isActive: config.isActive,
      availableModels: (config.availableModels || []).join(', '),
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', baseUrl: '', apiKeyLink: '', buyLink: '', isActive: true, availableModels: '' });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">中转站配置</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowHelp(!showHelp)}
            className="rounded-full"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            {showHelp ? '隐藏帮助' : '切换指南'}
          </Button>
          <Button
            onClick={() => {
              setShowForm(true);
              setFormData({ name: '', baseUrl: '', apiKeyLink: '', buyLink: '', isActive: true, availableModels: '' });
            }}
            className="rounded-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            新增中转站
          </Button>
        </div>
      </div>

      {/* 切换指南帮助卡片 */}
      {showHelp && (
        <Card className="mb-6 rounded-xl border-blue-200 bg-blue-50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900 font-semibold">🔄 中转站切换指南</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="text-blue-800 space-y-4">
            <div>
              <p className="font-medium mb-2 text-blue-900">切换前需要从新中转站官网获取以下信息：</p>
              <ul className="list-disc list-inside space-y-2 text-sm ml-2">
                <li>
                  <strong>API基础URL</strong>：例如 <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">https://api.example.com</code>
                  <br />
                  <span className="text-blue-600 text-xs">→ 查看中转站官网的"API文档"或"接入文档"</span>
                </li>
                <li>
                  <strong>支持的模型列表</strong>：例如 <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">gpt-4, gpt-3.5-turbo</code>
                  <br />
                  <span className="text-blue-600 text-xs">→ 查看"模型列表"或"支持的模型"页面</span>
                </li>
                <li>
                  <strong>密钥获取地址</strong>（可选）：用户获取API密钥的链接
                </li>
                <li>
                  <strong>购买/充值链接</strong>（可选）：用户购买服务或充值的链接
                </li>
              </ul>
            </div>
            <div className="pt-3 border-t border-blue-200">
              <p className="font-medium mb-2 text-blue-900">切换步骤：</p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                <li>创建新中转站配置（先不要激活）</li>
                <li>填写从官网获取的API服务地址和模型列表</li>
                <li>点击"启用"激活新中转站（系统会自动停用旧中转站）</li>
                <li>如有不兼容模型，前往工作流编辑器更新配置</li>
              </ol>
            </div>
            <div className="pt-3 border-t border-blue-200">
              <p className="text-sm text-blue-700 bg-blue-100 p-2 rounded">
                <strong>💡 提示</strong>：用户不需要更换API密钥，只需管理员配置新中转站信息即可！
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Form */}
      {showForm && (
        <Card className="rounded-xl shadow-soft mb-6">
          <CardHeader>
            <CardTitle>新增中转站配置</CardTitle>
            <CardDescription>BYOK 容灾配置</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="例如: 云雾API"
                className="rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="baseUrl">
                API服务地址 <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">
                  (中转站的API基础URL)
                </span>
              </Label>
              <Input
                id="baseUrl"
                value={formData.baseUrl}
                onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                placeholder="https://api.example.com"
                className="rounded-xl"
              />
              <div className="mt-2 space-y-1">
                <p className="text-xs text-gray-500">
                  <strong>什么是API服务地址？</strong>
                </p>
                <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded border border-blue-200">
                  API服务地址是AI中转站提供的API接口地址，用于实际调用AI服务。工作流执行时会使用：<br />
                  <code className="bg-white px-1 rounded">API服务地址 + /v1/chat/completions</code>
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>如何获取？</strong>
                </p>
                <ul className="text-xs text-gray-600 bg-gray-50 p-2 rounded border border-gray-200 list-disc list-inside space-y-1">
                  <li>查看中转站官网的API文档</li>
                  <li>联系中转站客服获取API地址</li>
                  <li>检查中转站控制台或管理后台</li>
                  <li>通常格式为：<code className="bg-white px-1 rounded">https://api.中转站域名.com</code></li>
                </ul>
                <p className="text-xs text-gray-500 mt-2">
                  <strong>示例：</strong>
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• 云雾AI：<code className="bg-gray-100 px-1 rounded">https://yunwu.ai</code> ⚠️ 注意：是 yunwu.ai，不是 api.yunwuai.com</li>
                  <li>• OpenAI（官方）：<code className="bg-gray-100 px-1 rounded">https://api.openai.com</code></li>
                  <li>• 智谱AI：<code className="bg-gray-100 px-1 rounded">https://open.bigmodel.cn/api/paas/v4</code></li>
                  <li>• 阿里云通义千问：<code className="bg-gray-100 px-1 rounded">https://dashscope.aliyuncs.com/compatible-mode/v1</code></li>
                  <li>• 百度文心一言：<code className="bg-gray-100 px-1 rounded">https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat</code></li>
                  <li>• DeepSeek：<code className="bg-gray-100 px-1 rounded">https://api.deepseek.com</code></li>
                </ul>
                <div className="mt-2 pt-2 border-t border-gray-200 bg-amber-50 p-2 rounded border border-amber-200">
                  <div className="flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-xs font-medium text-amber-900 mb-1">
                        💡 更多中转站地址？
                      </p>
                      <p className="text-xs text-amber-700 mb-2">
                        查看完整的中转站地址列表和获取方法，请查看项目文档：
                      </p>
                      <p className="text-xs text-amber-700 font-mono bg-white px-2 py-1 rounded border border-amber-300">
                        docs/常见中转站API地址参考.md
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="apiKeyLink">密钥获取地址（可选）</Label>
              <Input
                id="apiKeyLink"
                value={formData.apiKeyLink}
                onChange={(e) => setFormData({ ...formData, apiKeyLink: e.target.value })}
                placeholder="https://example.com/api-keys"
                className="rounded-xl"
              />
              <p className="text-xs text-gray-500 mt-1">
                用户获取API密钥的链接，将在"API密钥设置"对话框中显示
              </p>
            </div>
            <div>
              <Label htmlFor="buyLink">购买/充值链接（可选）</Label>
              <Input
                id="buyLink"
                value={formData.buyLink}
                onChange={(e) => setFormData({ ...formData, buyLink: e.target.value })}
                placeholder="https://buy.example.com"
                className="rounded-xl"
              />
              <p className="text-xs text-gray-500 mt-1">
                用户购买服务或充值的链接
              </p>
            </div>
            <div>
              <Label htmlFor="availableModels">
                支持的模型列表 <span className="text-red-500">*</span>
                <span className="text-xs text-gray-500 ml-2">
                  (从新中转站官网的"模型列表"页面获取)
                </span>
              </Label>
              <Textarea
                id="availableModels"
                value={formData.availableModels}
                onChange={(e) => setFormData({ ...formData, availableModels: e.target.value })}
                placeholder="gpt-4, gpt-3.5-turbo, claude-3-opus (用逗号分隔)"
                className="rounded-xl font-mono text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">
                输入该中转站支持的所有模型名称，用逗号分隔。例如：gpt-4, gpt-3.5-turbo, claude-3-opus
                <br />
                <span className="text-orange-600">
                  ⚠️ 激活中转站时必须填写，否则无法切换
                </span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="isActive">
                启用
                {formData.isActive && (
                  <span className="text-xs text-orange-600 ml-2">
                    (激活后将自动停用其他中转站)
                  </span>
                )}
              </Label>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={saving} className="rounded-full">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    创建
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', baseUrl: '', apiKeyLink: '', buyLink: '', isActive: true, availableModels: '' });
                }}
                className="rounded-full"
              >
                <X className="w-4 h-4 mr-2" />
                取消
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Configs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-4">
          {configs.length === 0 ? (
            <Card className="rounded-xl shadow-soft">
              <CardContent className="pt-6 text-center text-gray-500">
                <Server className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>暂无中转站配置</p>
              </CardContent>
            </Card>
          ) : (
            configs.map((config) => (
              <Card key={config.id} className="rounded-xl shadow-soft">
                <CardContent className="pt-6">
                  {editingId === config.id ? (
                    <div className="space-y-4">
                      <div>
                        <Label>名称</Label>
                        <Input
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>API服务地址</Label>
                        <Input
                          value={formData.baseUrl}
                          onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>密钥获取地址</Label>
                        <Input
                          value={formData.apiKeyLink}
                          onChange={(e) => setFormData({ ...formData, apiKeyLink: e.target.value })}
                          placeholder="https://example.com/api-keys"
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>购买/充值链接</Label>
                        <Input
                          value={formData.buyLink}
                          onChange={(e) => setFormData({ ...formData, buyLink: e.target.value })}
                          placeholder="https://buy.example.com"
                          className="rounded-xl"
                        />
                      </div>
                      <div>
                        <Label>支持的模型列表</Label>
                        <Textarea
                          value={formData.availableModels}
                          onChange={(e) => setFormData({ ...formData, availableModels: e.target.value })}
                          placeholder="gpt-4, gpt-3.5-turbo, claude-3-opus (用逗号分隔)"
                          className="rounded-xl font-mono text-sm"
                          rows={3}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          输入该中转站支持的所有模型名称，用逗号分隔
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={formData.isActive}
                          onCheckedChange={(checked) =>
                            setFormData({ ...formData, isActive: checked })
                          }
                        />
                        <Label>启用</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleUpdate(config.id)}
                          disabled={saving}
                          className="rounded-full"
                        >
                          {saving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Save className="w-4 h-4 mr-2" />
                              保存
                            </>
                          )}
                        </Button>
                        <Button variant="outline" onClick={cancelEdit} className="rounded-full">
                          <X className="w-4 h-4 mr-2" />
                          取消
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{config.name}</h3>
                          {config.isActive ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              启用中
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
                              已停用
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">API服务地址:</span> {config.baseUrl}
                          </div>
                          {config.apiKeyLink && (
                            <div>
                              <span className="font-medium">密钥获取地址:</span>{' '}
                              <a
                                href={config.apiKeyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {config.apiKeyLink}
                              </a>
                            </div>
                          )}
                          {config.buyLink && (
                            <div>
                              <span className="font-medium">购买/充值链接:</span>{' '}
                              <a
                                href={config.buyLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                {config.buyLink}
                              </a>
                            </div>
                          )}
                          {config.availableModels && config.availableModels.length > 0 && (
                            <div>
                              <span className="font-medium">支持的模型:</span>{' '}
                              <span className="font-mono text-xs">
                                {config.availableModels.join(', ')}
                              </span>
                            </div>
                          )}
                          {config.warning && (
                            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                                <div className="flex-1">
                                  <p className="text-sm text-yellow-800 font-medium">
                                    {config.warning}
                                  </p>
                                  {config.incompatibleDomains && config.incompatibleDomains.length > 0 && (
                                    <ul className="mt-1 text-xs text-yellow-700 list-disc list-inside">
                                      {config.incompatibleDomains.map((domain) => (
                                        <li key={domain.id}>
                                          {domain.title}: {domain.currentModel}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">创建时间:</span>{' '}
                            {new Date(config.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleActive(config.id, config.isActive)}
                          className="rounded-full"
                        >
                          {config.isActive ? '停用' : '启用'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEdit(config)}
                          className="rounded-full"
                        >
                          <Edit className="w-4 h-4 mr-1" />
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(config.id)}
                          className="rounded-full text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
