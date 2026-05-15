import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Tag, Progress, Space, Badge } from 'antd';
import { Package, TrendingUp, AlertCircle, Clock, CheckCircle, ArrowUpRight, Plane, Wallet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { businessApi, operationApi, financeApi } from '../../services/api';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    totalShipments: 0, pendingBookings: 0, activeOperations: 0,
    monthlyRevenue: 0, revenueGrowth: 12.5, shipmentGrowth: 8.2
  });
  const [recentOperations, setRecentOperations] = useState<any[]>([]);
  const [mawbStats, setMawbStats] = useState({ pending: 0, departed: 0, arrived: 0, exception: 0 });
  const [creditWarnings, setCreditWarnings] = useState<any[]>([]);
  const [stuckCount, setStuckCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [dashRes, mawbRes, arRes, custRes] = await Promise.all([
          businessApi.getStats().catch(() => null),
          operationApi.getMawbs().catch(() => null),
          financeApi.getAR().catch(() => null),
          businessApi.getCustomers().catch(() => null),
        ]);

        if (dashRes) {
          setStats(dashRes.data.stats);
          setRecentOperations(dashRes.data.recentOperations || []);
        }

        // Real MAWB status distribution
        if (mawbRes && mawbRes.data) {
          const mawbs = mawbRes.data;
          setMawbStats({
            pending: mawbs.filter((m: any) => m.status === 'pending').length,
            departed: mawbs.filter((m: any) => m.status === 'departed').length,
            arrived: mawbs.filter((m: any) => m.status === 'arrived').length,
            exception: mawbs.filter((m: any) => m.status === 'exception').length,
          });
          // Stuck count — active for 2h+ without update
          const twoHAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
          setStuckCount(mawbs.filter((m: any) =>
            m.status !== 'closed' && m.status !== 'arrived' &&
            new Date(m.updatedAt || m.createdAt) < twoHAgo
          ).length);
        }

        // Credit warnings from AR data
        if (arRes && arRes.data && custRes && custRes.data) {
          const arItems = arRes.data;
          const customers = custRes.data;
          const balances: Record<string, number> = {};
          arItems.forEach((ar: any) => {
            if (ar.status !== 'paid') {
              balances[ar.customerId] = (balances[ar.customerId] || 0) + Number(ar.totalAmount);
            }
          });
          setCreditWarnings(customers
            .filter((c: any) => balances[c.id] >= (c.creditLimit || 0) && c.creditLimit > 0)
            .map((c: any) => ({ name: c.name, balance: balances[c.id], limit: c.creditLimit, currency: c.creditCurrency || 'CNY' }))
          );
        }
      } catch { /* use defaults */ }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const chartData = [
    { name: t('booking.status.pending'), value: mawbStats.pending },
    { name: t('booking.status.departed'), value: mawbStats.departed },
    { name: t('booking.status.arrived'), value: mawbStats.arrived },
    { name: t('operation.exception'), value: mawbStats.exception },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <Title level={2} className="!mb-1">{t('dashboard.overview')}</Title>
          <Text type="secondary">{t('dashboard.overviewSubtitle')}</Text>
        </div>
        <div className="bg-slate-100 p-1 rounded-lg flex gap-2">
          <Badge status="processing" text={t('dashboard.systemLive')} className="px-3" />
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-blue-500">
            <Statistic title={t('dashboard.totalShipments')} value={stats.totalShipments}
              prefix={<Package className="text-blue-500 mr-2" size={18} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-amber-500">
            <Statistic title={t('dashboard.pendingBookings')} value={stats.pendingBookings}
              prefix={<Clock className="text-amber-500 mr-2" size={18} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-purple-500">
            <Statistic title={t('dashboard.activeOperations')} value={stats.activeOperations}
              prefix={<Plane className="text-purple-500 mr-2" size={18} />} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-green-500">
            <Statistic title={t('dashboard.monthlyRevenue')} value={stats.monthlyRevenue}
              prefix={<Wallet className="text-green-500 mr-2" size={18} />} precision={0} suffix="¥" />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card title={<div className="flex items-center gap-2"><TrendingUp size={18} /><span>{t('dashboard.overview')} — MAWB Status</span></div>} className="shadow-sm">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((_e, i) => (
                      <Cell key={i} fill={['#f59e0b', '#3b82f6', '#22c55e', '#ef4444'][i]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t('dashboard.quickAlerts')} className="shadow-sm">
            <div className="space-y-4">
              {creditWarnings.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-500 mt-1" />
                  <div>
                    <Text strong className="text-red-700 text-xs uppercase">{t('dashboard.creditOverflow')}</Text>
                    <ul className="mt-1 text-xs text-red-600">
                      {creditWarnings.map((w, i) => (
                        <li key={i}>{w.name}: {w.currency} {w.balance.toLocaleString()} / {w.limit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {mawbStats.exception > 0 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                  <AlertCircle size={18} className="text-red-500 mt-1" />
                  <div>
                    <Text strong className="text-red-700">{t('operation.exception')}</Text>
                    <Text className="text-red-600 text-sm block">{mawbStats.exception} shipments with exceptions</Text>
                  </div>
                </div>
              )}
              {stuckCount > 0 && (
                <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
                  <Clock size={18} className="text-orange-500 mt-1" />
                  <div>
                    <Text strong className="text-orange-700">Delayed Operations</Text>
                    <Text className="text-orange-600 text-sm block">{stuckCount} shipments stuck for 2h+</Text>
                  </div>
                </div>
              )}
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                <CheckCircle size={18} className="text-blue-500 mt-1" />
                <div>
                  <Text strong className="text-blue-700">System Status</Text>
                  <Text className="text-blue-600 text-sm block">All systems operational</Text>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={<div className="flex items-center gap-2"><CheckCircle size={18} /><span>{t('dashboard.recentActivities')}</span></div>} className="shadow-sm">
        <Table pagination={false} loading={loading} dataSource={recentOperations}
          columns={[
            { title: 'MAWB', dataIndex: 'no', render: (t: string) => <Text className="font-mono font-bold text-blue-600">{t}</Text> },
            { title: 'Route', dataIndex: 'flow', render: (t: string) => <Tag className="bg-slate-100 border-none">{t}</Tag> },
            { title: t('common.status'), dataIndex: 'status', render: (s: string) => {
                const colors: Record<string, string> = { Completed: 'green', Draft: 'orange' };
                return <Badge status={(colors[s] || 'default') as any} text={s} />;
            }},
            { title: t('common.date'), dataIndex: 'date', render: (t: string) => <Text type="secondary" className="text-xs">{t}</Text> },
          ]} />
      </Card>
    </div>
  );
};
