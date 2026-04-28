import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography, Tabs, Drawer, Upload, Tooltip, DatePicker } from 'antd';
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy, where, writeBatch } from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../lib/firebase';
import { Invoice, InvoiceStatus, Customer, MAWB, AccountsPayable } from '../../types';
import { Plus, CheckSquare, DollarSign, Download, AlertCircle, TrendingUp, TrendingDown, FileText, BarChart3, Edit, Upload as UploadIcon, Check, Equal } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PDFService } from '../../services/PDFService';
import { CreditService } from '../../services/CreditService';
import { useTranslation } from 'react-i18next';

const { Text, Title, Paragraph } = Typography;
const { RangePicker } = DatePicker;
export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [dateRange, setDateRange] = useState<any>(null);
  const [accountsReceivable, setAccountsReceivable] = useState<any[]>([]);
  const [accountsPayable, setAccountsPayable] = useState<AccountsPayable[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [editingAP, setEditingAP] = useState<AccountsPayable | null>(null);
  const [payingAP, setPayingAP] = useState<AccountsPayable | null>(null);
  const [uploadingAPId, setUploadingAPId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<(Customer & { outstanding: number })[]>([]);
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedARRows, setSelectedARRows] = useState<React.Key[]>([]);
  const [currentTab, setCurrentTab] = useState('ar');
  
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [payForm] = Form.useForm();
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
      const apData = apSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AccountsPayable));
      setAccountsPayable(apData);

      const bSnap = await getDocs(collection(db, 'bookings'));
      setBookings(bSnap.docs.map(d => ({id: d.id, ...d.data()})));

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
          declarationMethod: item.declarationMethod,
          // Breakdown details
          unitPrice: item.price,
          fuelSurcharge: item.fuelSurcharge,
          securityScreening: item.securityScreening,
          terminalHandling: item.terminalHandling,
          customsClearance: item.customsClearance,
          miscFees: item.miscFees
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
      title: t('finance.mawb'), 
      dataIndex: 'mawbNo', 
      sorter: (a: any, b: any) => a.mawbNo.localeCompare(b.mawbNo) 
    },
    { 
      title: t('finance.customer'), 
      dataIndex: 'customerName',
      sorter: (a: any, b: any) => a.customerName.localeCompare(b.customerName)
    },
    { title: t('booking.route'), dataIndex: 'route' },
    { 
      title: t('booking.cargo'), 
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
      title: t('finance.amount'), 
      dataIndex: 'totalAmount', 
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
      render: (val: number, r: any) => <Text strong>{r.currency} {val.toFixed(2)}</Text> 
    },
    { 
      title: t('common.status'), 
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'invoiced' ? 'blue' : 'orange'}>
          {(status || 'pending').toUpperCase()}
        </Tag>
      )
    },
    { 
      title: t('common.date'), 
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
    { title: t('customers.companyName'), dataIndex: 'vendorName', sorter: (a: any, b: any) => a.vendorName.localeCompare(b.vendorName) },
    { title: t('booking.route'), dataIndex: 'route', sorter: (a: any, b: any) => a.route.localeCompare(b.route) },
    { 
      title: t('booking.cargo'), 
      render: (_: any, r: any) => <span className="text-[11px]">{r.pieces}P / {r.weight}K</span>
    },
    { 
      title: t('finance.amount'), 
      dataIndex: 'totalAmount', 
      sorter: (a: any, b: any) => a.totalAmount - b.totalAmount,
      render: (val: number, r: any) => (
        <div className="flex flex-col">
          <Text strong className="text-red-600">{r.currency} {val.toFixed(2)}</Text>
          {r.paidAmount && r.paidAmount !== val && (
            <Text type="secondary" className="text-[10px]">差额: {(val - r.paidAmount).toFixed(2)}</Text>
          )}
        </div>
      )
    },
    { 
      title: t('common.status'), 
      dataIndex: 'status',
      render: (status: string) => (
        <Tag color={status === 'paid' ? 'success' : 'warning'}>
          {(status || 'pending').toUpperCase()}
        </Tag>
      )
    },
    {
      title: t('common.actions'),
      render: (_, r: AccountsPayable) => r.status === 'paid' ? null : (
        <Space size="small">
          <Tooltip title="修改AP详情">
            <Button size="small" icon={<Edit size={14} />} onClick={() => setEditingAP(r)} />
          </Tooltip>
          <Tooltip title="确认支付">
            <Button size="small" type="primary" ghost icon={<DollarSign size={14} />} onClick={() => setPayingAP(r)} />
          </Tooltip>
          <Tooltip title="上传Invoice">
          <Upload showUploadList={false} beforeUpload={(file) => {
             (async () => {
                 setUploadingAPId(r.id);
                 await updateDoc(doc(db, 'accountsPayable', r.id), { vendorInvoiceUrl: 'mock-url' });
                 message.success(t('common.success'));
                 setUploadingAPId(null);
                 fetchData();
             })();
             return false;
          }}>
            <Button size="small" icon={<UploadIcon size={14} />} loading={uploadingAPId === r.id} />
          </Upload>
          </Tooltip>
        </Space>
      )
    }
  ];

  const contrastColumns = [
    { title: t('finance.mawb'), dataIndex: 'mawbNo' },
    { title: t('finance.flightDate'), render: (_: any, r: any) => bookings.find(b => b.mawbNo === r.mawbNo)?.flightDate ? new Date(bookings.find(b => b.mawbNo === r.mawbNo).flightDate).toLocaleDateString() : '-' },
    { 
      title: t('finance.revenue'), 
      render: (_: any, r: any) => {
        const ar = accountsReceivable.find(x => x.mawbNo === r.mawbNo);
        return ar ? (
          <Space>
            {ar.currency} {ar.totalAmount.toFixed(2)}
            {ar.status === 'paid' ? <Check size={14} className="text-green-500" /> : <Equal size={14} className="text-yellow-500" />}
          </Space>
        ) : '-';
      }
    },
    { 
      title: t('finance.cost'), 
      render: (_: any, r: any) => {
        const ap = accountsPayable.find(x => x.mawbNo === r.mawbNo);
        return ap ? (
          <Space>
            {ap.currency} {ap.totalAmount.toFixed(2)}
            {ap.status === 'paid' ? <Check size={14} className="text-green-500" /> : <Equal size={14} className="text-yellow-500" />}
          </Space>
        ) : '-';
      }
    },
    {
      title: t('finance.profit'),
      render: (_: any, r: any) => {
        const ar = accountsReceivable.find(x => x.mawbNo === r.mawbNo);
        const ap = accountsPayable.find(x => x.mawbNo === r.mawbNo);
        if (!ar) return '-';
        const profit = ar.totalAmount - (ap?.totalAmount || 0);
        return (
          <Text strong className={profit >= 0 ? 'text-green-600' : 'text-red-600'}>
            {ar.currency} {profit.toFixed(2)}
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
                {t('common.create')}
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
                  render: (v, r) => `${r.currency} ${v.toFixed(2)}` 
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
                      <Button 
                        size="small" 
                        icon={<TrendingUp size={14} />} 
                        onClick={async () => {
                          try {
                            const bQ = query(collection(db, 'bookings'), where('mawbNo', '==', r.lineItems?.[0]?.reference || ''));
                            const bSnap = await getDocs(bQ);
                            if (bSnap.empty) {
                              message.warning('No associated booking found to sync breakdown');
                              return;
                            }
                            const booking = bSnap.docs[0].data();
                            const newLineItems = r.lineItems.map((item: any) => ({
                              ...item,
                              unitPrice: booking.unitPrice,
                              fuelSurcharge: booking.fuelSurcharge || 0,
                              securityScreening: booking.securityScreening || 0,
                              terminalHandling: booking.terminalHandling || 0,
                              customsClearance: booking.customsMethods?.[booking.declarationMethod] || booking.customsClearance,
                              miscFees: booking.miscFees || []
                            }));
                            await updateDoc(doc(db, 'invoices', r.id), { lineItems: newLineItems });
                            message.success('Breakdown synced from booking');
                            fetchData();
                          } catch (e) {
                            message.error('Sync failed');
                          }
                        }}
                      >
                        Sync
                      </Button>
                      {r.status !== 'paid' && (
                        <Button size="small" type="primary" ghost icon={<CheckSquare size={14} />} onClick={() => markAsPaid(r.id)}>
                          {t('finance.paid')}
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
                {t('finance.newInvoice')} ({selectedARRows.length})
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
        <Card title={t('finance.mawbContrast')} extra={
            <Space>
              <RangePicker onChange={(dates) => setDateRange(dates)} />
              <div className="flex gap-4">
                 <Text strong>MAWB: {(() => {
                     const filtered = accountsReceivable.filter((ar, index, self) => {
                         const isUnique = index === self.findIndex((t) => t.mawbNo === ar.mawbNo);
                         if (!isUnique) return false;
                         if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
                         const booking = bookings.find(b => b.mawbNo === ar.mawbNo);
                         if (!booking) return false;
                         const flightDate = new Date(booking.flightDate);
                         return flightDate >= dateRange[0].toDate() && flightDate <= dateRange[1].toDate();
                     });
                     return filtered.length;
                 })()}</Text>
                 <Text strong>Profit: {(() => {
                     const filtered = accountsReceivable.filter((ar, index, self) => {
                         const isUnique = index === self.findIndex((t) => t.mawbNo === ar.mawbNo);
                         if (!isUnique) return false;
                         if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
                         const booking = bookings.find(b => b.mawbNo === ar.mawbNo);
                         if (!booking) return false;
                         const flightDate = new Date(booking.flightDate);
                         return flightDate >= dateRange[0].toDate() && flightDate <= dateRange[1].toDate();
                     });
                     return filtered.reduce((sum, ar) => {
                         const ap = accountsPayable.find(x => x.mawbNo === ar.mawbNo);
                         return sum + (ar.totalAmount - (ap?.totalAmount || 0));
                     }, 0).toFixed(2);
                 })()}</Text>
              </div>
            </Space>
        }>
          <Table 
            dataSource={accountsReceivable.filter((ar, index, self) => {
               const isUnique = index === self.findIndex((t) => t.mawbNo === ar.mawbNo);
               if (!isUnique) return false;
               if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
               const booking = bookings.find(b => b.mawbNo === ar.mawbNo);
               if (!booking) return false;
               const flightDate = new Date(booking.flightDate);
               return flightDate >= dateRange[0].toDate() && flightDate <= dateRange[1].toDate();
            })} 
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

      <Drawer
        title="Edit AP Details"
        open={!!editingAP}
        onClose={() => setEditingAP(null)}
        width={500}
      >
        {editingAP && (
          <Form initialValues={editingAP} onFinish={async (values) => {
            await updateDoc(doc(db, 'accountsPayable', editingAP.id), values);
            message.success('Updated');
            setEditingAP(null);
            fetchData();
          }}>
            <Form.List name="lineItems">
              {(fields, { add, remove }) => (
                <>
                  <div className="mb-4">
                    {editingAP.lineItems?.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <Input value={item.name} readOnly />
                        <InputNumber value={item.amount} readOnly />
                      </div>
                    ))}
                  </div>
                  <div className="font-bold mb-2">Add/Edit Items:</div>
                  {fields.map(field => (
                    <Space key={field.key} className="flex mb-2">
                      <Form.Item {...field} name={[field.name, 'name']} rules={[{ required: true }]}>
                        <Input placeholder="Item Name" />
                      </Form.Item>
                      <Form.Item {...field} name={[field.name, 'amount']} rules={[{ required: true }]}>
                        <InputNumber placeholder="Amount" />
                      </Form.Item>
                      <Button onClick={() => remove(field.name)}>Delete</Button>
                    </Space>
                  ))}
                  <Button type="dashed" onClick={() => add()} block>Add Item</Button>
                </>
              )}
            </Form.List>
            <Button type="primary" htmlType="submit" className="mt-4">Save Breakdown</Button>
          </Form>
        )}
      </Drawer>

      <Modal
        title="确认支付"
        open={!!payingAP}
        onCancel={() => setPayingAP(null)}
        onOk={() => payForm.submit()}
      >
        <Form form={payForm} onFinish={async (values) => {
           if (!payingAP) return;
           await updateDoc(doc(db, 'accountsPayable', payingAP.id), { 
             status: 'paid',
             paidAmount: values.paidAmount
           });
           message.success('已付款');
           setPayingAP(null);
           fetchData();
        }}>
          <Form.Item name="paidAmount" label="支付金额" rules={[{ required: true }]}>
            <InputNumber className="w-full" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
