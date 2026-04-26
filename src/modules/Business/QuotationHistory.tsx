import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Input, Space, Button } from 'antd';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { QuotationLog } from '../../types';
import { Search, History, Download, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const QuotationHistory: React.FC = () => {
  const [logs, setLogs] = useState<QuotationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const { t } = useTranslation();

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'quotation-history'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
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
    log.quotationNo.toLowerCase().includes(searchText.toLowerCase()) ||
    log.customerName.toLowerCase().includes(searchText.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('quotationHistory.title')}</Title>
          <Text type="secondary">{t('quotationHistory.subtitle')}</Text>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="mb-4">
          <Input 
            prefix={<Search size={16} className="text-slate-400" />} 
            placeholder={t('quotationHistory.searchPlaceholder')} 
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
              title: t('quotationHistory.quoteNo'),
              dataIndex: 'quotationNo',
              render: (text) => <span className="font-mono font-bold text-blue-600">{text}</span>
            },
            {
              title: t('quotationHistory.customer'),
              dataIndex: 'customerName',
              render: (name) => <span className="font-semibold text-slate-700">{name}</span>
            },
            {
              title: t('quotationHistory.routes'),
              dataIndex: 'routes',
              render: (routes: string[]) => (
                <div className="flex flex-wrap gap-1">
                  {routes.map(r => {
                     const [path, price] = r.split(' @ ');
                     return (
                       <Tag key={r} icon={<MapPin size={10} />} color="blue" className="px-2 py-1">
                         <span className="font-bold">{path}</span>
                         {price && <span className="ml-1 border-l pl-1 border-blue-200 text-blue-800">@ {price}</span>}
                       </Tag>
                     );
                  })}
                </div>
              )
            },
            {
              title: t('quotationHistory.generatedBy'),
              dataIndex: 'userName',
              render: (name) => (
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px] text-slate-600 font-bold">
                    {name.substring(0,2).toUpperCase()}
                  </div>
                  <span className="text-sm text-slate-600">{name}</span>
                </div>
              )
            },
            {
              title: t('quotationHistory.timestamp'),
              dataIndex: 'timestamp',
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(t).toLocaleString()}</Text>
            },
            {
              title: t('quotationHistory.action'),
              align: 'right',
              render: () => <Button type="text" icon={<Download size={14} />} disabled />
            }
          ]}
        />
      </Card>
    </div>
  );
};
