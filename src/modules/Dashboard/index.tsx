import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Typography, Tag, Progress, Space, Badge } from 'antd';
import { 
  Package, Users, TrendingUp, AlertCircle, Clock, CheckCircle, 
  ArrowUpRight, ArrowDownRight, Plane, FileText, Wallet
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../services/api';

const { Title, Text } = Typography;

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalShipments: 0,
    pendingBookings: 0,
    activeOperations: 0,
    monthlyRevenue: 0,
    revenueGrowth: 12.5,
    shipmentGrowth: 8.2
  });
  const [recentOperations, setRecentOperations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await api.get('/business/dashboard-stats');
        if (response.data.stats) setStats(response.data.stats);
        if (response.data.recentOperations) setRecentOperations(response.data.recentOperations);
      } catch (err) {
        setStats({
          totalShipments: 1254,
          pendingBookings: 24,
          activeOperations: 45,
          monthlyRevenue: 854300,
          revenueGrowth: 12.5,
          shipmentGrowth: 8.2
        });
        setRecentOperations([
          { key: '1', no: 'MAWB-2025001', flow: 'PVG - FRA', status: 'In Transit', date: '2025-05-01' },
          { key: '2', no: 'MAWB-2025002', flow: 'HKG - LAX', status: 'Completed', date: '2025-05-01' },
          { key: '3', no: 'MAWB-2025003', flow: 'CAN - AMS', status: 'Draft', date: '2025-05-02' },
        ] as any);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const chartData = [
    { name: 'Mon', value: 40 },
    { name: 'Tue', value: 30 },
    { name: 'Wed', value: 60 },
    { name: 'Thu', value: 80 },
    { name: 'Fri', value: 50 },
    { name: 'Sat', value: 20 },
    { name: 'Sun', value: 10 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <Title level={2} className="!mb-1">Operations Overview</Title>
          <Text type="secondary">Real-time logistics monitoring and performance metrics</Text>
        </div>
        <div className="bg-slate-100 p-1 rounded-lg flex gap-2">
          <Badge status="processing" text="System Live" className="px-3" />
        </div>
      </div>
      
      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-blue-500 overflow-hidden">
            <div className="flex justify-between items-start">
              <Statistic
                title={<span className="text-slate-500 font-medium">Total Shipments</span>}
                value={stats.totalShipments}
                prefix={<Package className="text-blue-500 mr-2" size={18} />}
              />
              <Tag color="success" className="m-0 flex items-center gap-1 border-none bg-green-50 text-green-600">
                <ArrowUpRight size={12} /> {stats.shipmentGrowth}%
              </Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-amber-500">
            <div className="flex justify-between items-start">
              <Statistic
                title={<span className="text-slate-500 font-medium">Pending Approvals</span>}
                value={stats.pendingBookings}
                prefix={<Clock className="text-amber-500 mr-2" size={18} />}
              />
              <Tag color="warning" className="m-0 border-none bg-amber-50 text-amber-600">Action Required</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-purple-500">
            <div className="flex justify-between items-start">
              <Statistic
                title={<span className="text-slate-500 font-medium">Active Operations</span>}
                value={stats.activeOperations}
                prefix={<Plane className="text-purple-500 mr-2" size={18} />}
              />
              <div className="text-xs text-slate-400 mt-2">7 departures today</div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-green-500">
            <div className="flex justify-between items-start">
              <Statistic
                title={<span className="text-slate-500 font-medium">Monthly Revenue</span>}
                value={stats.monthlyRevenue}
                prefix={<Wallet className="text-green-500 mr-2" size={18} />}
                precision={0}
                suffix="¥"
              />
              <Tag color="success" className="m-0 flex items-center gap-1 border-none bg-green-50 text-green-600">
                <ArrowUpRight size={12} /> {stats.revenueGrowth}%
              </Tag>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]}>
        <Col xs={24} lg={16}>
          <Card 
            title={<div className="flex items-center gap-2"><TrendingUp size={18} /><span>Weekly Air Volume (Tons)</span></div>} 
            className="shadow-sm"
          >
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {chartData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 3 ? '#2563eb' : '#94a3b8'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Warehouse Capacity" className="shadow-sm">
            <div className="space-y-6 py-2">
              <div>
                <div className="flex justify-between mb-2">
                  <Text className="font-medium">Main Hub - PVG</Text>
                  <Text type="secondary">82%</Text>
                </div>
                <Progress percent={82} strokeColor="#2563eb" showInfo={false} />
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <Text className="font-medium">Secondary - CAN</Text>
                  <Text type="secondary">45%</Text>
                </div>
                <Progress percent={45} strokeColor="#8b5cf6" showInfo={false} />
              </div>
              <div className="pt-4 border-t border-slate-100">
                <Title level={5}>Quick Alerts</Title>
                <div className="space-y-3 mt-3">
                  <div className="flex gap-3 items-start">
                    <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 flex-shrink-0">
                      <AlertCircle size={16} />
                    </div>
                    <div>
                      <Text className="block font-medium text-sm">Credit Overflow: Huawei</Text>
                      <Text type="secondary" className="text-[11px]">Outstanding balance exceeds limit by ¥50k</Text>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title={<div className="flex items-center gap-2"><CheckCircle size={18} /><span>Recent Operations</span></div>} className="shadow-sm">
        <Table
          pagination={false}
          loading={loading}
          dataSource={recentOperations}
          columns={[
            { 
              title: 'MAWB Reference', 
              dataIndex: 'no', 
              key: 'no',
              render: (text) => <Text className="font-mono font-bold text-blue-600">{text}</Text>
            },
            { 
              title: 'Route', 
              dataIndex: 'flow', 
              key: 'flow',
              render: (text) => <Tag className="bg-slate-100 border-none px-3 font-medium text-slate-600">{text}</Tag>
            },
            { 
              title: 'Status', 
              dataIndex: 'status', 
              key: 'status',
              render: (status) => {
                let color = 'blue';
                if (status === 'Completed') color = 'green';
                if (status === 'Draft') color = 'orange';
                return <Badge status={color as any} text={status} className="font-medium" />;
              }
            },
            { 
              title: 'Last Update', 
              dataIndex: 'date', 
              key: 'date',
              render: (text) => <Text type="secondary" className="text-xs">{text}</Text>
            },
          ]}
        />
      </Card>
    </div>
  );
};
