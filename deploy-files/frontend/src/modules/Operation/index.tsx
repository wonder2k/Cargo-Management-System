import React from 'react';
import { Table, Button, Space, Card, Tag, Input } from 'antd';
import { Plane, Search, Filter } from 'lucide-react';

export const OperationModule: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Operation Dashboard</h1>
        <Space>
          <Input prefix={<Search size={16} className="text-slate-400" />} placeholder="Search MAWB..." />
          <Button icon={<Filter size={16} />}>Filters</Button>
        </Space>
      </div>
      
      <Card>
        <Table
          dataSource={[
            { id: 'MAWB001', airline: 'CA', route: 'SHA-CDG', weight: '540 kg', vol: '2.4 cbm', status: 'Booked' },
            { id: 'MAWB002', airline: 'LH', route: 'PVG-FRA', weight: '1200 kg', vol: '5.6 cbm', status: 'Pending' },
          ]}
          columns={[
            { title: 'MAWB No', dataIndex: 'id', key: 'id' },
            { title: 'Airline', dataIndex: 'airline', key: 'airline' },
            { title: 'Route', dataIndex: 'route', key: 'route' },
            { title: 'Weight', dataIndex: 'weight', key: 'weight' },
            { 
              title: 'Status', 
              dataIndex: 'status', 
              key: 'status',
              render: (status) => <Tag color="blue">{status}</Tag>
            }
          ]}
        />
      </Card>
    </div>
  );
};
