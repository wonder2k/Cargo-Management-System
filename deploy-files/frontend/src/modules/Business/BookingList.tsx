import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, App, Tag, Row, Col, DatePicker, Card, Typography, Divider, Drawer, Statistic, Badge } from 'antd';
import { Customer, FlightRate, Booking, BookingStatus, MawbStatus, MAWB } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FilePlus, Package, ChevronRight, Printer, CheckCircle2, Pause, ExternalLink, FileText } from 'lucide-react';
import dayjs from 'dayjs';
import { PDFService } from '../../services/PDFService';
import { useTranslation } from 'react-i18next';
import { businessApi, operationApi } from '../../services/api';

const { Text, Title } = Typography;

const MAWB_STATUSES: { value: string; labelKey: string; color: string }[] = [
  { value: 'pending', labelKey: 'booking.status.pending', color: 'orange' },
  { value: 'pre_booked', labelKey: 'booking.status.prebooked', color: 'gold' },
  { value: 'space_confirmed', labelKey: 'booking.status.space_confirmed', color: 'green' },
  { value: 'space_partial', labelKey: 'booking.status.partial', color: 'cyan' },
  { value: 'space_rejected', labelKey: 'booking.status.space_rejected', color: 'red' },
  { value: 'booked', labelKey: 'booking.status.booked', color: 'blue' },
  { value: 'confirmed', labelKey: 'operation.whseEntryConfirmed', color: 'lime' },
  { value: 'warehouse_in', labelKey: 'booking.status.warehouse_in', color: 'cyan' },
  { value: 'customs', labelKey: 'booking.status.customs', color: 'geekblue' },
  { value: 'terminal_in', labelKey: 'operation.setTerminalIn', color: 'purple' },
  { value: 'departed', labelKey: 'booking.status.departed', color: 'blue' },
  { value: 'arrived', labelKey: 'booking.status.arrived', color: 'green' },
  { value: 'closed', labelKey: 'booking.status.closed', color: '#8c8c8c' },
  { value: 'exception', labelKey: 'operation.exception', color: 'red' },
  { value: 'on_hold', labelKey: 'booking.status.on_hold', color: 'volcano' },
  { value: 'client_accepted', labelKey: 'booking.status.client_accepted', color: 'processing' },
  { value: 'finalized', labelKey: 'booking.status.finalized', color: 'green' },
];

export const BookingList: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rates, setRates] = useState<FlightRate[]>([]);
  const [mawbs, setMawbs] = useState<MAWB[]>([]); 
  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { user: profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookRes, custRes, rateRes, mawbRes] = await Promise.all([
        businessApi.getBookings(),
        businessApi.getCustomers(),
        businessApi.getRates(),
        operationApi.getMawbs()
      ]);
      
      setBookings(bookRes.data);
      setCustomers(custRes.data);
      setRates(rateRes.data);
      setMawbs(mawbRes.data);
    } catch (e: any) {
      message.error('Fetch failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (values: any) => {
    const rate = rates.find(r => r.id === values.rateId);
    if (!rate) return;

    try {
      await businessApi.createBooking({
        ...values,
        origin: rate.origin,
        destination: rate.destination,
        carrier: rate.carrier,
        flightNo: rate.flightNo,
        flightDate: values.flightDate.toISOString(),
      });
      message.success(t('common.success'));
      setNewModalOpen(false);
      fetchData();
      form.resetFields();
    } catch (e: any) {
      message.error(t('common.error'));
    }
  };

  const handleClientAction = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await businessApi.updateBooking(selectedBooking.id, {
        ...values,
        status: 'client_accepted'
      });
      message.success(t('common.success'));
      setActionModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(t('common.error'));
    }
  };

  const getStatusTag = (status: BookingStatus | MawbStatus) => {
    const config = MAWB_STATUSES.find(x => x.value === status);
    return <Tag color={config?.color || 'default'}>{t(config?.labelKey || status)}</Tag>;
  };

  const handleBookingAction = async (id: string | number, newStatus: BookingStatus, extraData: any = {}) => {
    try {
      await businessApi.updateBooking(id, { 
        status: newStatus,
        ...extraData
      });
      message.success(`Action processed`);
      fetchData();
    } catch (e: any) {
      message.error('Action failed');
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('common.bookings')}</Title>
          <Text type="secondary">Manage your air cargo bookings</Text>
        </div>
        <Button 
          type="primary" 
          size="large" 
          icon={<FilePlus size={18} />} 
          onClick={() => setNewModalOpen(true)}
        >
          {t('common.add')}
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <Table 
          dataSource={bookings} 
          loading={loading} 
          rowKey="id"
          columns={[
            { 
              title: t('quotes.quoteNo') || 'No', 
              render: (r: Booking) => (
                <div className="flex flex-col cursor-pointer" onClick={() => { setSelectedBookingDetail(r); setDetailDrawerOpen(true); }}>
                  <span className="text-sm font-mono font-bold text-blue-600">{r.bookingNo}</span>
                  <span className="text-[10px] text-slate-500">{dayjs(r.createdAt).format('YYYY-MM-DD')}</span>
                </div>
              )
            },
            { 
              title: 'Route', 
              render: (r: Booking) => (
                <div className="flex items-center gap-2">
                  <Badge count={r.carrier} color="#1d4ed8" />
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">{r.origin} → {r.destination}</span>
                    <span className="text-[10px] text-slate-400">ETD: {dayjs(r.flightDate).format('MM-DD')}</span>
                  </div>
                </div>
              )
            },
            { 
              title: 'Cargo', 
              render: (r: Booking) => (
                <div className="text-xs">
                  <div className="font-medium text-slate-700">{r.pieces} PCS / {r.weight} KGS</div>
                  <div className="text-slate-400 truncate w-32">{r.goodsDescription}</div>
                </div>
              )
            },
            { 
              title: t('common.status'), 
              render: (r: Booking) => getStatusTag(r.status)
            },
            { 
              title: t('common.actions'), 
              align: 'right',
              render: (r: Booking) => (
                <Space>
                  {(r.status === 'pre_booked' || r.status === 'space_confirmed') && (
                    <Button type="primary" size="small" ghost onClick={() => { setSelectedBooking(r); setActionModalOpen(true); }}>{t('common.submit')}</Button>
                  )}
                  {r.status === 'finalized' && (
                    <Button size="small" icon={<Printer size={14} />} onClick={() => PDFService.generateBookingOrder(r, undefined, profile)} />
                  )}
                </Space>
              )
            }
          ]}
        />
      </div>

      <Modal
        title={t('common.add')}
        open={newModalOpen}
        onCancel={() => setNewModalOpen(false)}
        onOk={() => form.submit()}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ pieces: 1, currency: 'CNY', declarationMethod: 'formal' }}>
          <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="customerId" label="Customer" rules={[{ required: true }]}>
                 <Select options={customers.map(c => ({ label: c.name, value: c.id }))} />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="rateId" label="Route" rules={[{ required: true }]}>
                 <Select options={rates.map(r => ({ label: `[${r.carrier}] ${r.origin}→${r.destination}`, value: r.id }))} />
               </Form.Item>
             </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="flightDate" label="Flight Date" rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="declarationMethod" label="Declaration" rules={[{ required: true }]}>
                <Select options={[{ label: 'Formal', value: 'formal' }, { label: '9610', value: '9610' }]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unitPrice" label="Unit Price" rules={[{ required: true }]}>
                <InputNumber className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
             <Col span={8}>
               <Form.Item name="pieces" label="Pieces" rules={[{ required: true }]}><InputNumber className="w-full" min={1} /></Form.Item>
             </Col>
             <Col span={8}>
               <Form.Item name="weight" label="Weight" rules={[{ required: true }]}><InputNumber className="w-full" addonAfter="KG" /></Form.Item>
             </Col>
             <Col span={8}>
               <Form.Item name="volume" label="Volume" rules={[{ required: true }]}><InputNumber className="w-full" addonAfter="CBM" /></Form.Item>
             </Col>
          </Row>
          <Form.Item name="goodsDescription" label="Goods Description" rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('common.submit')} open={actionModalOpen} onCancel={() => setActionModalOpen(false)} onOk={() => clientForm.submit()}>
        <Form form={clientForm} layout="vertical" onFinish={handleClientAction}>
           <Form.Item name="shipperInfo" label="Shipper Info" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
           <Form.Item name="consigneeInfo" label="Consignee Info" rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
           <Form.Item name="alsoNotify" label="Notify Party"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Drawer
         title={<span className="font-mono">{selectedBookingDetail?.bookingNo}</span>}
         open={detailDrawerOpen}
         onClose={() => setDetailDrawerOpen(false)}
         width={450}
       >
         {selectedBookingDetail && (
           <div className="space-y-4">
             <Card size="small" className="bg-slate-50">
               <Row gutter={[16, 16]}>
                 <Col span={24}><Text type="secondary">Customer:</Text> <div className="font-bold">{selectedBookingDetail.customerName}</div></Col>
                 <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</div></Col>
                 <Col span={12}><Text type="secondary">Carrier:</Text> <div className="font-bold font-mono">{selectedBookingDetail.carrier}</div></Col>
               </Row>
             </Card>
             <Divider />
             <Row gutter={[16, 16]}>
               <Col span={8}><Statistic title="Pieces" value={selectedBookingDetail.pieces} /></Col>
               <Col span={8}><Statistic title="Weight" value={selectedBookingDetail.weight} suffix="KG" /></Col>
               <Col span={8}><Statistic title="Volume" value={selectedBookingDetail.volume} suffix="CBM" /></Col>
             </Row>
           </div>
         )}
       </Drawer>
    </div>
  );
};

export default BookingList;
