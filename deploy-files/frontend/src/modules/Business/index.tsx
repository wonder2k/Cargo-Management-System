import React, { useState, useEffect } from 'react';
import { Tabs, Card, Typography, Row, Col, Statistic } from 'antd';
import { Coins, Globe, Briefcase, Users, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { PricingList } from './PricingList';
import { BookingList } from './BookingList';
import { QuotationHistory } from './QuotationHistory';
import { CustomerList } from './CustomerList';
import { businessApi } from '../../services/api';

const { Title, Text } = Typography;

export const BusinessModule: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('rates');
  const [stats, setStats] = useState({ totalRevenue: 0, activeQuotes: 0, confirmedBookings: 0, crmClients: 0 });
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    if (location.pathname.includes('/rates')) setActiveTab('rates');
    else if (location.pathname.includes('/quotes')) setActiveTab('quotes');
    else if (location.pathname.includes('/bookings')) setActiveTab('bookings');
    else if (location.pathname.includes('/customers')) setActiveTab('crm');
    else if (location.pathname.includes('/business')) setActiveTab('rates');
  }, [location]);

  useEffect(() => {
    businessApi.getModuleStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>{t('business.title', 'Sales & Business Center')}</Title>
          <Text type="secondary">{t('business.subtitle', 'Manage pricing, quotations and air cargo bookings')}</Text>
        </div>
      </div>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title={t('business.totalRevenue', 'Total Revenue')} value={stats.totalRevenue} prefix={<TrendingUp size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-green-50">
            <Statistic title={t('business.activeQuotes', 'Active Quotes')} value={stats.activeQuotes} prefix={<Globe size={18} className="mr-2 text-green-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-purple-50">
            <Statistic title={t('business.confirmedBookings', 'Confirmed Bookings')} value={stats.confirmedBookings} prefix={<Briefcase size={18} className="mr-2 text-purple-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-indigo-50">
            <Statistic title={t('business.crmClients', 'CRM Clients')} value={stats.crmClients} prefix={<Users size={18} className="mr-2 text-indigo-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={(key) => {
            setActiveTab(key);
            if (key === 'rates') navigate('/rates');
            else if (key === 'quotes') navigate('/quotes');
            else if (key === 'bookings') navigate('/bookings');
            else if (key === 'crm') navigate('/customers');
          }}
          items={[
            {
              key: 'rates',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Coins size={16} /> <span>{t('pricing.title')}</span>
                </div>
              ),
              children: <PricingList />
            },
            {
              key: 'quotes',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Globe size={16} /> <span>{t('quotes.title')}</span>
                </div>
              ),
              children: <QuotationHistory />
            },
            {
              key: 'bookings',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Briefcase size={16} /> <span>{t('bookings.title')}</span>
                </div>
              ),
              children: <BookingList />
            },
            ...(['admin', 'business'].includes(user?.role || '') ? [{
               key: 'crm',
               label: (
                 <div className="flex items-center gap-2 px-4 py-2">
                   <Users size={16} /> <span>{t('common.customers')}</span>
                 </div>
               ),
               children: <CustomerList />
            }] : []),
          ]}
        />
      </Card>
    </div>
  );
};
