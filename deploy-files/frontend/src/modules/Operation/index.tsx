import React, { useState } from 'react';
import { Card, Typography, Tabs, Badge, Row, Col, Statistic } from 'antd';
import { Plane, Clock, Package, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MawbList } from './MawbList';

const { Text, Title } = Typography;

export const OperationModule: React.FC = () => {
  const [activeCount, setActiveCount] = useState(0);
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>{t('operation.title')}</Title>
          <Text type="secondary">{t('operation.subtitle')}</Text>
        </div>
      </div>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title="Active Flights" value={activeCount} prefix={<Plane size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-purple-50">
            <Statistic title="In Customs" value={3} prefix={<ShieldCheck size={18} className="mr-2 text-purple-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-cyan-50">
            <Statistic title="In Warehouse" value={8} prefix={<Package size={18} className="mr-2 text-cyan-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-amber-50">
            <Statistic title="Booked (Pending)" value={5} prefix={<Clock size={18} className="mr-2 text-amber-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <MawbList />
      </Card>
    </div>
  );
};

