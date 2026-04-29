import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, App, Tag, Row, Col, Typography } from 'antd';
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Customer, CustomerType, PaymentTerm, Currency } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { UserPlus, Edit2, Search, AlertCircle } from 'lucide-react';
import { CreditService } from '../../services/CreditService';
import { useTranslation } from 'react-i18next';

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

import { pinyin } from 'pinyin-pro';

const LOCATIONS = ['SHANGHAI', 'SHENZHEN', 'GUANGZHOU', 'BEIJING', 'HONGKONG', 'NINGBO', 'XIAMEN', 'QINGDAO', 'TIANJIN', 'CHENGDU', '上海', '深圳', '广州', '北京', '香港', '宁波', '厦门', '青岛', '天津', '成都'];
const SUFFIXES = ['LTD', 'CO', 'CORP', 'LIMITED', 'LOGISTICS', 'FREIGHT', 'INTL', 'INTERNATIONAL', '有限公司', '有限责任公司', '物流', '货运', '国际'];

export const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<(Customer & { balance: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'customers'), orderBy('code', 'asc'));
      const [snap, balances] = await Promise.all([
        getDocs(q),
        CreditService.getAllCustomerBalances()
      ]);
      
      setCustomers(snap.docs.map(d => {
        const data = d.data() as Customer;
        return { 
          id: d.id, 
          ...data,
          balance: balances[d.id] || 0
        };
      }));
    } catch (error: any) {
      message.error('Failed to fetch customers: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const extractCoreKeyword = (name: string) => {
    let cleaned = name.toUpperCase();
    
    // Remove locations
    LOCATIONS.forEach(loc => {
      cleaned = cleaned.split(loc).join('');
    });
    
    // Remove suffixes
    SUFFIXES.forEach(suf => {
      cleaned = cleaned.split(suf).join('');
    });
    
    // Trim and take core part
    const core = cleaned.trim().split(/\s+/)[0];
    return core || name.substring(0, 4).toUpperCase();
  };

  const generateCode = async (name: string, countryCode: string) => {
    if (!name || name.length < 1) return '';
    
    const core = extractCoreKeyword(name);
    let prefix = '';
    
    if (countryCode === 'CN') {
      // Use Pinyin initials for Chinese core keyword
      const py = pinyin(core, { pattern: 'initial', toneType: 'none', v: true });
      prefix = py.replace(/\s+/g, '').substring(0, 2).toUpperCase();
      // Fallback if pinyin fails to produce 2 chars or core was already english
      if (prefix.length < 2) {
        prefix = core.substring(0, 2).toUpperCase();
      }
    } else {
      prefix = core.substring(0, 2).toUpperCase();
    }
    
    const operatorName = profile?.displayName || 'SY';
    const operatorPrefix = operatorName.substring(0, 2).toUpperCase();
    
    const q = collection(db, 'customers');
    const snap = await getDocs(q);
    const count = snap.size + 1;
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
      // Clean undefined values for Firestore using shared helper
      const sanitized = cleanFirestoreData(values);

      if (editingCustomer) {
        try {
          await updateDoc(doc(db, 'customers', editingCustomer.id), sanitized);
          message.success(t('common.updated'));
        } catch (error: any) {
          handleFirestoreError(error, OperationType.WRITE, `customers/${editingCustomer.id}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'customers'), {
            ...sanitized,
            status: 'active'
          });
          message.success(t('common.added'));
        } catch (error: any) {
          handleFirestoreError(error, OperationType.WRITE, 'customers');
        }
      }
      setModalOpen(false);
      fetchCustomers();
    } catch (error: any) {
      console.error('Customer Ops Error:', error);
      let displayError = error.message;
      try {
        if (error.message.startsWith('{')) {
          const parsed = JSON.parse(error.message);
          displayError = `Permission denied at ${parsed.path}`;
        }
      } catch (jsErr) {}
      message.error('Operation failed: ' + displayError);
    }
  };

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('customers.title')}</Title>
          <Text type="secondary">{t('customers.subtitle')}</Text>
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
          disabled={!['admin', 'business'].includes(profile?.role || '')}
          className="rounded-lg shadow-sm"
        >
          {t('customers.addClient')}
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <Table 
          columns={[
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customers.clientCode')}</span>, 
              dataIndex: 'code', 
              render: (text: string) => <span className="text-sm font-mono font-semibold text-blue-600">{text}</span> 
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customers.companyName')}</span>, 
              dataIndex: 'name',
              render: (name, record) => (
                <div>
                  <span className="text-sm font-semibold text-slate-700">{name}</span>
                  <p className="text-[10px] text-slate-400 uppercase">{record.countryCode}</p>
                </div>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customers.type')}</span>, 
              dataIndex: 'type', 
              render: (type: string, record: Customer) => (
                <Space direction="vertical" size={2}>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    type === 'direct' ? 'bg-cyan-100 text-cyan-700' : 
                    type === 'local_agent' ? 'bg-purple-100 text-purple-700' : 
                    'bg-indigo-100 text-indigo-700'
                  }`}>
                    {t(`customers.types.${type}` as any)}
                  </span>
                  <span className="text-[10px] text-slate-500">Tier: {record.tier || 0}</span>
                </Space>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customers.creditFacility')}</span>, 
              render: (_, r: Customer & { balance: number }) => {
                const isOverLimit = r.balance >= r.creditLimit && r.creditLimit > 0;
                return (
                  <div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-medium ${isOverLimit ? 'text-red-600' : 'text-slate-600'}`}>
                        {r.creditCurrency} {r.balance.toLocaleString()} / {r.creditLimit?.toLocaleString()}
                      </span>
                      {isOverLimit && <AlertCircle size={12} className="text-red-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase">{t(`customers.terms.${r.paymentTerms}` as any)}</p>
                  </div>
                );
              }
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('customers.status')}</span>, 
              dataIndex: 'status', 
              render: (status: string) => (
                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {status === 'active' ? t('common.active' as any) || 'ACTIVE' : t('common.inactive' as any) || 'INACTIVE'}
                </span>
              )
            },
            {
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right block">{t('customers.action')}</span>,
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
        title={editingCustomer ? t('customers.editClient') : t('customers.newRegistration')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
        width={720}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="countryCode" label={t('customers.countryRegion')} rules={[{ required: true }]}>
                <Select 
                  placeholder={t('customers.selectCountry')}
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
                      rules={[
                        { required: true },
                        {
                          validator: (_, value) => {
                            if (!value) return Promise.resolve();
                            if (isChina) {
                              const chineseRegex = /^[\u4e00-\u9fa5\s]+$/;
                              if (!chineseRegex.test(value)) return Promise.reject("中国客户必须提供中文名称");
                            } else {
                              const englishRegex = /^[A-Za-z0-9\s.,&'-]+$/;
                              if (!englishRegex.test(value)) return Promise.reject("Non-China customers must use English characters");
                            }
                            return Promise.resolve();
                          }
                        }
                      ]}
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
              <Form.Item name="code" label={t('customers.clientCodeAuto')} rules={[{ required: true }]}>
                <Input placeholder="COOP001" disabled />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label={t('customers.customerType')} rules={[{ required: true }]}>
                <Select 
                  placeholder={t('common.loading')}
                  options={[
                    { label: t('customers.types.direct'), value: 'direct' },
                    { label: t('customers.types.local_agent'), value: 'local_agent' },
                    { label: t('customers.types.overseas_agent'), value: 'overseas_agent' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="creditCurrency" label={t('booking.currency')} initialValue="CNY" rules={[{ required: true }]}>
                <Select 
                  options={[
                    { label: 'CNY (人民币)', value: 'CNY' },
                    { label: 'USD (美金)', value: 'USD' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="creditLimit" label={t('customers.creditFacility')} rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="paymentTerms" label={t('customers.paymentTerms')} rules={[{ required: true }]}>
                <Select 
                  placeholder={t('common.loading')}
                  options={[
                    { label: t('customers.terms.weekly'), value: 'weekly' },
                    { label: t('customers.terms.bi-weekly'), value: 'bi-weekly' },
                    { label: t('customers.terms.monthly'), value: 'monthly' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="email" label={t('customers.billingEmail')}>
            <Input placeholder="finance@company.com" />
          </Form.Item>
          <Form.Item name="tier" label="Tier (0-10)" initialValue={0}>
            <InputNumber min={0} max={10} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
