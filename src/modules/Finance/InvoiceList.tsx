import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography, Tabs } from 'antd';
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy, where, writeBatch } from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Invoice, InvoiceStatus, Customer, MAWB } from '../../types';
import { Plus, CheckSquare, DollarSign, Download, AlertCircle, TrendingUp, TrendingDown, FileText, BarChart3 } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PDFService } from '../../services/PDFService';
import { CreditService } from '../../services/CreditService';
import { useTranslation } from 'react-i18next';

const { Text, Title, Paragraph } = Typography;

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<any[]>([]);
  const [customers, setCustomers] = useState<(Customer & { outstanding: number })[]>([]);
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedARRows, setSelectedARRows] = useState<React.Key[]>([]);
  const [currentTab, setCurrentTab] = useState('ar');
  
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

      const arSnap = await getDocs(query(collection(db, 'accountsReceivable'), orderBy('createdAt', 'desc')));
      const arData = arSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccountsReceivable(arData);

      const apSnap = await getDocs(query(collection(db, 'accountsPayable'), orderBy('createdAt', 'desc')));
      const apData = apSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAccountsPayable(apData);

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
      console.error(e);
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
    
    const itemsToInvoiced = accountsReceivable.filter(item => selectedARRows.includes(item.id));
    const firstItem = itemsToInvoiced[0];
    
    // Check if same customer
    const sameCustomer = itemsToInvoiced.every(item => item.customerId === firstItem.customerId);
    if (!sameCustomer) {
      message.error('Selected items must belong to the same customer');
      return;
    }

    const totalAmount = itemsToInvoiced.reduce((sum, item) => sum + item.totalAmount, 0);
    const invoiceNo = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    try {
      const batch = writeBatch(db);
      
      // Create Invoice data
      const invoiceData = {
        invoiceNo,
        customerId: firstItem.customerId,
        amount: totalAmount,
        currency: firstItem.currency,
        issueDate: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'issued',
        createdAt: new Date().toISOString(),
        lineItems: itemsToInvoiced.map(item => ({
          description: `Air Freight: ${item.route}`,
          reference: item.mawbNo,
          amount: item.totalAmount,
          pieces: item.pieces,
          weight: item.weight,
          chargeableWeight: item.chargeableWeight,
          flightDate: item.flightDate,
          declarationMethod: item.declarationMethod
        }))
      };

      // Deep sanitizing values to remove undefined for Firestore compatibility
      const sanitizedInvoice = cleanFirestoreData(invoiceData);
      
      const invoiceRef = doc(collection(db, 'invoices'));
      batch.set(invoiceRef, sanitizedInvoice);
      
      // Update AR items
      itemsToInvoiced.forEach(item => {
        batch.update(doc(db, 'accountsReceivable', item.id), {
          status: 'invoiced',
          invoiceId: invoiceRef.id
        });
      });
      
      await batch.commit();
      message.success(`Consolidated ${itemsToInvoiced.length} items into invoice ${invoiceNo}`);
      setSelectedARRows([]);
      fetchData();
    } catch (e: any) {
      console.error(e);
      handleFirestoreError(e, OperationType.WRITE, 'invoices-batch');
    }
  };

  const handleCreate = async (values: any) => {
    try {
      // Clean undefined values for Firestore using shared helper
      const sanitized = cleanFirestoreData(values);

      await addDoc(collection(db, 'invoices'), {
        ...sanitized,
        status: 'issued',
        createdAt: new Date().toISOString()
      });
      message.success('Invoice generated');
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      console.error('Invoice Ops Error:', e);
      handleFirestoreError(e, OperationType.WRITE, 'invoices');
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

  const arColumns = [
    { 
      title: 'MAWB', 
      dataIndex: 'mawbNo', 
      sorter: (a: any, b: any) => a.mawbNo.localeCompare(b.mawbNo) 
    },
    { 
      title: 'Customer', 
      dataIndex: 'customerName',
      sorter: (a: any, b: any) => a.customerName.localeCompare(b.customerName)
    },
    { title: 'Route', dataIndex: 'route' },
    { 
      title: 'Cargo/Dec', 
      render: (_: any, r: any) => (
        <div className="text-[10px] flex flex-col">
          <span>{r.pieces}P / {r.weight}K / {r.chargeableWeight}K</span>
          <Tag color="cyan" className="m-0 py-0 text-[10px] w-fit italic">
            {(r.declarationMethod || '-').toUpperCase()}
          </Tag>
        </div>
      )
    },
    { 
      title: 'Amount', 
      dataIndex: 'totalAmount', 
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
      render: (val: number, r: any) => <Text strong>{r.currency} {val.toLocaleString()}</Text> 
    },
    { 
      title: 'Status', 
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'invoiced' ? 'blue' : 'orange'}>
          {(status || 'pending').toUpperCase()}
        </Tag>
      )
    },
    { 
      title: 'Date', 
      dataIndex: 'createdAt', 
      sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      render: (val: string) => new Date(val).toLocaleDateString() 
    }
  ];

  const apColumns = [
    { 
      title: 'MAWB', 
      dataIndex: 'mawbNo',
      sorter: (a: any, b: any) => a.mawbNo.localeCompare(b.mawbNo)
    },
    { title: 'Vendor', dataIndex: 'vendorName', sorter: (a: any, b: any) => a.vendorName.localeCompare(b.vendorName) },
    { title: 'Route', dataIndex: 'route', sorter: (a: any, b: any) => a.route.localeCompare(b.route) },
    { 
      title: 'Cargo', 
      render: (_: any, r: any) => <span className="text-[11px]">{r.pieces}P / {r.weight}K</span>
    },
    { 
      title: 'Amount', 
      dataIndex: 'totalAmount', 
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
      render: (val: number, r: any) => <Text strong className="text-red-600">{r.currency} {val.toLocaleString()}</Text> 
    },
    { 
      title: 'Status', 
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'success' : 'warning'}>
          {(status || 'pending').toUpperCase()}
        </Tag>
      )
    },
    { title: 'Date', dataIndex: 'createdAt', sorter: (a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(), render: (val: string) => new Date(val).toLocaleDateString() }
  ];

  const contrastColumns = [
    { title: 'MAWB', dataIndex: 'mawbNo' },
    { 
      title: 'Revenue (AR)', 
      render: (_: any, r: any) => {
        const ar = accountsReceivable.find(x => x.mawbNo === r.mawbNo);
        return ar ? `${ar.currency} ${ar.totalAmount.toLocaleString()}` : '-';
      }
    },
    { 
      title: 'Cost (AP)', 
      render: (_: any, r: any) => {
        const ap = accountsPayable.find(x => x.mawbNo === r.mawbNo);
        return ap ? `${ap.currency} ${ap.totalAmount.toLocaleString()}` : '-';
      }
    },
    {
      title: 'Profit',
      render: (_: any, r: any) => {
        const ar = accountsReceivable.find(x => x.mawbNo === r.mawbNo);
        const ap = accountsPayable.find(x => x.mawbNo === r.mawbNo);
        if (!ar) return '-';
        const profit = ar.totalAmount - (ap?.totalAmount || 0);
        return (
          <Text strong className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
            {ar.currency} {profit.toLocaleString()}
          </Text>
        );
      }
    }
  ];

  const items = [
    {
      key: 'ar',
      label: <span className="flex items-center gap-2"><TrendingUp size={16} />{t('finance.accountsReceivable')}</span>,
      children: (
        <div className="space-y-6">
          <Card 
            title={t('finance.activeInvoices')} 
            extra={
              <Button type="primary" size="small" icon={<Plus size={14} />} onClick={() => setModalOpen(true)}>
                New Invoice
              </Button>
            }
          >
            <Table 
              dataSource={invoices} 
              loading={loading} 
              rowKey="id"
              size="small"
              columns={[
                { title: t('finance.invoiceNo'), dataIndex: 'invoiceNo' },
                { 
                  title: t('finance.customer'), 
                  dataIndex: 'customerId', 
                  render: (id) => customers.find(c => c.id === id)?.name || id 
                },
                { 
                  title: t('finance.amount'), 
                  dataIndex: 'amount', 
                  render: (v, r) => `${r.currency} ${v.toLocaleString()}` 
                },
                { 
                  title: t('finance.status'), 
                  dataIndex: 'status',
                  render: (s: InvoiceStatus) => <Tag color={s === 'paid' ? 'success' : 'processing'}>{s.toUpperCase()}</Tag>
                },
                {
                  title: t('finance.actions'),
                  render: (_, r) => (
                    <Space>
                      <Button size="small" icon={<Download size={14} />} onClick={() => PDFService.generateInvoice(r, customers.find(c => c.id === r.customerId), mawbs.find(m => m.id === r.mawbId))}>
                        PDF
                      </Button>
                      {r.status !== 'paid' && (
                        <Button size="small" type="primary" ghost icon={<CheckSquare size={14} />} onClick={() => markAsPaid(r.id)}>
                          Paid
                        </Button>
                      )}
                    </Space>
                  )
                }
              ]}
            />
          </Card>

          <Card 
            title={t('finance.pendingAR')} 
            extra={
              <Button 
                type="primary" 
                icon={<FileText size={16} />} 
                disabled={selectedARRows.length === 0}
                onClick={handleConsolidateAR}
              >
                Create Invoice ({selectedARRows.length})
              </Button>
            }
          >
            <Table
              rowSelection={{
                type: 'checkbox',
                selectedRowKeys: selectedARRows,
                onChange: (keys) => setSelectedARRows(keys),
                getCheckboxProps: (record) => ({
                  disabled: record.status === 'invoiced', // Can't invoicing twice
                }),
              }}
              dataSource={accountsReceivable.filter(ar => ar.status !== 'invoiced')}
              columns={arColumns}
              loading={loading}
              rowKey="id"
              size="small"
            />
          </Card>
        </div>
      )
    },
    {
      key: 'ap',
      label: <span className="flex items-center gap-2"><TrendingDown size={16} />{t('finance.accountsPayable')}</span>,
      children: (
        <Card title={t('finance.pendingAP')}>
          <Table dataSource={accountsPayable} columns={apColumns} loading={loading} rowKey="id" size="small" />
        </Card>
      )
    },
    {
      key: 'contrast',
      label: <span className="flex items-center gap-2"><BarChart3 size={16} />{t('finance.profitAnalysis')}</span>,
      children: (
        <Card title={t('finance.mawbContrast')}>
          <Table 
            dataSource={accountsReceivable.filter((ar, index, self) => 
               index === self.findIndex((t) => t.mawbNo === ar.mawbNo)
            )} 
            columns={contrastColumns} 
            loading={loading} 
            rowKey="id" 
            size="small" 
          />
        </Card>
      )
    }
  ];

  return (
    <div className="p-2">
      <div className="mb-6">
        <Title level={2}>{t('finance.title')}</Title>
        <Paragraph type="secondary">{t('finance.subtitle')}</Paragraph>
      </div>

      <Tabs 
        activeKey={currentTab} 
        onChange={setCurrentTab} 
        items={items} 
        className="bg-white p-4 rounded-xl shadow-sm border border-slate-200"
      />

      <Modal
        title={t('finance.newInvoice')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="invoiceNo" label={t('finance.invoiceNo')} rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="customerId" label={t('finance.customer')} rules={[{ required: true }]}>
            <Select options={customers.map(c => ({ label: c.name, value: c.id }))} />
          </Form.Item>
          <Space>
            <Form.Item name="amount" label={t('finance.amount')} rules={[{ required: true }]}>
              <InputNumber min={0} className="w-full" />
            </Form.Item>
            <Form.Item name="currency" label={t('booking.currency')} initialValue="USD">
              <Select options={[{ label: 'USD', value: 'USD' }, { label: 'CNY', value: 'CNY' }]} />
            </Form.Item>
          </Space>
          <Form.Item name="issueDate" label="Issue Date" initialValue={new Date().toISOString().split('T')[0]} rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
          <Form.Item name="dueDate" label="Due Date" rules={[{ required: true }]}>
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
