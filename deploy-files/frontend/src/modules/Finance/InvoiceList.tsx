import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography, Tabs, Row, Col, Statistic, Drawer, DatePicker, Divider, Upload } from 'antd';
import { Invoice, InvoiceStatus, Customer, MAWB } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Plus, DollarSign, TrendingUp, TrendingDown, BarChart3, CheckSquare, Download, Edit, Check, Equal, Upload as UploadIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { financeApi, businessApi, operationApi, uploadApi } from '../../services/api';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedARRows, setSelectedARRows] = useState<React.Key[]>([]);
  const [currentTab, setCurrentTab] = useState('ar');
  const [editingAP, setEditingAP] = useState<any>(null);
  const [payingAP, setPayingAP] = useState<any>(null);
  const [uploadingAPId, setUploadingAPId] = useState<number | string | null>(null);
  const [dateRange, setDateRange] = useState<[any, any] | null>(null);
  const [form] = Form.useForm();
  const [apForm] = Form.useForm();
  const [payForm] = Form.useForm();
  const { user: profile } = useAuth();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [iRes, arRes, apRes, cRes, mRes, bRes] = await Promise.all([
        financeApi.getInvoices(),
        financeApi.getAR(),
        financeApi.getAP(),
        businessApi.getCustomers(),
        operationApi.getMawbs(),
        businessApi.getBookings(),
      ]);
      setInvoices(iRes.data);
      setAccountsReceivable(arRes.data);
      setAccountsPayable(apRes.data);
      setCustomers(cRes.data);
      setMawbs(mRes.data);
      setBookings(bRes.data);
    } catch { message.error('Failed to load finance data'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleConsolidateAR = async () => {
    if (selectedARRows.length === 0) return;
    const items = accountsReceivable.filter(item => selectedARRows.includes(item.id));
    if (!items.every(item => item.customerId === items[0].customerId)) {
      return message.error('Must belong to the same customer');
    }
    const totalAmount = items.reduce((s, i) => s + Number(i.totalAmount), 0);
    const invoiceNo = `INV-${dayjs().format('YYYYMMDD')}-${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      await financeApi.createInvoice({
        invoiceNo, customerId: items[0].customerId, amount: totalAmount,
        currency: items[0].currency, issueDate: new Date().toISOString(),
        dueDate: dayjs().add(30, 'day').toISOString(),
        lineItems: items.map(i => ({ description: `MAWB ID: ${i.mawbId || '--'}`, amount: i.totalAmount }))
      });
      await Promise.all(items.map(item => financeApi.updateAR(item.id, { status: 'invoiced' })));
      message.success(`Invoice ${invoiceNo} generated`);
      setSelectedARRows([]);
      fetchData();
    } catch { message.error('Consolidation failed'); }
  };

  const handleMarkPaid = async (type: 'invoice' | 'ap', id: string | number) => {
    try {
      if (type === 'invoice') await financeApi.updateInvoice(id, { status: 'paid' });
      else await financeApi.updateAP(id, { status: 'paid' });
      message.success(t('common.success'));
      fetchData();
    } catch { message.error(t('common.error')); }
  };

  const arColumns = [
    { title: t('finance.mawb'), dataIndex: 'mawbId', render: (v: any) => <span className="font-mono">{v || '--'}</span> },
    { title: t('finance.customer'), dataIndex: 'customerId', render: (id: any) => customers.find(c => c.id === id)?.name || id },
    { title: t('finance.amount'), render: (_: any, r: any) => <Text strong>{r.currency} {Number(r.totalAmount).toFixed(2)}</Text> },
    { title: t('common.status'), dataIndex: 'status', render: (s: string) => <Tag color={s === 'invoiced' ? 'blue' : 'orange'}>{t(`finance.statuses.${s || 'pending'}`)}</Tag> },
    { title: t('common.date'), dataIndex: 'createdAt', render: (v: string) => dayjs(v).format('YYYY-MM-DD') },
  ];

  const apColumns = [
    { title: t('finance.mawb'), dataIndex: 'mawbId', render: (id: any) => mawbs.find(m => m.id === id)?.mawbNo || id || '--' },
    { title: t('common.vendor'), dataIndex: 'vendorName' },
    { title: t('finance.amount'), render: (_: any, r: any) => <Text strong className="text-red-500">{r.currency} {Number(r.totalAmount).toFixed(2)}</Text> },
    { title: t('common.status'), dataIndex: 'status', render: (s: string) => <Tag color={s === 'paid' ? 'success' : 'warning'}>{s}</Tag> },
    {
      title: t('common.actions'),
      render: (_: any, r: any) => r.status !== 'paid' ? (
        <Space size="small">
          <Button size="small" icon={<Edit size={14} />} onClick={() => { setEditingAP(r); apForm.setFieldsValue(r); }} />
          <Upload showUploadList={false} accept=".pdf,.jpg,.png"
            beforeUpload={async (file) => {
              setUploadingAPId(r.id);
              try {
                const res = await uploadApi.uploadFile(file);
                await financeApi.updateAP(r.id, { vendorInvoiceUrl: res.data.fileUrl });
                message.success('Invoice uploaded');
                fetchData();
              } catch { message.error('Upload failed'); }
              setUploadingAPId(null);
              return false;
            }}>
            <Button size="small" icon={<UploadIcon size={14} />} loading={uploadingAPId === r.id} />
          </Upload>
          <Button size="small" type="primary" ghost icon={<DollarSign size={14} />} onClick={() => setPayingAP(r)}>{t('finance.paid')}</Button>
        </Space>
      ) : null,
    },
  ];

  const contrastColumns = [
    { title: t('finance.mawb'), dataIndex: 'mawbNo', render: (v: any, _: any, i: number) => {
        const ar = accountsReceivable[i];
        return <span className="font-mono">{ar?.mawbId ? (mawbs.find(m => m.id === ar.mawbId)?.mawbNo || ar.mawbId) : '--'}</span>;
    }},
    { title: t('finance.flightDate'), render: (_: any, __: any, i: number) => {
        const ar = accountsReceivable[i];
        const m = ar?.mawbId ? mawbs.find(mw => mw.id === ar.mawbId) : null;
        return m?.flightDate ? dayjs(m.flightDate).format('YYYY-MM-DD') : '-';
    }},
    { title: t('finance.revenue'), render: (_: any, __: any, i: number) => {
        const ar = accountsReceivable[i];
        return ar ? <Text className="text-green-600">{ar.currency} {Number(ar.totalAmount).toFixed(2)}</Text> : '-';
    }},
    { title: t('finance.cost'), render: (_: any, __: any, i: number) => {
        const ar = accountsReceivable[i];
        if (!ar) return '-';
        const ap = accountsPayable.find(x => x.mawbId === ar.mawbId);
        return ap ? <Text className="text-red-500">{ap.currency} {Number(ap.totalAmount).toFixed(2)}</Text> : '-';
    }},
    { title: t('finance.profit'), render: (_: any, __: any, i: number) => {
        const ar = accountsReceivable[i];
        if (!ar) return '-';
        const ap = accountsPayable.find(x => x.mawbId === ar.mawbId);
        const profit = Number(ar.totalAmount) - (ap ? Number(ap.totalAmount) : 0);
        return <Text strong className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>{ar.currency} {profit.toFixed(2)}</Text>;
    }},
  ];

  const tabs = [
    {
      key: 'ar',
      label: <span className="flex items-center gap-2"><TrendingUp size={16} />{t('finance.accountsReceivable')}</span>,
      children: (
        <div className="space-y-6">
          <Card title={t('finance.activeInvoices')} extra={<Button type="primary" size="small" onClick={() => setModalOpen(true)}>{t('common.add')}</Button>}>
            <Table dataSource={invoices} loading={loading} rowKey="id" size="small"
              columns={[
                { title: t('finance.invoiceNo'), dataIndex: 'invoiceNo', render: (v: any) => <span className="font-mono font-bold text-blue-600">{v}</span> },
                { title: t('finance.customer'), dataIndex: 'customerId', render: (id: any) => customers.find(c => c.id === id)?.name || id },
                { title: t('finance.amount'), render: (_: any, r: any) => `${r.currency} ${Number(r.amount).toFixed(2)}` },
                { title: t('common.status'), dataIndex: 'status', render: (s: InvoiceStatus) => <Tag color={s === 'paid' ? 'success' : 'processing'}>{t(`finance.statuses.${s}`)}</Tag> },
                { title: t('common.actions'), render: (_: any, r: any) => r.status !== 'paid' && <Button size="small" onClick={() => handleMarkPaid('invoice', r.id)}>{t('finance.paid')}</Button> },
              ]} />
          </Card>
          <Card title={t('finance.pendingReceivables')}
            extra={<Button type="primary" disabled={selectedARRows.length === 0} onClick={handleConsolidateAR}>{t('finance.newInvoice')} ({selectedARRows.length})</Button>}>
            <Table rowSelection={{ selectedRowKeys: selectedARRows, onChange: (keys) => setSelectedARRows(keys), getCheckboxProps: (r: any) => ({ disabled: r.status === 'invoiced' }) }}
              dataSource={accountsReceivable.filter((ar: any) => ar.status !== 'invoiced')} columns={arColumns} loading={loading} rowKey="id" size="small" />
          </Card>
        </div>
      ),
    },
    {
      key: 'ap',
      label: <span className="flex items-center gap-2"><TrendingDown size={16} />{t('finance.accountsPayable')}</span>,
      children: (
        <Card title={t('finance.pendingPayables')}>
          <Table dataSource={accountsPayable} columns={apColumns} loading={loading} rowKey="id" size="small" />
        </Card>
      ),
    },
    {
      key: 'analysis',
      label: <span className="flex items-center gap-2"><BarChart3 size={16} />{t('finance.profitAnalysis')}</span>,
      children: (
        <Card title={t('finance.mawb') + ' ' + t('finance.profitAnalysis')}
          extra={<DatePicker.RangePicker onChange={(dates) => setDateRange(dates as any)} />}>
          <div className="mb-4 flex gap-6">
            <Text strong>{t('finance.totalAR')}: {accountsReceivable.reduce((s, i) => s + Number(i.totalAmount), 0).toFixed(2)}</Text>
            <Text strong>{t('finance.totalAP')}: {accountsPayable.reduce((s, i) => s + Number(i.totalAmount), 0).toFixed(2)}</Text>
            <Text strong>{t('finance.netProfit')}: {(accountsReceivable.reduce((s, i) => s + Number(i.totalAmount), 0) - accountsPayable.reduce((s, i) => s + Number(i.totalAmount), 0)).toFixed(2)}</Text>
          </div>
          <Table dataSource={accountsReceivable.filter((ar: any, i: number, self: any[]) => i === self.findIndex((x: any) => x.mawbId === ar.mawbId))}
            columns={contrastColumns} loading={loading} rowKey={(_, i) => String(i)} size="small" pagination={false} />
        </Card>
      ),
    },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2}>{t('finance.title')}</Title>
        <Paragraph type="secondary">{t('finance.invoiceSubtitle')}</Paragraph>
      </div>
      <Tabs activeKey={currentTab} onChange={setCurrentTab} items={tabs} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200" />

      <Modal title={t('finance.createInvoice')} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={async (v) => {
          try { await financeApi.createInvoice(v); message.success('Invoice created'); setModalOpen(false); fetchData(); }
          catch { message.error('Failed'); }
        }}>
          <Form.Item name="invoiceNo" label={t('finance.invoiceNo')} rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}><Select options={customers.map(c => ({ label: c.name, value: c.id }))} /></Form.Item>
          <Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber className="w-full" /></Form.Item>
          <Form.Item name="currency" label="Currency" initialValue="CNY"><Select options={[{label:'CNY',value:'CNY'},{label:'USD',value:'USD'}]} /></Form.Item>
        </Form>
      </Modal>

      {/* AP Editing Drawer */}
      <Drawer title={`AP Details: ${editingAP?.mawbId ? (mawbs.find(m => m.id === editingAP.mawbId)?.mawbNo || editingAP.mawbId) : ''}`}
        open={!!editingAP} onClose={() => setEditingAP(null)} width={600} destroyOnClose>
        {editingAP && (
          <Form form={apForm} layout="vertical" initialValues={editingAP}
            onFinish={async (values) => {
              const newTotal = (values.lineItems || []).reduce((s: number, i: any) => s + (i.amount || 0), 0);
              await financeApi.updateAP(editingAP.id, { ...values, totalAmount: newTotal });
              message.success('AP updated');
              setEditingAP(null);
              fetchData();
            }}>
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm mb-4">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                <Text strong>Breakdown Items</Text>
              </div>
              <div className="p-3">
                <Form.List name="lineItems">
                  {(fields, { add, remove }) => (
                    <>
                      {fields.map(({ key, name, ...rest }) => (
                        <div key={key} className="mb-2 flex gap-2 items-start">
                          <Form.Item {...rest} name={[name, 'name']} className="mb-0 flex-1" rules={[{ required: true }]}>
                            <Input placeholder="Item name" size="small" />
                          </Form.Item>
                          <Form.Item {...rest} name={[name, 'quantity']} className="mb-0" style={{ width: 70 }}>
                            <InputNumber placeholder="Qty" size="small" className="w-full" />
                          </Form.Item>
                          <Form.Item {...rest} name={[name, 'unitPrice']} className="mb-0" style={{ width: 90 }}>
                            <InputNumber placeholder="Price" size="small" className="w-full" />
                          </Form.Item>
                          <Form.Item shouldUpdate noStyle>
                            {() => {
                              const q = apForm.getFieldValue(['lineItems', name, 'quantity']) || 0;
                              const p = apForm.getFieldValue(['lineItems', name, 'unitPrice']) || 0;
                              return <div className="w-24 text-right pt-1 text-xs font-mono font-bold">{(q * p).toFixed(2)}</div>;
                            }}
                          </Form.Item>
                          <Button type="text" danger size="small" icon={<Plus size={12} className="rotate-45" />} onClick={() => remove(name)} />
                        </div>
                      ))}
                      <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>Add Item</Button>
                    </>
                  )}
                </Form.List>
              </div>
              <div className="bg-slate-50 px-4 py-3 border-t flex justify-between">
                <Text strong>Total</Text>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const items = apForm.getFieldValue('lineItems') || [];
                    const total = items.reduce((s: number, i: any) => s + (i.amount || 0), 0);
                    return <Text strong className="text-lg">{editingAP.currency} {total.toFixed(2)}</Text>;
                  }}
                </Form.Item>
              </div>
            </div>
            <Button type="primary" htmlType="submit" block size="large">Save Changes</Button>
          </Form>
        )}
      </Drawer>

      {/* AP Payment Modal */}
      <Modal title="Confirm Payment" open={!!payingAP} onCancel={() => setPayingAP(null)} onOk={() => payForm.submit()}>
        <Form form={payForm} onFinish={async (values) => {
          if (!payingAP) return;
          await financeApi.updateAP(payingAP.id, { status: 'paid', paidAmount: values.paidAmount });
          message.success('Payment recorded');
          setPayingAP(null);
          fetchData();
        }}>
          <Form.Item name="paidAmount" label="Payment Amount" rules={[{ required: true }]}>
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default InvoiceList;
