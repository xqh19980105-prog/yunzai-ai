'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api/axios';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, Activity, Loader2 } from 'lucide-react';

interface DashboardStats {
  dailyRegisters: number;
  activeMembers: number;
  apiUsage: number;
}

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/admin/stats');
      // Ensure stats has default values
      setStats({
        dailyRegisters: response.data?.dailyRegisters || 0,
        activeMembers: response.data?.activeMembers || 0,
        apiUsage: response.data?.apiUsage || 0,
      });
    } catch (error) {
      console.error('Failed to load stats:', error);
      // Set default stats on error
      setStats({ dailyRegisters: 0, activeMembers: 0, apiUsage: 0 });
    } finally {
      setLoading(false);
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
      <h1 className="text-3xl font-bold mb-6">仪表板</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Daily Registers */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">今日注册</CardTitle>
            <Users className="w-5 h-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.dailyRegisters || 0}</div>
            <CardDescription className="mt-1">新用户注册数</CardDescription>
          </CardContent>
        </Card>

        {/* Active Members */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">活跃会员</CardTitle>
            <UserCheck className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.activeMembers || 0}</div>
            <CardDescription className="mt-1">当前有效会员数</CardDescription>
          </CardContent>
        </Card>

        {/* API Usage */}
        <Card className="rounded-xl shadow-soft">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">API 使用量</CardTitle>
            <Activity className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.apiUsage || 0}</div>
            <CardDescription className="mt-1">今日 API 调用次数</CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
