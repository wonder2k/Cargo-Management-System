import React from 'react';
import { Table, Button, Space, Card, Tag } from 'antd';
import { Plus, Search } from 'lucide-react';

export const BusinessModule: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold">Business Management</h1>
        <Button type="primary" icon={<Plus size={16} />}>New Customer</Button>
      </div>
      
      <Card>
        <Table
          dataSource={[
            { id: 1, name: 'Global Logistics Co.', contact: 'John Smith', type: 'Agent', tier: 'Gold' },
            { id: 2, name: 'Sino Air Services', contact: 'Li Wei', type: 'Direct Customer', tier: 'Silver' },
          ]}
          columns={[
            { title: 'Customer Name', dataIndex: 'name', key: 'name' },
            { title: 'Contact', dataIndex: 'contact', key: 'contact' },
            { title: 'Type', dataIndex: 'type', key: 'type' },
            { 
              title: 'Tier', 
              dataIndex: 'tier', 
              key: 'tier',
              render: (tier) => <Tag color={tier === 'Gold' ? 'gold' : 'silver'}>{tier}</Tag>
            },
            {
              title: 'Action',
              key: 'action',
              render: () => (
                <Space>
                  <Button size="small">Edit</Button>
                  <Button size="small" type="link">View History</Button>
                </Space>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};
