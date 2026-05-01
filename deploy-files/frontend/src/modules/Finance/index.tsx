import React, { useState } from 'react';
import { Table, Tag, Card, Row, Col, Statistic, Button, Typography, Tabs, Space } from 'antd';
import { Wallet, FileText, CheckCircle, AlertCircle, TrendingUp, Download } from 'lucide-react';

const { Title, Text } = Typography;

export const FinanceModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>Finance & Settlement</Title>
          <Text type="secondary">Manage accounts receivable, internal billing and financial reporting</Text>
        </div>
        <Space>
           <Button icon={<Download size={16} />}>Export Report</Button>
           <Button type="primary" className="bg-blue-600">New Statement</Button>
        </Space>
      </div>

      <Row gutter={20}>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-emerald-50">
            <Statistic title="Total Receivables (AR)" value={125840} prefix={<Wallet size={18} className="mr-2 text-emerald-600" />} suffix="¥" />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-rose-50">
            <Statistic title="Total Payables (AP)" value={84200} prefix={<FileText size={18} className="mr-2 text-rose-600" />} suffix="¥" />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title="Net Profit (Est.)" value={41640} prefix={<TrendingUp size={18} className="mr-2 text-blue-600" />} suffix="¥" />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs
          items={[
            {
              key: 'ar',
              label: 'Accounts Receivable',
              children: (
                <Table 
                  dataSource={[
                    { id: 1, invoiceNo: 'INV-2025001', customer: 'Huawei', mawb: '999-12345678', amount: 12500, status: 'unpaid' },
                    { id: 2, invoiceNo: 'INV-2025002', customer: 'Xiaomi', mawb: '160-87654321', amount: 8400, status: 'paid' },
                  ]}
                  columns={[
                    { title: 'Invoice No', dataIndex: 'invoiceNo', key: 'invoiceNo' },
                    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
                    { title: 'MAWB No', dataIndex: 'mawb', key: 'mawb', render: (t) => <Text className="font-mono">{t}</Text> },
                    { title: 'Amount', dataIndex: 'amount', render: (v) => `¥${v.toLocaleString()}` },
                    { 
                      title: 'Status', 
                      dataIndex: 'status', 
                      render: (s) => <Tag color={s === 'paid' ? 'green' : 'orange'}>{s.toUpperCase()}</Tag>
                    },
                    { title: 'Action', render: () => <Button type="link">View</Button> }
                  ]}
                />
              )
            },
            {
              key: 'ap',
              label: 'Accounts Payable',
              children: <div className="py-20 text-center text-slate-300 italic">No pending supplier invoices</div>
            }
          ]}
        />
      </Card>
    </div>
  );
};
