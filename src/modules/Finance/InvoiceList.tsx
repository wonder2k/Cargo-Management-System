import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography } from 'antd';
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Invoice, InvoiceStatus, Customer, MAWB } from '../../types';
import { Plus, CheckSquare, DollarSign, Download, AlertCircle } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PDFService } from '../../services/PDFService';
import { CreditService } from '../../services/CreditService';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [customers, setCustomers] = useState<(Customer & { outstanding: number })[]>([]);
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const iSnap = await getDocs(query(collection(db, 'invoices'), orderBy('issueDate', 'desc')));
      const invoicesData = iSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Invoice));
      setInvoices(invoicesData);

      const [cSnap, mSnap, balances] = await Promise.all([
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'mawbs')),
        CreditService.getAllCustomerBalances()
      ]);

      setCustomers(cSnap.docs.map(d => {
        const data = d.data() as Customer;
        return { 
          id: d.id, 
          ...data,
          outstanding: balances[d.id] || 0
        };
      }));

      setMawbs(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as MAWB)));
    } catch (e) {
      message.error('Failed to load finance data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: any) => {
    try {
      await addDoc(collection(db, 'invoices'), {
        ...values,
        status: 'issued'
      });
      message.success('Invoice generated');
      setModalOpen(false);
      fetchData();
    } catch (e) {
      message.error('Generation failed');
    }
  };

  const markAsPaid = async (id: string) => {
    try {
      await updateDoc(doc(db, 'invoices', id), { status: 'paid' });
      message.success('Invoice marked as paid');
      fetchData();
    } catch (e) {
      message.error('Action failed');
    }
  };

  const columns = [
    { title: 'Invoice #', dataIndex: 'invoiceNo', render: (text: string) => <Text strong className="font-mono">{text}</Text> },
    { 
      title: 'Customer', 
      dataIndex: 'customerId', 
      render: (id: string) => customers.find(c => c.id === id)?.name || id 
    },
    { 
      title: 'MAWB', 
      dataIndex: 'mawbId', 
      render: (id: string) => mawbs.find(m => m.id === id)?.internalMawbNo || id 
    },
    { 
      title: 'Amount', 
      dataIndex: 'amount', 
      render: (val: number, r: Invoice) => (
        <Text strong className={r.status === 'paid' ? 'text-green-600' : 'text-orange-600'}>
          {r.currency} {val.toLocaleString()}
        </Text>
      )
    },
    { title: 'Due Date', dataIndex: 'dueDate' },
    { 
      title: 'Status', 
      dataIndex: 'status',
      render: (status: InvoiceStatus) => {
        const colors = { issued: 'blue', partial: 'orange', paid: 'success', draft: 'default' };
        return <Tag color={colors[status]}>{status.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Action',
      render: (_: any, record: Invoice) => (
        record.status !== 'paid' && profile?.role === 'finance' && (
          <Button size="small" icon={<CheckSquare size={14} />} onClick={() => markAsPaid(record.id)}>
            Mark Paid
          </Button>
        )
      )
    }
  ];

  return (
    <>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('finance.title')}</Title>
          <Text type="secondary">{t('finance.subtitle')}</Text>
        </div>
        <Button 
          type="primary" 
          size="large"
          icon={<Plus size={18} />} 
          onClick={() => setModalOpen(true)}
          disabled={!['admin', 'finance'].includes(profile?.role || '')}
          className="rounded-lg shadow-sm"
        >
          {t('common.create')}
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <Table 
          dataSource={invoices} 
          loading={loading} 
          rowKey="id"
          pagination={{ pageSize: 10 }}
          className="professional-table"
          columns={[
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('finance.invoiceNo')}</span>, 
              dataIndex: 'invoiceNo', 
              render: (text: string) => <span className="text-sm font-mono font-semibold text-blue-600">{text}</span> 
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('finance.customer')}</span>, 
              dataIndex: 'customerId', 
              render: (id: string) => {
                const customer = customers.find(c => c.id === id);
                if (!customer) return id;
                const isOver = customer.outstanding >= customer.creditLimit && customer.creditLimit > 0;
                return (
                  <div>
                    <div className="flex items-center gap-1">
                      <p className="text-sm font-semibold text-slate-700">{customer.name}</p>
                      {isOver && <AlertCircle size={12} className="text-red-500" />}
                    </div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-tight">
                       {isOver ? t('finance.crLimitBreach') : t('finance.directClient')}
                    </p>
                  </div>
                );
              }
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('finance.relatedAwb')}</span>, 
              dataIndex: 'mawbId', 
              render: (id: string) => (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-mono italic">AWB:</span>
                  <span className="text-sm font-medium text-slate-600">{mawbs.find(m => m.id === id)?.internalMawbNo || '---'}</span>
                </div>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('finance.amount')}</span>, 
              dataIndex: 'amount', 
              render: (val: number, r: Invoice) => (
                <div>
                  <span className={`text-sm font-bold ${r.status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                    {r.currency} {val.toLocaleString()}
                  </span>
                </div>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('finance.status')}</span>, 
              dataIndex: 'status',
              render: (status: InvoiceStatus) => {
                const styles = { 
                  issued: 'bg-blue-100 text-blue-700', 
                  partial: 'bg-orange-100 text-orange-700', 
                  paid: 'bg-green-100 text-green-700', 
                  draft: 'bg-slate-100 text-slate-600' 
                };
                return (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${styles[status]}`}>
                    {status}
                  </span>
                );
              }
            },
            {
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right block">{t('finance.actions')}</span>,
              align: 'right',
              render: (_: any, record: Invoice) => (
                <div className="flex items-center justify-end gap-2">
                  <Button 
                    size="small" 
                    icon={<Download size={12} />}
                    onClick={async () => {
                       const customer = customers.find(c => c.id === record.customerId);
                       const mawb = mawbs.find(m => m.id === record.mawbId);
                       PDFService.generateInvoice(record, customer, mawb);
                       
                       // Log history
                       try {
                         await addDoc(collection(db, 'invoice-history'), {
                           invoiceId: record.id,
                           invoiceNo: record.invoiceNo,
                           customerId: record.customerId,
                           amount: record.amount,
                           currency: record.currency,
                           downloadedBy: profile?.uid,
                           downloadedAt: new Date().toISOString()
                         });
                       } catch (e) {
                         console.error('Failed to log history', e);
                       }
                    }}
                  >
                    PDF
                  </Button>
                  {record.status !== 'paid' && profile?.role === 'finance' ? (
                    <Button 
                      size="small" 
                      type="primary"
                      ghost
                      className="text-[10px] h-7 font-bold uppercase"
                      icon={<CheckSquare size={12} />} 
                      onClick={() => markAsPaid(record.id)}
                    >
                      {t('finance.receivePayment')}
                    </Button>
                  ) : (
                    <span className="text-[10px] text-slate-400 font-bold uppercase px-2">{t('finance.paid')}</span>
                  )}
                </div>
              )
            }
          ]}
        />
      </div>

      <Modal
        title={t('finance.newInvoice')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="invoiceNo" label={t('finance.invoiceNo')} rules={[{ required: true }]}>
            <Input placeholder="INV-2024-001" />
          </Form.Item>
          <Form.Item name="customerId" label={t('finance.customer')} rules={[{ required: true }]}>
            <Select options={customers.map(c => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Form.Item name="mawbId" label={t('finance.relatedAwb')} rules={[{ required: true }]}>
            <Select options={mawbs.map(m => ({ label: m.internalMawbNo, value: m.id }))} />
          </Form.Item>
          <Space>
            <Form.Item name="amount" label={t('finance.amount')} rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="currency" label={t('booking.currency')} initialValue="USD">
              <Select style={{ width: 100 }} options={[
                { label: 'USD', value: 'USD' },
                { label: 'CNY', value: 'CNY' },
                { label: 'HKD', value: 'HKD' }
              ]} />
            </Form.Item>
          </Space>
          <Form.Item name="issueDate" label={t('common.date')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="dueDate" label={t('finance.dueDate')} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};
