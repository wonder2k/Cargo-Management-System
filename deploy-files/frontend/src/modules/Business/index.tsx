import React, { useState } from 'react';
import { Tabs, Card, Typography, Badge, Row, Col, Statistic, Button, Table, Tag } from 'antd';
import { Coins, Globe, Briefcase, Plus, Search, Filter, TrendingUp, Users } from 'lucide-react';

const { Title, Text } = Typography;

export const BusinessModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rates');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>Sales & Business Center</Title>
          <Text type="secondary">Manage pricing, quotations and air cargo bookings</Text>
        </div>
        <Button type="primary" icon={<Plus size={16} />} className="bg-blue-600">New Quotation</Button>
      </div>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title="Total Revenue" value={245000} prefix={<TrendingUp size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-green-50">
            <Statistic title="Active Quotes" value={18} prefix={<Globe size={18} className="mr-2 text-green-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-purple-50">
            <Statistic title="Confirmed Bookings" value={12} prefix={<Briefcase size={18} className="mr-2 text-purple-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-indigo-50">
            <Statistic title="CRM Clients" value={45} prefix={<Users size={18} className="mr-2 text-indigo-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'rates',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Coins size={16} /> <span>Rates Cabinet</span>
                </div>
              ),
              children: <RatesTable />
            },
            {
              key: 'quotes',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Globe size={16} /> <span>Quote History</span>
                </div>
              ),
              children: <div className="py-20 text-center text-slate-400">Loading Quotation Database...</div>
            },
            {
              key: 'bookings',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Briefcase size={16} /> <span>Air Bookings</span>
                </div>
              ),
              children: <BookingsTable />
            },
            {
               key: 'crm',
               label: (
                 <div className="flex items-center gap-2 px-4 py-2">
                   <Users size={16} /> <span>Customer CRM</span>
                 </div>
               ),
               children: <div className="py-20 text-center text-slate-400">Syncing CRM Records...</div>
            }
          ]}
        />
      </Card>
    </div>
  );
};

const RatesTable = () => (
  <Table 
    dataSource={[
      { id: 1, origin: 'PVG', dest: 'FRA', carrier: 'CA', price: '12.5', fuel: '4.5', sc: '1.2' },
      { id: 2, origin: 'SZX', dest: 'ORD', carrier: 'CX', price: '18.4', fuel: '5.2', sc: '1.5' },
    ]}
    columns={[
      { title: 'Origin', dataIndex: 'origin', key: 'origin' },
      { title: 'Destination', dataIndex: 'dest', key: 'dest' },
      { title: 'Carrier', dataIndex: 'carrier', key: 'carrier' },
      { title: 'Base Price', dataIndex: 'price', key: 'price', render: (v) => `¥${v}/kg` },
      { title: 'Action', render: () => <Button type="link">Quote</Button> }
    ]}
  />
);

const BookingsTable = () => (
  <Table 
    dataSource={[
      { id: 1, bookingNo: 'BK-001', customer: 'Huawei', mawbNeeded: true, status: 'Pending Space' },
      { id: 2, bookingNo: 'BK-002', customer: 'Xiaomi', mawbNeeded: false, status: 'Confirmed' },
    ]}
    columns={[
      { title: 'Booking No', dataIndex: 'bookingNo', key: 'bookingNo' },
      { title: 'Customer', dataIndex: 'customer', key: 'customer' },
      { 
        title: 'Status', 
        dataIndex: 'status', 
        render: (s) => <Tag color={s === 'Confirmed' ? 'green' : 'orange'}>{s}</Tag> 
      },
      { title: 'Action', render: () => <Button size="small">Edit</Button> }
    ]}
  />
);
