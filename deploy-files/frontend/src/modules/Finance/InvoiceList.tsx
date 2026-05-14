import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography, Tabs, Row, Col, Statistic, Badge } from 'antd';
import { Invoice, InvoiceStatus, Customer, MAWB } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Plus, DollarSign, TrendingUp, TrendingDown, BarChart3, CheckSquare, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { financeApi, businessApi, operationApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedARRows, setSelectedARRows] = useState<React.Key[]>([]);
  const [currentTab, setCurrentTab] = useState('ar');
  
  const { user: profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [iRes, arRes, apRes, cRes, mRes] = await Promise.all([
        financeApi.getInvoices(),
        financeApi.getAR(),
        financeApi.getAP(),
        businessApi.getCustomers(),
        operationApi.getMawbs()
      ]);
      setInvoices(iRes.data);
      setAccountsReceivable(arRes.data);
      setAccountsPayable(apRes.data);
      setCustomers(cRes.data);
      setMawbs(mRes.data);
    } catch (e) {
      message.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleConsolidateAR = async () => {
    if (selectedARRows.length === 0) return;
    const items = accountsReceivable.filter(item => selectedARRows.includes(item.id));
    const firstItem = items[0];
    
    // Check if same customer
    const sameCustomer = items.every(item => item.customerId === firstItem.customerId);
    if (!sameCustomer) {
      message.error('Must belong to the same customer');
      return;
    }

    const totalAmount = items.reduce((sum, item) => sum + Number(item.totalAmount), 0);
    const invoiceNo = `INV-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      await financeApi.createInvoice({
        invoiceNo,
        customerId: firstItem.customerId,
        amount: totalAmount,
        currency: firstItem.currency,
        issueDate: new Date().toISOString(),
        dueDate: dayjs().add(30, 'day').toISOString(),
        lineItems: items.map(i => ({ description: `MAWB ID: ${i.mawbId || '--'}`, amount: i.totalAmount }))
      });

      // Update AR items status
      await Promise.all(items.map(item => financeApi.updateAR(item.id, { status: 'invoiced' })));

      message.success(`Invoice ${invoiceNo} generated`);
      setSelectedARRows([]);
      fetchData();
    } catch (e) {
      message.error('Consolidation failed');
    }
  };

  const items = [
    {
      key: 'ar',
      label: <span className="flex items-center gap-2"><TrendingUp size={16} />AR</span>,
      children: (
        <div className="space-y-6">
          <Card title="Active Invoices" extra={<Button type="primary" size="small" onClick={() => setModalOpen(true)}>{t('common.add')}</Button>}>
             <Table 
                dataSource={invoices}
                loading={loading}
                rowKey="id"
                columns={[
                  { title: 'Invoice No', dataIndex: 'invoiceNo', render: (v) => <span className="font-mono font-bold text-blue-600">{v}</span> },
                  { title: 'Customer', dataIndex: 'customerId', render: (id) => customers.find(c => c.id === id)?.name || id },
                  { title: 'Amount', render: (_, r) => `${r.currency} ${r.amount}` },
                  { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'paid' ? 'success' : 'processing'}>{s}</Tag> },
                  { title: 'Actions', render: (_, r) => r.status !== 'paid' && <Button size="small" type="link" onClick={async () => {
                      await financeApi.updateInvoice(r.id, { status: 'paid' });
                      fetchData();
                  }}>Mark Paid</Button> }
                ]}
             />
          </Card>

          <Card 
            title="Pending Receivables" 
            extra={<Button type="primary" disabled={selectedARRows.length === 0} onClick={handleConsolidateAR}>Generate Invoice ({selectedARRows.length})</Button>}
          >
            <Table
              rowSelection={{
                selectedRowKeys: selectedARRows,
                onChange: (keys) => setSelectedARRows(keys),
                getCheckboxProps: (r) => ({ disabled: r.status === 'invoiced' })
              }}
              dataSource={accountsReceivable.filter(ar => ar.status !== 'invoiced')}
              rowKey="id"
              columns={[
                { title: 'MAWB ID', dataIndex: 'mawbId', render: (v: any) => <span className="font-mono">{v || '--'}</span> },
                { title: 'Customer', dataIndex: 'customerId', render: (id) => customers.find(c => c.id === id)?.name || id },
                { title: 'Amount', render: (_, r) => <Text strong>{r.currency} {r.totalAmount}</Text> },
                { title: 'Date', dataIndex: 'createdAt', render: (v) => dayjs(v).format('YYYY-MM-DD') }
              ]}
            />
          </Card>
        </div>
      )
    },
    {
      key: 'ap',
      label: <span className="flex items-center gap-2"><TrendingDown size={16} />AP</span>,
      children: (
        <Card title="Pending Payables">
           <Table 
              dataSource={accountsPayable}
              rowKey="id"
              columns={[
                { title: 'MAWB', dataIndex: 'mawbId', render: (id) => mawbs.find(m => m.id === id)?.mawbNo || id },
                { title: 'Vendor', dataIndex: 'vendorName' },
                { title: 'Amount', render: (_, r) => <Text strong className="text-red-500">{r.currency} {r.totalAmount}</Text> },
                { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'paid' ? 'success' : 'warning'}>{s}</Tag> },
                { title: 'Actions', render: (_, r) => r.status !== 'paid' && <Button size="small" type="link" onClick={async () => {
                   await financeApi.updateAP(r.id, { status: 'paid' });
                   fetchData();
                }}>Mark Paid</Button> }
              ]}
           />
        </Card>
      )
    },
    {
      key: 'stats',
      label: <span className="flex items-center gap-2"><BarChart3 size={16} />Analysis</span>,
      children: (
        <div className="grid grid-cols-3 gap-4">
           <Card><Statistic title="Total AR" value={accountsReceivable.reduce((s, i) => s + Number(i.totalAmount), 0)} prefix={<TrendingUp className="text-green-500" />} /></Card>
           <Card><Statistic title="Total AP" value={accountsPayable.reduce((s, i) => s + Number(i.totalAmount), 0)} prefix={<TrendingDown className="text-red-500" />} /></Card>
           <Card><Statistic title="Net Profit" value={accountsReceivable.reduce((s, i) => s + Number(i.totalAmount), 0) - accountsPayable.reduce((s, i) => s + Number(i.totalAmount), 0)} prefix={<DollarSign className="text-blue-500" />} /></Card>
        </div>
      )
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>{t('finance.title')}</Title>
        <Paragraph type="secondary">Financial management and reporting</Paragraph>
      </div>

      <Tabs 
        activeKey={currentTab} 
        onChange={setCurrentTab} 
        items={items} 
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
      />

      <Modal title="Create Manual Invoice" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={async (v) => {
            try {
              await financeApi.createInvoice(v);
              message.success('Invoice created');
              setModalOpen(false);
              fetchData();
            } catch (e) { message.error('Failed'); }
        }}>
           <Form.Item name="invoiceNo" label="Invoice No" rules={[{ required: true }]}><Input /></Form.Item>
           <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}><Select options={customers.map(c => ({ label: c.name, value: c.id }))} /></Form.Item>
           <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber className="w-full" /></Form.Item>
           <Form.Item name="currency" label="Currency" initialValue="CNY"><Select options={[{label:'CNY',value:'CNY'},{label:'USD',value:'USD'}]} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceList;
