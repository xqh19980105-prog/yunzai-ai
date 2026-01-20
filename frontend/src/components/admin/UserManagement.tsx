'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Search, Ban, CheckCircle, Shield, Calendar, Eye, MessageSquare, FileText, Key, Monitor, Smartphone, Laptop, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface User {
  id: string;
  email: string;
  status: 'ACTIVE' | 'BANNED' | 'LOCKED_ASSET_PROTECTION';
  membershipExpireAt: string | null;
  isLegalSigned: boolean;
  deviceFingerprintCount: number;
  registeredIp: string | null;
  lastLoginIp: string | null;
  createdAt: string;
  isAdmin?: boolean;
}

interface UserDetail extends User {
  legalLogs?: Array<{
    id: string;
    signatureText: string;
    ip: string;
    createdAt: string;
  }>;
  chatHistories?: Array<{
    id: string;
    role: string;
    content: string;
    createdAt: string;
    domain: {
      id: string;
      title: string;
    };
  }>;
  activationCodes?: Array<{
    code: string;
    days: number;
    batchTag: string | null;
    usedAt: string | null;
    createdAt: string;
  }>;
  statusLogs?: Array<{
    id: string;
    previousStatus: 'ACTIVE' | 'BANNED' | 'LOCKED_ASSET_PROTECTION';
    newStatus: 'ACTIVE' | 'BANNED' | 'LOCKED_ASSET_PROTECTION';
    reason: string;
    operatorEmail: string;
    ip: string | null;
    createdAt: string;
  }>;
  membershipActivatedAt?: string | null;
  devices?: Array<{
    id: string;
    fingerprint: string;
    ip: string;
    userAgent: string | null;
    isActive: boolean;
    lastUsedAt: string;
    createdAt: string;
  }>;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [membershipFilter, setMembershipFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusChangeUserId, setStatusChangeUserId] = useState<string | null>(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState<User['status'] | null>(null);
  const [statusChangeReason, setStatusChangeReason] = useState('');
  const { user: currentUser, setUser: setCurrentUser } = useAuthStore();

  useEffect(() => {
    loadUsers();
  }, [page, statusFilter, membershipFilter, search]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (membershipFilter !== 'all') params.append('membershipStatus', membershipFilter);
      if (search) params.append('search', search);

      const response = await api.get(`/api/admin/users?${params}`);
      // Ensure users is always an array
      const usersData = response.data?.users;
      setUsers(Array.isArray(usersData) ? usersData : []);
      setTotalPages(response.data?.totalPages || 1);
    } catch (error: any) {
      toast.error(error.response?.data?.message || '加载用户列表失败');
      setUsers([]); // Ensure users is empty array on error
    } finally {
      setLoading(false);
    }
  };

  const handleOpenStatusDialog = (userId: string, targetStatus: User['status']) => {
    setStatusChangeUserId(userId);
    setStatusChangeTarget(targetStatus);
    setStatusChangeReason('');
    setShowStatusDialog(true);
  };

  const handleStatusChange = async () => {
    if (!statusChangeUserId || !statusChangeTarget) return;
    
    if (!statusChangeReason || statusChangeReason.trim().length === 0) {
      toast.error('请填写状态变更原因');
      return;
    }

    setUpdating(statusChangeUserId);
    try {
      await api.put(`/api/admin/users/${statusChangeUserId}/status`, { 
        status: statusChangeTarget,
        reason: statusChangeReason.trim()
      });
      toast.success('状态更新成功');
      setShowStatusDialog(false);
      setStatusChangeUserId(null);
      setStatusChangeTarget(null);
      setStatusChangeReason('');
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || '更新失败');
    } finally {
      setUpdating(null);
    }
  };


  const handleViewUserDetail = async (userId: string) => {
    setLoadingDetail(true);
    setShowUserDetail(true);
    try {
      const response = await api.get(`/api/admin/users/${userId}`);
      // 确保所有数组字段都有默认值，避免 undefined 错误
      setSelectedUser({
        ...response.data,
        legalLogs: response.data.legalLogs || [],
        chatHistories: response.data.chatHistories || [],
        devices: response.data.devices || [],
        activationCodes: response.data.activationCodes || [],
        statusLogs: response.data.statusLogs || [],
      });
    } catch (error: any) {
      toast.error(error.response?.data?.message || '加载用户详情失败');
      setShowUserDetail(false);
    } finally {
      setLoadingDetail(false);
    }
  };


  const getStatusBadge = (status: User['status']) => {
    const variants: Record<User['status'], { label: string; className: string }> = {
      ACTIVE: { label: '正常', className: 'bg-green-100 text-green-800' },
      BANNED: { label: '封禁', className: 'bg-red-100 text-red-800' },
      LOCKED_ASSET_PROTECTION: { label: '锁定', className: 'bg-orange-100 text-orange-800' },
    };
    const variant = variants[status];
    return <Badge className={variant.className}>{variant.label}</Badge>;
  };

  const isMember = (expireAt: string | null) => {
    if (!expireAt) return false;
    return new Date(expireAt) > new Date();
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">用户管理</h1>

      {/* Filters */}
      <Card className="rounded-xl shadow-soft mb-6">
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索邮箱..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10 rounded-full"
              />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="账号状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="ACTIVE">正常</SelectItem>
                <SelectItem value="LOCKED_ASSET_PROTECTION">锁定</SelectItem>
                <SelectItem value="BANNED">封禁</SelectItem>
              </SelectContent>
            </Select>
            <Select value={membershipFilter} onValueChange={(v) => { setMembershipFilter(v); setPage(1); }}>
              <SelectTrigger className="rounded-full">
                <SelectValue placeholder="会员状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部用户</SelectItem>
                <SelectItem value="member">在期会员</SelectItem>
                <SelectItem value="expired">过期会员</SelectItem>
                <SelectItem value="non-member">非会员</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadUsers} variant="outline" className="rounded-full">
              刷新
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {users && users.length > 0 ? users.map((user) => (
              <Card key={user.id} className="rounded-xl shadow-soft">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{user.email}</h3>
                        {user.isAdmin && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-300">
                            管理员
                          </Badge>
                        )}
                        {getStatusBadge(user.status)}
                        {isMember(user.membershipExpireAt) && (
                          <Badge className="bg-blue-100 text-blue-800">
                            <Calendar className="w-3 h-3 mr-1" />
                            会员
                          </Badge>
                        )}
                        {user.isLegalSigned && (
                          <Badge className="bg-purple-100 text-purple-800">
                            <Shield className="w-3 h-3 mr-1" />
                            已签署
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">设备数:</span> {user.deviceFingerprintCount}
                        </div>
                        <div>
                          <span className="font-medium">注册时间:</span>{' '}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="font-medium">会员到期:</span>{' '}
                          {user.membershipExpireAt
                            ? new Date(user.membershipExpireAt).toLocaleDateString()
                            : '未激活'}
                        </div>
                        <div>
                          <span className="font-medium">ID:</span> {user.id.slice(0, 8)}...
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      {user.status !== 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStatusDialog(user.id, 'ACTIVE')}
                          disabled={updating === user.id}
                          className="rounded-full"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          解封
                        </Button>
                      )}
                      {user.status !== 'BANNED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenStatusDialog(user.id, 'BANNED')}
                          disabled={updating === user.id}
                          className="rounded-full"
                        >
                          <Ban className="w-4 h-4 mr-1" />
                          封禁
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewUserDetail(user.id)}
                        className="rounded-full"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        查看详情
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card className="rounded-xl shadow-soft">
                <CardContent className="pt-6 text-center text-gray-500">
                  <p>暂无用户数据</p>
                </CardContent>
              </Card>
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

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl">
          <DialogHeader>
            <DialogTitle>用户详情</DialogTitle>
            <DialogDescription>
              {selectedUser?.email} 的详细信息
            </DialogDescription>
          </DialogHeader>
          
          {loadingDetail ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : selectedUser ? (
            <div className="space-y-6">
              {/* Basic Info */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle>基本信息</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-500">邮箱</Label>
                    <p className="font-medium">{selectedUser.email}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">状态</Label>
                    <div className="mt-1">{getStatusBadge(selectedUser.status)}</div>
                  </div>
                  <div>
                    <Label className="text-gray-500">会员激活时间</Label>
                    <p className="font-medium">
                      {selectedUser.membershipActivatedAt
                        ? new Date(selectedUser.membershipActivatedAt).toLocaleString()
                        : '未激活'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">账号注册时间</Label>
                    <p className="font-medium">
                      {new Date(selectedUser.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">会员到期时间</Label>
                    <p className="font-medium">
                      {selectedUser.membershipExpireAt
                        ? new Date(selectedUser.membershipExpireAt).toLocaleString()
                        : '未激活'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">设备数</Label>
                    <p className="font-medium">{selectedUser.deviceFingerprintCount}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500">法律签署</Label>
                    <Badge className={selectedUser.isLegalSigned ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {selectedUser.isLegalSigned ? '已签署' : '未签署'}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-gray-500">注册IP</Label>
                    <p className="font-medium font-mono text-sm">
                      {selectedUser.registeredIp || '未知'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-gray-500">最近登录IP</Label>
                    <p className="font-medium font-mono text-sm">
                      {selectedUser.lastLoginIp || '未知'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Devices */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="w-5 h-5" />
                    设备登录记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedUser.devices && selectedUser.devices.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.devices.map((device) => (
                        <div 
                          key={device.id} 
                          className={`p-3 rounded-xl border-2 ${
                            device.isActive 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              {device.userAgent?.includes('Mobile') ? (
                                <Smartphone className="w-4 h-4 text-gray-500" />
                              ) : (
                                <Laptop className="w-4 h-4 text-gray-500" />
                              )}
                              <Badge 
                                className={device.isActive 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-gray-100 text-gray-800'
                                }
                              >
                                {device.isActive ? '当前设备' : '历史设备'}
                              </Badge>
                              <span className="font-mono text-xs text-gray-600">
                                {device.fingerprint ? device.fingerprint.substring(0, 16) + '...' : '未知设备指纹'}
                              </span>
                            </div>
                            <span className="text-xs text-gray-500">
                              {device.lastUsedAt ? new Date(device.lastUsedAt).toLocaleString() : '未知时间'}
                            </span>
                          </div>
                          <div className="space-y-1 text-xs text-gray-600">
                            <div>
                              <span className="font-medium">IP地址:</span> {device.ip || '未知'}
                            </div>
                            {device.userAgent && (
                              <div>
                                <span className="font-medium">User Agent:</span>{' '}
                                <span className="text-xs break-all">{device.userAgent}</span>
                              </div>
                            )}
                            <div>
                              <span className="font-medium">首次使用:</span>{' '}
                              {device.createdAt ? new Date(device.createdAt).toLocaleString() : '未知时间'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      该用户尚未记录任何设备
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Activation Codes */}
              <Card className="rounded-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    激活码使用记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedUser.activationCodes && selectedUser.activationCodes.length > 0 ? (
                    <div className="space-y-3">
                      {selectedUser.activationCodes.map((activationCode, index) => (
                        <div key={index} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm bg-white px-2 py-1 rounded border">
                                {activationCode.code || '未知激活码'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {activationCode.days || 0} 天
                              </Badge>
                              {activationCode.batchTag && (
                                <Badge variant="outline" className="text-xs">
                                  批次: {activationCode.batchTag}
                                </Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500">
                              {activationCode.usedAt
                                ? new Date(activationCode.usedAt).toLocaleString()
                                : '未使用'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            生成时间: {activationCode.createdAt ? new Date(activationCode.createdAt).toLocaleString() : '未知时间'}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">
                      该用户尚未使用任何激活码
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Status Change Logs */}
              {selectedUser.statusLogs && selectedUser.statusLogs.length > 0 && (
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      状态变更历史
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedUser.statusLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded-xl border-l-4 border-orange-400">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-red-100 text-red-800">
                                {log.previousStatus === 'ACTIVE' ? '正常' : log.previousStatus === 'BANNED' ? '封禁' : '锁定'}
                              </Badge>
                              <span className="text-gray-400">→</span>
                              <Badge className="bg-green-100 text-green-800">
                                {log.newStatus === 'ACTIVE' ? '正常' : log.newStatus === 'BANNED' ? '封禁' : '锁定'}
                              </Badge>
                            </div>
                            <span className="text-xs text-gray-500">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : '未知时间'}
                            </span>
                          </div>
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">原因：</span>
                              <span className="text-gray-600">{log.reason || '无原因'}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">操作人：</span>
                              {log.operatorEmail || '未知'}
                              {log.ip && <span className="ml-2">IP: {log.ip}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Legal Logs */}
              {selectedUser.legalLogs && selectedUser.legalLogs.length > 0 && (
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      法律签署记录
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedUser.legalLogs.map((log) => (
                        <div key={log.id} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-mono text-sm bg-white px-2 py-1 rounded">
                              {log.signatureText || '无签名文本'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {log.createdAt ? new Date(log.createdAt).toLocaleString() : '未知时间'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">IP: {log.ip || '未知'}</div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Chat Histories */}
              {selectedUser.chatHistories && selectedUser.chatHistories.length > 0 && (
                <Card className="rounded-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageSquare className="w-5 h-5" />
                      最近聊天记录
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {selectedUser.chatHistories.map((history) => (
                        <div key={history.id} className="p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{history.domain?.title || '未知领域'}</Badge>
                            <span className="text-xs text-gray-500">
                              {history.createdAt ? new Date(history.createdAt).toLocaleString() : '未知时间'}
                            </span>
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">{history.role === 'user' ? '用户' : 'AI'}:</span>{' '}
                            <span className="text-gray-700">
                              {history.content && history.content.length > 100
                                ? history.content.substring(0, 100) + '...'
                                : history.content || '无内容'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {(!selectedUser.legalLogs || selectedUser.legalLogs.length === 0) &&
                (!selectedUser.chatHistories || selectedUser.chatHistories.length === 0) &&
                (!selectedUser.devices || selectedUser.devices.length === 0) &&
                (!selectedUser.activationCodes || selectedUser.activationCodes.length === 0) &&
                (!selectedUser.statusLogs || selectedUser.statusLogs.length === 0) && (
                  <Card className="rounded-xl">
                    <CardContent className="pt-6 text-center text-gray-500">
                      <p>暂无额外信息</p>
                    </CardContent>
                  </Card>
                )}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUserDetail(false)}
              className="rounded-full"
            >
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>
              {statusChangeTarget === 'BANNED' ? '封禁用户' : '解封用户'}
            </DialogTitle>
            <DialogDescription>
              请填写{statusChangeTarget === 'BANNED' ? '封禁' : '解封'}原因，此记录将被永久保存
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="status-reason">变更原因 *</Label>
              <Input
                id="status-reason"
                type="text"
                value={statusChangeReason}
                onChange={(e) => setStatusChangeReason(e.target.value)}
                placeholder={`例如：${statusChangeTarget === 'BANNED' ? '违反使用条款，发布违规内容' : '误操作，已核实用户行为正常'}`}
                className="rounded-xl mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                必填项，用于记录审计日志
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowStatusDialog(false);
                setStatusChangeUserId(null);
                setStatusChangeTarget(null);
                setStatusChangeReason('');
              }}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              onClick={handleStatusChange}
              disabled={updating === statusChangeUserId || !statusChangeReason.trim()}
              className="rounded-full"
            >
              {updating === statusChangeUserId ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                '确认'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
