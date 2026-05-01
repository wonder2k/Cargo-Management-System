import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Tag, Input, Typography, Tabs, Badge, Progress, Modal, Form, Row, Col, Statistic } from 'antd';
import { Plane, Search, Filter, Info, CheckCircle2, AlertCircle, Clock, Package, FileText, ArrowRight } from 'lucide-react';
import api from '../../services/api';

const { Text, Title } = Typography;

export const OperationModule: React.FC = () => {
  const [mawbs, setMawbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  const fetchMawbs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/operation/mawbs');
      setMawbs(response.data);
    } catch (e) {
      setMawbs([
        { id: 1, mawbNo: '999-12345678', origin: 'PVG', destination: 'FRA', status: 'arrived', weight: 540, pieces: 12, lastUpdated: '2025-05-01' },
        { id: 2, mawbNo: '160-87654321', origin: 'HKG', destination: 'LHR', status: 'warehouse_in', weight: 1200, pieces: 45, lastUpdated: '2025-05-02' },
        { id: 3, mawbNo: 'SH-20250503-01', origin: 'SZX', destination: 'ORD', status: 'booked', weight: 85, pieces: 2, lastUpdated: '2025-05-03' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMawbs();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'arrived': return 'green';
      case 'departed': return 'blue';
      case 'customs': return 'purple';
      case 'warehouse_in': return 'cyan';
      case 'booked': return 'orange';
      default: return 'default';
    }
  };

  const columns = [
    { 
      title: 'MAWB No', 
      dataIndex: 'mawbNo', 
      key: 'mawbNo',
      render: (text) => <Text className="font-mono font-bold text-blue-600">{text}</Text>
    },
    { 
      title: 'Route', 
      key: 'route',
      render: (_, r) => <Tag className="bg-slate-50 border-slate-200">{r.origin} → {r.destination}</Tag>
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => <Tag color={getStatusColor(status)} className="capitalize px-3 rounded-full">{status.replace('_', ' ')}</Tag>
    },
    { 
      title: 'Cargo Info', 
      key: 'cargo',
      render: (_, r) => (
        <div className="text-xs">
          <Text className="block">{r.weight} kg</Text>
          <Text type="secondary">{r.pieces} pcs</Text>
        </div>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <Button type="text" size="small" icon={<Info size={14} />} />
          <Button type="primary" size="small" className="bg-blue-600 text-[10px] h-7">Next Step</Button>
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>Operation Management</Title>
          <Text type="secondary">Track shipments and process cargo operations</Text>
        </div>
        <Space>
           <Input 
            prefix={<Search size={16} className="text-slate-400" />} 
            placeholder="Search MAWB..." 
            className="w-64"
          />
          <Button icon={<Filter size={16} />}>Advanced Filter</Button>
        </Space>
      </div>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-slate-50">
            <Statistic title="Total Active" value={mawbs.length} prefix={<Plane size={18} className="mr-2" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-slate-50">
            <Statistic title="Pending Customs" value={3} prefix={<AlertCircle size={18} className="mr-2 text-purple-500" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-slate-50">
            <Statistic title="Warehouse In" value={8} prefix={<Package size={18} className="mr-2 text-cyan-500" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-slate-50">
            <Statistic title="Critical Delay" value={1} prefix={<Clock size={18} className="mr-2 text-red-500" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { 
              key: 'active', 
              label: <Badge count={mawbs.length} offset={[10, 0]}><span>Active Shipments</span></Badge>,
              children: <Table dataSource={mawbs} columns={columns} pagination={{ pageSize: 10 }} loading={loading} rowKey="id" />
            },
            { 
              key: 'bookings', 
              label: <Badge count={5} offset={[10, 0]} status="warning"><span>Pending Bookings</span></Badge>,
              children: (
                <div className="py-8 text-center text-slate-400">
                  <FileText size={48} className="mx-auto mb-4 border-2 border-dashed p-3 rounded-full opacity-30" />
                  <p>All pending bookings have been processed</p>
                </div>
              )
            },
            { key: 'closed', label: 'History Archive' }
          ]}
        />
      </Card>
    </div>
  );
};
