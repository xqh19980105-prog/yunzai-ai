'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/axios';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Search, History } from 'lucide-react';

interface LegalLog {
  id: string;
  userId: string;
  signatureText: string;
  ip: string;
  userAgent: string | null;
  createdAt: string;
  user: {
    id: string;
    email: string;
  };
}

export function LegalLogsViewer() {
  const [logs, setLogs] = useState<LegalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailFilter, setEmailFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page, emailFilter]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
      });
      if (emailFilter) params.append('email', emailFilter);

      const response = await api.get(`/api/admin/legal/logs?${params}`);
      // Ensure logs is always an array
      const logsData = response.data?.logs;
      setLogs(Array.isArray(logsData) ? logsData : []);
      setTotalPages(response.data?.totalPages || 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '加载日志失败');
      setLogs([]); // Ensure logs is empty array on error
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">法律日志</h1>

      {/* Filters */}
      <Card className="rounded-xl shadow-soft mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="按邮箱筛选..."
                value={emailFilter}
                onChange={(e) => {
                  setEmailFilter(e.target.value);
                  setPage(1);
                }}
                className="pl-10 rounded-full"
              />
            </div>
            <Button onClick={loadLogs} variant="outline" className="rounded-full">
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {logs.length === 0 ? (
              <Card className="rounded-xl shadow-soft">
                <CardContent className="pt-6 text-center text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>暂无法律日志</p>
                </CardContent>
              </Card>
            ) : (
              logs.map((log) => (
                <Card key={log.id} className="rounded-xl shadow-soft">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold">{log.user.email}</h3>
                          <Badge className="bg-green-100 text-green-800">已签署</Badge>
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">签名文本:</span>{' '}
                            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                              {log.signatureText}
                            </span>
                          </div>
                          <div>
                            <span className="font-medium">IP地址:</span> {log.ip}
                          </div>
                          {log.userAgent && (
                            <div>
                              <span className="font-medium">User Agent:</span>{' '}
                              <span className="text-xs">{log.userAgent}</span>
                            </div>
                          )}
                          <div>
                            <span className="font-medium">签署时间:</span>{' '}
                            {new Date(log.createdAt).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
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
    </div>
  );
}
