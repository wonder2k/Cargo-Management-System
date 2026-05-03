import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, App, Row, Col, Typography } from 'antd';
import { Customer, CustomerType, PaymentTerm, Currency } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { UserPlus, Edit2, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { businessApi } from '../../services/api';
import { pinyin } from 'pinyin-pro';

const { Title, Text } = Typography;

const COUNTRIES = [
  { code: 'CN', name: 'China (中国)', lang: 'zh' },
  { code: 'HK', name: 'Hong Kong (香港)', lang: 'en/zh' },
  { code: 'US', name: 'United States', lang: 'en' },
  { code: 'GB', name: 'United Kingdom', lang: 'en' },
  { code: 'JP', name: 'Japan', lang: 'en' },
  { code: 'SG', name: 'Singapore', lang: 'en' },
  { code: 'VN', name: 'Vietnam', lang: 'en' },
  { code: 'TH', name: 'Thailand', lang: 'en' },
];

const LOCATIONS = ['SHANGHAI', 'SHENZHEN', 'GUANGZHOU', 'BEIJING', 'HONGKONG', 'NINGBO', 'XIAMEN', 'QINGDAO', 'TIANJIN', 'CHENGDU', '上海', '深圳', '广州', '北京', '香港', '宁波', '厦门', '青岛', '天津', '成都'];
const SUFFIXES = ['LTD', 'CO', 'CORP', 'LIMITED', 'LOGISTICS', 'FREIGHT', 'INTL', 'INTERNATIONAL', '有限公司', '有限责任公司', '物流', '货运', '国际'];

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<(Customer & { balance: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await businessApi.getCustomers();
      setCustomers(response.data);
    } catch (error: any) {
      message.error(t('common.failedToFetch') || 'Failed to fetch customers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const extractCoreKeyword = (name: string) => {
    let cleaned = name.toUpperCase();
    LOCATIONS.forEach(loc => { cleaned = cleaned.split(loc).join(''); });
    SUFFIXES.forEach(suf => { cleaned = cleaned.split(suf).join(''); });
    const core = cleaned.trim().split(/\s+/)[0];
    return core || name.substring(0, 4).toUpperCase();
  };

  const generateCode = async (name: string, countryCode: string) => {
    if (!name || name.length < 1) return '';
    const core = extractCoreKeyword(name);
    let prefix = '';
    
    if (countryCode === 'CN') {
      const py = pinyin(core, { pattern: 'initial', toneType: 'none', v: true });
      prefix = py.replace(/\s+/g, '').substring(0, 2).toUpperCase();
      if (prefix.length < 2) prefix = core.substring(0, 2).toUpperCase();
    } else {
      prefix = core.substring(0, 2).toUpperCase();
    }
    
    const operatorPrefix = (user?.name || 'SY').substring(0, 2).toUpperCase();
    const count = customers.length + 1;
    const numSuffix = count.toString().padStart(3, '0');
    return `${prefix}${operatorPrefix}${numSuffix}`;
  };

  const handleNameChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const country = form.getFieldValue('countryCode');
    if (val && !editingCustomer && country) {
      const generatedCode = await generateCode(val, country);
      form.setFieldsValue({ code: generatedCode });
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingCustomer) {
        await businessApi.updateCustomer(editingCustomer.id, values);
        message.success(t('common.updated'));
      } else {
        await businessApi.createCustomer(values);
        message.success(t('common.added'));
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      message.error(t('common.error') || 'Operation failed');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('common.customers')}</Title>
          <Text type="secondary">{t('common.manageClients') || 'Manage your business clients'}</Text>
        </div>
        <Button 
          type="primary" 
          size="large"
          icon={<UserPlus size={18} />} 
          onClick={() => {
            setEditingCustomer(null);
            form.resetFields();
            setModalOpen(true);
          }}
          disabled={!['admin', 'business'].includes(user?.role || '')}
          className="rounded-lg shadow-sm"
        >
          {t('common.add') || 'Add Client'}
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <Table 
          columns={[
            { 
              title: t('common.code') || 'Code', 
              dataIndex: 'code', 
              render: (text: string) => <span className="font-mono font-semibold text-blue-600">{text}</span> 
            },
            { 
              title: t('common.name') || 'Name', 
              dataIndex: 'name',
              render: (name, record) => (
                <div>
                  <div className="font-semibold text-slate-700">{name}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{record.countryCode}</div>
                </div>
              )
            },
            { 
              title: t('common.type') || 'Type', 
              dataIndex: 'type', 
              render: (type: string, record: Customer) => (
                <Space direction="vertical" size={0}>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    type === 'direct' ? 'bg-cyan-100 text-cyan-700' : 
                    type === 'local_agent' ? 'bg-purple-100 text-purple-700' : 
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {type}
                  </span>
                  <div className="text-[10px] text-slate-500">Tier: {record.tier || 0}</div>
                </Space>
              )
            },
            { 
              title: t('finance.outstanding') || 'Outstandings', 
              render: (_, r: Customer & { balance: number }) => {
                const balance = r.balance || 0;
                const isOverLimit = balance >= r.creditLimit && r.creditLimit > 0;
                return (
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${isOverLimit ? 'text-red-600' : 'text-slate-600'}`}>
                        {r.creditCurrency} {balance.toLocaleString()} / {r.creditLimit?.toLocaleString()}
                      </span>
                      {isOverLimit && <AlertCircle size={12} className="text-red-500" />}
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase">{r.paymentTerms}</div>
                  </div>
                );
              }
            },
            { 
              title: t('common.status') || 'Status', 
              dataIndex: 'status', 
              render: (status: string) => (
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {status}
                </span>
              )
            },
            {
              title: t('common.actions') || 'Actions',
              align: 'right',
              render: (_: any, record: Customer & { balance: number }) => (
                <Button 
                  type="text" 
                  size="small"
                  className="text-slate-400 hover:text-blue-600"
                  icon={<Edit2 size={14} />} 
                  onClick={() => {
                    setEditingCustomer(record);
                    form.setFieldsValue(record);
                    setModalOpen(true);
                  }} 
                />
              ),
            },
          ]} 
          dataSource={customers} 
          loading={loading} 
          rowKey="id" 
          pagination={{ pageSize: 12 }}
        />
      </div>

      <Modal
        title={editingCustomer ? t('common.edit') : t('common.add')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnClose
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="countryCode" label={t('common.origin') || 'Country/Region'} rules={[{ required: true }]}>
                <Select 
                  placeholder="Select Country"
                  options={COUNTRIES.map(c => ({ label: c.name, value: c.code }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                noStyle 
                shouldUpdate={(prev, curr) => prev.countryCode !== curr.countryCode}
              >
                {({ getFieldValue }) => {
                  const country = getFieldValue('countryCode');
                  const isChina = country === 'CN';
                  return (
                    <Form.Item 
                      name="name" 
                      label={isChina ? "Full Name (中文名称)" : "Full Name (English Name)"} 
                      rules={[{ required: true }]}
                    >
                      <Input placeholder={isChina ? "中集集团" : "ABC Logistics LTD"} onChange={handleNameChange} />
                    </Form.Item>
                  );
                }}
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="code" label="Client Code" rules={[{ required: true }]}>
                <Input placeholder="COOP001" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Customer Type" rules={[{ required: true }]}>
                <Select 
                  options={[
                    { label: 'Direct', value: 'direct' },
                    { label: 'Local Agent', value: 'local_agent' },
                    { label: 'Overseas Agent', value: 'overseas_agent' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="creditCurrency" label="Currency" initialValue="CNY" rules={[{ required: true }]}>
                <Select options={[{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="creditLimit" label="Credit Limit" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentTerms" label="Payment Terms" rules={[{ required: true }]}>
                <Select options={[
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Bi-Weekly', value: 'bi-weekly' },
                  { label: 'Monthly', value: 'monthly' }
                ]} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label="Billing Email">
            <Input placeholder="finance@company.com" />
          </Form.Item>
          <Form.Item name="tier" label="Tier (0-10)" initialValue={0}>
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
