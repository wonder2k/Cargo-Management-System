import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Table, Tag, Typography, theme } from 'antd';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MAWB, MawbStatus } from '../../types';
import { 
  Package, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp,
  Clock,
  CreditCard,
  ChevronRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { CreditService } from '../../services/CreditService';
import { Customer } from '../../types';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    departed: 0,
    arrived: 0,
    exception: 0,
  });
  const [recentMawbs, setRecentMawbs] = useState<MAWB[]>([]);
  const [stuckCount, setStuckCount] = useState(0);
  const [creditWarnings, setCreditWarnings] = useState<any[]>([]);
  const { token } = theme.useToken();

  useEffect(() => {
    const fetchData = async () => {
      const q = query(collection(db, 'mawbs'));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MAWB));
      
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
      
      setStats({
        total: data.length,
        pending: data.filter(m => m.status === 'pending').length,
        departed: data.filter(m => m.status === 'departed').length,
        arrived: data.filter(m => m.status === 'arrived').length,
        exception: data.filter(m => m.status === 'exception').length,
      });

      setStuckCount(data.filter(m => 
        m.status !== 'closed' && 
        m.status !== 'arrived' && 
        new Date(m.lastUpdated) < twoHoursAgo
      ).length);

      setRecentMawbs(data.sort((a, b) => b.lastUpdated.localeCompare(a.lastUpdated)).slice(0, 5));

      // Credit warnings
      try {
        const balances = await CreditService.getAllCustomerBalances();
        const custSnap = await getDocs(collection(db, 'customers'));
        const customers = custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer));
        
        const warnings = customers
          .map(c => ({
            name: c.name,
            balance: balances[c.id] || 0,
            limit: c.creditLimit,
            currency: c.creditCurrency
          }))
          .filter(w => w.balance >= w.limit && w.limit > 0);
        
        setCreditWarnings(warnings);
      } catch (e) {
        console.error('Failed to fetch credit data', e);
      }
    };

    fetchData();
  }, []);

  const chartData = [
    { name: 'Pending', value: stats.pending },
    { name: 'Departed', value: stats.departed },
    { name: 'Arrived', value: stats.arrived },
    { name: 'Exception', value: stats.exception },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">{t('menu.dashboard')}</h1>
        <p className="text-slate-500 text-sm">{t('app.welcome')}</p>
      </div>
      
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" className="rounded-xl border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">{t('dashboard.totalShipments')}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stats.total}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" className="rounded-xl border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">{t('dashboard.onTimeDeparture')}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stats.pending}</span>
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">{t('dashboard.targetLabel')}: 92%</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" className="rounded-xl border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500 mb-1">{t('dashboard.inTransit')}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-slate-900">{stats.departed}</span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-1 rounded">{t('dashboard.next12h')}</span>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card variant="outlined" className="rounded-xl border-slate-200 shadow-sm border-red-100 bg-red-50/5">
            <p className="text-sm text-red-500 mb-1">{t('dashboard.criticalExceptions')}</p>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-red-600">{stats.exception}</span>
              <span className="text-xs font-semibold text-red-600 bg-red-50 px-2 py-1 rounded">{t('dashboard.actionReq')}</span>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col xs={24} lg={16}>
          <Card title={t('dashboard.statusOverview')} variant="borderless" className="shadow-sm h-full">
            <div style={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="value" fill={token.colorPrimary} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title={t('dashboard.alerts')} variant="borderless" className="shadow-sm h-full">
             <div className="space-y-4">
                {creditWarnings.length > 0 && (
                   <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                    <CreditCard size={18} className="text-red-500 mt-1" />
                    <div className="flex-1">
                      <Text strong className="text-red-700 uppercase text-[10px]">{t('dashboard.creditLimitBreach')}</Text>
                      <ul className="mt-2 space-y-1">
                        {creditWarnings.map((w, i) => (
                          <li key={i} className="flex justify-between text-[11px] text-red-600 font-medium">
                            <span>{w.name}</span>
                            <span>{w.currency} {w.balance.toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
                {stats.exception > 0 && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                    <AlertTriangle size={18} className="text-red-500 mt-1" />
                    <div>
                      <Text strong className="text-red-700">{t('common.actions')}</Text>
                      <br />
                      <Text className="text-red-600 text-sm">{stats.exception} {t('dashboard.criticalExceptions').toLowerCase()}</Text>
                    </div>
                  </div>
                )}
                {stuckCount > 0 && (
                  <div className="p-3 bg-orange-50 border border-orange-100 rounded-lg flex items-start gap-3">
                    <Clock size={18} className="text-orange-500 mt-1" />
                    <div>
                      <Text strong className="text-orange-700">{t('dashboard.actionDelayed')}</Text>
                      <br />
                      <Text className="text-orange-600 text-sm">{stuckCount} {t('dashboard.stuckFor')}</Text>
                    </div>
                  </div>
                )}
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg flex items-start gap-3">
                    <Clock size={18} className="text-blue-500 mt-1" />
                    <div>
                      <Text strong className="text-blue-700">{t('dashboard.pendingApprovals')}</Text>
                      <br />
                      <Text className="text-blue-600 text-sm">3 {t('dashboard.awaitingReview')}</Text>
                    </div>
                </div>
             </div>
          </Card>
        </Col>
      </Row>

      <div className="mt-8 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{t('dashboard.highPriority')}</h2>
            <p className="text-sm text-slate-500">{t('dashboard.realtimeTrackingDesc')}</p>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors">
            {t('dashboard.exportData')}
          </button>
        </div>
        
        <Table 
          dataSource={recentMawbs} 
          pagination={false} 
          rowKey="id"
          className="professional-table"
          columns={[
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('dashboard.awbNumber')}</span>, 
              dataIndex: 'internalMawbNo', 
              render: (text, record) => (
                <div className="py-1">
                  <span className="text-sm font-mono font-semibold text-blue-600">{text}</span>
                  <p className="text-[10px] text-slate-400 font-sans">{record.airlineMawbNo || t('dashboard.pendingAirlineAwb')}</p>
                </div>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('dashboard.originDest')}</span>, 
              render: (_, r) => (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">{r.origin}</span>
                  <ChevronRight size={12} className="text-slate-300" />
                  <span className="text-sm font-bold text-slate-700">{r.destination}</span>
                </div>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('operation.status')}</span>, 
              dataIndex: 'status',
              render: (status: MawbStatus) => {
                const styles: Record<string, string> = {
                  pending: 'bg-orange-100 text-orange-700',
                  departed: 'bg-blue-100 text-blue-700',
                  arrived: 'bg-green-100 text-green-700',
                  exception: 'bg-red-100 text-red-700',
                  closed: 'bg-slate-100 text-slate-600'
                };
                return (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${styles[status] || 'bg-slate-100 text-slate-600'}`}>
                    {status.replace('_', ' ')}
                  </span>
                );
              }
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right block">{t('dashboard.lastActivity')}</span>, 
              dataIndex: 'lastUpdated', 
              align: 'right',
              render: (date) => (
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-700">{new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  <p className="text-[10px] text-slate-400 uppercase">{new Date(date).toLocaleDateString()}</p>
                </div>
              )
            }
          ]}
        />
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <p className="text-[10px] text-slate-500 italic uppercase font-medium tracking-tight">{t('dashboard.dataSync')}: Live Stream • {t('dashboard.regionLabel')}: HKG-AP-01</p>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-bold text-slate-400 hover:text-slate-600 cursor-pointer uppercase transition-colors">{t('dashboard.viewAll')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
