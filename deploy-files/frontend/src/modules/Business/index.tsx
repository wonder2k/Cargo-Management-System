import React, { useState, useEffect } from 'react';
import { Tabs, Card, Typography, Row, Col, Statistic } from 'antd';
import { Coins, Globe, Briefcase, Users, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { PricingList } from './PricingList';
import { BookingList } from './BookingList';
import { QuotationHistory } from './QuotationHistory';
import { CustomerCRMTab } from './CustomerCRMTab';

const { Title, Text } = Typography;

export const BusinessModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rates');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>Sales & Business Center</Title>
          <Text type="secondary">Manage pricing, quotations and air cargo bookings</Text>
        </div>
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
                  <Coins size={16} /> <span>Rates Cabinet</span>
                </div>
              ),
              children: <PricingList />
            },
            {
              key: 'quotes',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Globe size={16} /> <span>Quote History</span>
                </div>
              ),
              children: <QuotationHistory />
            },
            {
              key: 'bookings',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Briefcase size={16} /> <span>Air Bookings</span>
                </div>
              ),
              children: <BookingList />
            },
            {
               key: 'crm',
               label: (
                 <div className="flex items-center gap-2 px-4 py-2">
                   <Users size={16} /> <span>Customer CRM</span>
                 </div>
               ),
               children: <CustomerCRMTab />
            }
          ]}
        />
      </Card>
    </div>
  );
};

