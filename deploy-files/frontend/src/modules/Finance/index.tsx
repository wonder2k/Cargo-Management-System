import React from 'react';
import { Table, Button, Space, Card, Statistic, Row, Col } from 'antd';
import { FileText, Download } from 'lucide-react';

export const FinanceModule: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Financial Center</h1>
      
      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Awaiting Payment" value={45200} precision={2} prefix="¥" />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false}>
            <Statistic title="Overdue" value={12000} precision={2} prefix="¥" valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
      </Row>
      
      <Card title="Latest Invoices">
        <Table
          dataSource={[
            { id: 'INV-001', customer: 'Global Logistics', amount: 15600, date: '2025-04-28', status: 'Unpaid' },
            { id: 'INV-002', customer: 'Sino Air', amount: 8900, date: '2025-04-25', status: 'Paid' },
          ]}
          columns={[
            { title: 'Invoice ID', dataIndex: 'id', key: 'id' },
            { title: 'Customer', dataIndex: 'customer', key: 'customer' },
            { title: 'Amount', dataIndex: 'amount', key: 'amount' },
            { title: 'Status', dataIndex: 'status', key: 'status' },
            {
              title: 'Action',
              render: () => (
                <Button icon={<Download size={14} />} size="small">PDF</Button>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};
