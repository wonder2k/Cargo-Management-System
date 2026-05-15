import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Input, Button } from 'antd';
import { Search, Download, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { businessApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const QuotationHistory: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await businessApi.getQuotes();
      setLogs(response.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const filteredLogs = logs.filter(log => 
    String(log.quotationNo).toLowerCase().includes(searchText.toLowerCase()) ||
    String(log.customerName).toLowerCase().includes(searchText.toLowerCase()) ||
    String(log.userName).toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('quotes.title')}</Title>
          <Text type="secondary">{t('quotes.subtitle')}</Text>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="mb-4">
          <Input 
            prefix={<Search size={16} className="text-slate-400" />} 
            placeholder={t('common.searchQuote')}
            className="w-96"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>

        <Table 
          dataSource={filteredLogs}
          loading={loading}
          rowKey="id"
          columns={[
            {
              title: t('quotes.quoteNo'),
              dataIndex: 'quotationNo',
              render: (text) => <span className="font-mono font-bold text-blue-600">{text}</span>
            },
            {
              title: t('quotes.client'),
              dataIndex: 'customerName',
              render: (name) => <span className="font-semibold text-slate-700">{name}</span>
            },
            {
              title: t('common.route') || 'Routes',
              dataIndex: 'routes',
              render: (routes: any[]) => (
                <div className="flex flex-wrap gap-1">
                  {(routes || []).map((r, idx) => (
                    <Tag key={idx} icon={<MapPin size={10} />} color="blue">
                      {r.origin}-{r.destination} @ {Number(r.finalPrice).toFixed(2)}
                    </Tag>
                  ))}
                </div>
              )
            },
            {
              title: t('common.user') || 'User',
              dataIndex: 'userName',
              render: (name) => <span className="text-sm text-slate-600">{name || 'N/A'}</span>
            },
            {
              title: t('common.date') || 'Date',
              render: (_, r) => (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</Text>
                  {r.validUntil && <Text type="secondary" style={{ fontSize: 10, color: '#d97706' }}>↗ {dayjs(r.validUntil).format('YYYY-MM-DD')}</Text>}
                </div>
              )
            },
            {
              title: t('common.action') || 'Action',
              align: 'right',
              render: () => <Button type="text" icon={<Download size={14} />} disabled />
            }
          ]}
        />
      </Card>
    </div>
  );
};
