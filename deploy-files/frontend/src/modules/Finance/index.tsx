import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic } from 'antd';
import { ArrowUpRight, ArrowDownLeft, DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { InvoiceList } from './InvoiceList';
import { financeApi } from '../../services/api';

const { Text, Title } = Typography;

export const FinanceModule: React.FC = () => {
  const [stats, setStats] = useState({ totalAR: 0, totalAP: 0, netProfit: 0 });
  const { t } = useTranslation();

  useEffect(() => {
    financeApi.getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>{t('finance.title')}</Title>
          <Text type="secondary">{t('finance.subtitle', 'Accounts Receivable, Payable and Net Profit tracking')}</Text>
        </div>
      </div>

      <Row gutter={20}>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-green-50">
            <Statistic title={t('finance.ar')} value={stats.totalAR} prefix={<ArrowUpRight size={18} className="mr-2 text-green-600" />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-red-50">
            <Statistic title={t('finance.ap')} value={stats.totalAP} prefix={<ArrowDownLeft size={18} className="mr-2 text-red-600" />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title={t('finance.profit')} value={stats.netProfit} prefix={<DollarSign size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <InvoiceList />
      </Card>
    </div>
  );
};
