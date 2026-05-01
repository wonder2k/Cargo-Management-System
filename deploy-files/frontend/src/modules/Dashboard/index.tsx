import React from 'react';
import { Card, Row, Col, Statistic, Table } from 'antd';
import { Package, Users, TrendingUp, AlertCircle } from 'lucide-react';

export const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Dashboard Overview</h1>
      
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Active MAWBs"
              value={124}
              prefix={<Package className="text-blue-500 mr-2" size={20} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Total Customers"
              value={48}
              prefix={<Users className="text-green-500 mr-2" size={20} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Monthly Revenue"
              value={854300}
              suffix="CNY"
              prefix={<TrendingUp className="text-purple-500 mr-2" size={20} />}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Pending Invoices"
              value={12}
              prefix={<AlertCircle className="text-amber-500 mr-2" size={20} />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="Recent Operations" className="shadow-sm">
        <Table
          pagination={false}
          dataSource={[
            { key: '1', no: 'MAWB-2025001', flow: 'PVG - FRA', status: 'In Transit' },
            { key: '2', no: 'MAWB-2025002', flow: 'HKG - LAX', status: 'Completed' },
            { key: '3', no: 'MAWB-2025003', flow: 'CAN - AMS', status: 'Draft' },
          ]}
          columns={[
            { title: 'MAWB No', dataIndex: 'no', key: 'no' },
            { title: 'Flow', dataIndex: 'flow', key: 'flow' },
            { title: 'Status', dataIndex: 'status', key: 'status' },
          ]}
        />
      </Card>
    </div>
  );
};
