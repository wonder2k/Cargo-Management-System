import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic } from 'antd';
import { Plane, Clock, Package, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { MawbList } from './MawbList';
import { operationApi } from '../../services/api';

const { Text, Title } = Typography;

export const OperationModule: React.FC = () => {
  const [stats, setStats] = useState({ activeFlights: 0, inCustoms: 0, inWarehouse: 0, bookedPending: 0 });
  const { t } = useTranslation();

  useEffect(() => {
    operationApi.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

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
            <Statistic title={t('operation.activeFlights', 'Active Flights')} value={stats.activeFlights} prefix={<Plane size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-purple-50">
            <Statistic title={t('operation.inCustoms', 'In Customs')} value={stats.inCustoms} prefix={<ShieldCheck size={18} className="mr-2 text-purple-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-cyan-50">
            <Statistic title={t('operation.inWarehouse', 'In Warehouse')} value={stats.inWarehouse} prefix={<Package size={18} className="mr-2 text-cyan-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-amber-50">
            <Statistic title={t('operation.bookedPending', 'Booked (Pending)')} value={stats.bookedPending} prefix={<Clock size={18} className="mr-2 text-amber-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <MawbList />
      </Card>
    </div>
  );
};
