'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, FileText, FileSpreadsheet, Search, RefreshCw, Ban, CheckCircle, Unlock } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils/error-handler';

interface ActivationCode {
  code: string;
  days: number;
  batchTag: string | null;
  status: 'UNUSED' | 'USED' | 'FROZEN';
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
  usedByEmail?: string | null;
}

export function ActivationCodeFactory() {
  const [count, setCount] = useState(1);
  const [days, setDays] = useState(30);
  const [batchTag, setBatchTag] = useState('');
  const [generating, setGenerating] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  
  // List view state
  const [showList, setShowList] = useState(false);
  const [codeList, setCodeList] = useState<ActivationCode[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [batchFilter, setBatchFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handleGenerate = async () => {
    if (count < 1 || count > 1000) {
      toast.error('数量必须在 1-1000 之间');
      return;
    }

    if (days < 1) {
      toast.error('天数必须大于 0');
      return;
    }

    setGenerating(true);
    try {
      const response = await api.post('/api/admin/activation-codes/generate', {
        count,
        days,
        batchTag: batchTag || undefined,
      });

      setCodes(response.data.codes);
      toast.success(`成功生成 ${response.data.codes.length} 个激活码`);
    } catch (error) {
      toast.error(getErrorMessage(error) || '生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleExportTxt = () => {
    if (codes.length === 0) {
      toast.error('没有激活码可导出');
      return;
    }

    const content = codes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activation-codes-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportExcel = () => {
    if (codes.length === 0) {
      toast.error('没有激活码可导出');
      return;
    }

    // Simple CSV export (Excel compatible)
    const headers = ['激活码', '天数', '批次标签', '状态'];
    const rows = codes.map((code) => [code, days.toString(), batchTag || '', 'UNUSED']);
    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    
    // Add BOM for Excel UTF-8 support
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activation-codes-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const loadCodeList = async () => {
    setLoadingList(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (batchFilter) params.append('batchTag', batchFilter);

      const response = await api.get(`/api/admin/activation-codes?${params}`);
      // Ensure codeList is always an array
      const codesData = response.data?.codes;
      setCodeList(Array.isArray(codesData) ? codesData : []);
      setTotalPages(response.data?.totalPages || 1);
    } catch (error) {
      toast.error(getErrorMessage(error) || '加载激活码列表失败');
      setCodeList([]); // Ensure codeList is empty array on error
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (showList) {
      loadCodeList();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showList, page, statusFilter, batchFilter]);

  const handleFreezeCode = async (code: string) => {
    try {
      await api.put(`/api/admin/activation-codes/${code}/status`, { status: 'FROZEN' });
      toast.success('已冻结');
      loadCodeList();
    } catch (error) {
      toast.error(getErrorMessage(error) || '操作失败');
    }
  };

  const handleUnfreezeCode = async (code: string) => {
    try {
      await api.put(`/api/admin/activation-codes/${code}/status`, { status: 'UNUSED' });
      toast.success('已解冻');
      loadCodeList();
    } catch (error) {
      toast.error(getErrorMessage(error) || '操作失败');
    }
  };

  const getStatusBadge = (status: ActivationCode['status']) => {
    const variants: Record<ActivationCode['status'], { label: string; className: string }> = {
      UNUSED: { label: '未使用', className: 'bg-green-100 text-green-800' },
      USED: { label: '已使用', className: 'bg-blue-100 text-blue-800' },
      FROZEN: { label: '已冻结', className: 'bg-red-100 text-red-800' },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">激活码工厂</h1>
        <div className="flex gap-2">
          <Button
            variant={showList ? 'default' : 'outline'}
            onClick={() => {
              setShowList(!showList);
              if (!showList) loadCodeList();
            }}
            className="rounded-full"
          >
            {showList ? '生成激活码' : '查看列表'}
          </Button>
        </div>
      </div>

      {showList ? (
        <>
          {/* Filters */}
          <Card className="rounded-xl shadow-soft mb-6">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="搜索批次标签..."
                    value={batchFilter}
                    onChange={(e) => {
                      setBatchFilter(e.target.value);
                      setPage(1);
                    }}
                    className="pl-10 rounded-full"
                  />
                </div>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                  <SelectTrigger className="rounded-full">
                    <SelectValue placeholder="筛选状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部状态</SelectItem>
                    <SelectItem value="UNUSED">未使用</SelectItem>
                    <SelectItem value="USED">已使用</SelectItem>
                    <SelectItem value="FROZEN">已冻结</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={loadCodeList} variant="outline" className="rounded-full">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  刷新
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Code List */}
          {loadingList ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {codeList.map((code) => (
                  <Card key={code.code} className="rounded-xl shadow-soft">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="font-mono text-lg font-semibold">{code.code}</span>
                            {getStatusBadge(code.status)}
                            {code.batchTag && (
                              <Badge variant="outline">{code.batchTag}</Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">天数:</span> {code.days} 天
                            </div>
                            <div>
                              <span className="font-medium">创建时间:</span>{' '}
                              {new Date(code.createdAt).toLocaleDateString()}
                            </div>
                            {code.usedBy && (
                              <>
                                <div>
                                  <span className="font-medium">使用者:</span>{' '}
                                  {code.usedByEmail || code.usedBy.slice(0, 8) + '...'}
                                </div>
                                <div>
                                  <span className="font-medium">使用时间:</span>{' '}
                                  {code.usedAt ? new Date(code.usedAt).toLocaleDateString() : '-'}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {code.status === 'UNUSED' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFreezeCode(code.code)}
                              className="rounded-full"
                            >
                              <Ban className="w-4 h-4 mr-1" />
                              冻结
                            </Button>
                          )}
                          {code.status === 'FROZEN' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleUnfreezeCode(code.code)}
                              className="rounded-full"
                            >
                              <Unlock className="w-4 h-4 mr-1" />
                              解冻
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="rounded-full"
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-gray-600">
                    第 {page} / {totalPages} 页
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="rounded-full"
                  >
                    下一页
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Generator Form */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader>
            <CardTitle>生成激活码</CardTitle>
            <CardDescription>批量生成激活码</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="count">生成数量</Label>
              <Input
                id="count"
                type="number"
                min={1}
                max={1000}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                placeholder="1-1000"
              />
            </div>
            <div>
              <Label htmlFor="days">有效天数</Label>
              <Input
                id="days"
                type="number"
                min={1}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value) || 30)}
                placeholder="30"
              />
            </div>
            <div>
              <Label htmlFor="batch-tag">批次标签（可选）</Label>
              <Input
                id="batch-tag"
                value={batchTag}
                onChange={(e) => setBatchTag(e.target.value)}
                placeholder="例如: 2024-Q1"
              />
            </div>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full rounded-full"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  生成中...
                </>
              ) : (
                '生成激活码'
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Export Options */}
        {codes.length > 0 && (
          <Card className="rounded-xl shadow-soft">
            <CardHeader>
              <CardTitle>导出激活码</CardTitle>
              <CardDescription>已生成 {codes.length} 个激活码</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Button
                  onClick={handleExportTxt}
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  导出为 TXT
                </Button>
                <Button
                  onClick={handleExportExcel}
                  variant="outline"
                  className="w-full rounded-full"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  导出为 Excel (CSV)
                </Button>
              </div>

              {/* Preview */}
              <div className="mt-4">
                <Label>预览（前 10 个）</Label>
                <div className="mt-2 p-3 bg-gray-50 rounded-xl max-h-48 overflow-y-auto">
                  {codes.slice(0, 10).map((code, index) => (
                    <div key={index} className="text-sm font-mono py-1">
                      {code}
                    </div>
                  ))}
                  {codes.length > 10 && (
                    <div className="text-sm text-gray-500 mt-2">
                      ... 还有 {codes.length - 10} 个激活码
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        </div>
      )}
    </div>
  );
}
