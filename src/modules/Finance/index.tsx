import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Tag, Typography, Tabs, Row, Col, Statistic, App } from 'antd';
import { ArrowUpRight, ArrowDownLeft, FileText, DollarSign } from 'lucide-react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

export const FinanceModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('ar');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const { t } = useTranslation();

  const fetchFinanceData = async (type: string) => {
    setLoading(true);
    try {
      const endpoint = type === 'ar' ? '/finance/receivables' : '/finance/payables';
      const res = await api.get(endpoint);
      setData(res.data);
    } catch (e) {
      setData([
        { id: 1, invoiceNo: 'INV-2025001', customerName: 'Huawei Logistics', mawbNo: '999-12345678', amount: 12500, currency: 'CNY', status: 'pending', dueDate: '2025-06-01' },
        { id: 2, invoiceNo: 'INV-2025002', customerName: 'Xiaomi HK', mawbNo: '160-87654321', amount: 8400, currency: 'USD', status: 'paid', dueDate: '2025-05-15' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData(activeTab);
  }, [activeTab]);

  const columns = [
    { 
      title: 'Invoice / Ref', 
      dataIndex: 'invoiceNo', 
      render: (t: string) => <Text className="font-mono font-bold text-blue-600">{t}</Text> 
    },
    { title: 'Entity', dataIndex: 'customerName' },
    { title: 'MAWB No', dataIndex: 'mawbNo', render: (t: string) => <Text type="secondary" className="font-mono">{t}</Text> },
    { 
      title: 'Amount', 
      dataIndex: 'amount', 
      render: (v: number, r: any) => (
        <Text strong className={activeTab === 'ar' ? 'text-green-600' : 'text-red-600'}>
          {r.currency} {v.toLocaleString()}
        </Text>
      )
    },
    { 
      title: 'Status', 
      dataIndex: 'status', 
      render: (s: string) => (
        <Tag color={s === 'paid' ? 'green' : 'orange'} className="rounded-full px-3">
          {s.toUpperCase()}
        </Tag>
      )
    },
    { title: 'Due Date', dataIndex: 'dueDate' },
    {
      title: 'Action',
      render: (_: any, record: any) => (
        <Space>
           <Button size="small" icon={<FileText size={14}/>}>View</Button>
           {record.status !== 'paid' && <Button size="small" type="primary" className="bg-blue-600">Reconcile</Button>}
        </Space>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>Financial Settlement</Title>
          <Text type="secondary">Accounts Receivable, Payable and Net Profit tracking</Text>
        </div>
      </div>

      <Row gutter={20}>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-green-50">
            <Statistic title="Accounts Receivable" value={452000} prefix={<ArrowUpRight size={18} className="mr-2 text-green-600" />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-red-50">
            <Statistic title="Accounts Payable" value={321000} prefix={<ArrowDownLeft size={18} className="mr-2 text-red-600" />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title="Net Estimated Profit" value={131000} prefix={<DollarSign size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'ar',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <ArrowUpRight size={16} /> <span>Receivables (AR)</span>
                </div>
              ),
              children: <Table dataSource={data} columns={columns} loading={loading} rowKey="id" />
            },
            {
              key: 'ap',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <ArrowDownLeft size={16} /> <span>Payables (AP)</span>
                </div>
              ),
              children: <Table dataSource={data} columns={columns} loading={loading} rowKey="id" />
            }
          ]}
        />
      </Card>
    </div>
  );
};
