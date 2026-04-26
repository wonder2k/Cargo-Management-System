import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, App, Tag, Row, Col, DatePicker, Card, Typography, Divider, List, Badge, Upload } from 'antd';
import { collection, query, getDocs, addDoc, updateDoc, doc, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Customer, FlightRate, Booking, BookingStatus, MawbStatus, ExportDeclarationMethod, Warehouse } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { FilePlus, Package, Plane, ChevronRight, User, MapPin, Printer, CheckCircle2, XCircle, Clock, AlertCircle, Pause } from 'lucide-react';
import dayjs from 'dayjs';
import { PDFService } from '../../services/PDFService';
import { useTranslation } from 'react-i18next';
import * as XLSX from 'xlsx';

const { Text, Title } = Typography;

export const BookingList: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [rates, setRates] = useState<FlightRate[]>([]);
  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
      const [bookSnap, custSnap, rateSnap] = await Promise.all([
        getDocs(q),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'flight-rates'))
      ]);
      
      setBookings(bookSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
      setRates(rateSnap.docs.map(d => ({ id: d.id, ...d.data() } as FlightRate)));
    } catch (e: any) {
      message.error('Fetch failed: ' + e.message);
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
      const newBooking: Omit<Booking, 'id'> = {
        bookingNo: `BK-${Date.now().toString().slice(-6)}`,
        customerId: values.customerId,
        customerName: customers.find(c => c.id === values.customerId)?.name,
        rateId: values.rateId,
        origin: rate.origin,
        destination: rate.destination,
        carrier: rate.carrier,
        flightNo: rate.flightNo || '',
        flightDate: values.flightDate.toISOString(),
        pieces: values.pieces,
        weight: values.weight,
        volume: values.volume,
        goodsDescription: values.goodsDescription,
        declarationMethod: values.declarationMethod,
        unitPrice: values.unitPrice,
        currency: values.currency,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: profile?.uid || 'system'
      };

      await addDoc(collection(db, 'bookings'), newBooking);
      message.success(t('common.success'));
      setNewModalOpen(false);
      fetchData();
      form.resetFields();
    } catch (e: any) {
      message.error(t('common.error') + ': ' + e.message);
    }
  };

  const handleClientAction = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        ...values,
        status: 'client_accepted',
        updatedAt: new Date().toISOString()
      });
      message.success(t('common.success'));
      setActionModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(t('common.error') + ': ' + e.message);
    }
  };

  const getStatusTag = (status: BookingStatus | MawbStatus) => {
    switch (status) {
      case 'pending': return <Tag color="gold" icon={<Clock size={12} className="mr-1" />}>{t('booking.status.pending')}</Tag>;
      case 'pre_booked': return <Tag color="blue" icon={<Plane size={12} className="mr-1" />}>{t('booking.status.prebooked')}</Tag>;
      case 'space_partial': return <Tag color="cyan">{t('booking.status.partial')}</Tag>;
      case 'space_rejected': return <Tag color="error" icon={<XCircle size={12} className="mr-1" />}>{t('common.error')}</Tag>;
      case 'client_accepted': return <Tag color="processing" icon={<CheckCircle2 size={12} className="mr-1" />}>{t('booking.status.accepted')}</Tag>;
      case 'finalized': return <Tag color="green">{t('booking.status.finalized')}</Tag>;
      case 'warehouse_in': return <Tag color="cyan">{t('booking.status.warehouse_in')}</Tag>;
      case 'on_hold': return <Tag color="volcano" icon={<Pause size={12} className="mr-1" />}>{t('booking.status.on_hold')}</Tag>;
      default: return <Tag>{status}</Tag>;
    }
  };

  const handleBookingAction = async (id: string, newStatus: BookingStatus, extraData: any = {}) => {
    try {
      await updateDoc(doc(db, 'bookings', id), { 
        status: newStatus,
        ...extraData,
        updatedAt: new Date().toISOString()
      });
      message.success(`Action processed successfully`);
      fetchData();
    } catch (e: any) {
      message.error('Action failed: ' + e.message);
    }
  };

  const handlePrint = (booking: Booking) => {
    PDFService.generateBookingOrder(booking, undefined, profile);
  };

  const handleExportExcel = (booking: Booking) => {
    try {
      const data = [
        ['Field', 'Value'],
        ['Booking No', booking.bookingNo],
        ['MAWB No', booking.mawbNo],
        ['Customer', booking.customerName],
        ['Origin', booking.origin],
        ['Destination', booking.destination],
        ['Carrier', booking.carrier],
        ['Flight No', booking.flightNo],
        ['Flight Date', dayjs(booking.flightDate).format('YYYY-MM-DD')],
        ['Pieces', booking.pieces],
        ['Weight (KG)', booking.weight],
        ['Volume (CBM)', booking.volume],
        ['Goods Description', booking.goodsDescription],
        ['Shipper Info', booking.shipperInfo || '--'],
        ['Consignee Info', booking.consigneeInfo || '--'],
      ];

      // Add Warehouse info if exists
      const whInfo = (booking as any).warehouseInfo;
      if (whInfo) {
        data.push(['Actual Gross Weight', whInfo.grossWeight]);
        data.push(['Actual Chargeable Weight', whInfo.chargeableWeight]);
        data.push(['Actual Pieces', whInfo.actualPieces]);
      }

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Manifest");
      XLSX.writeFile(wb, `Manifest_${booking.bookingNo}.xlsx`);
      message.success(t('common.success'));
    } catch (e: any) {
      message.error(t('common.error') + ': ' + e.message);
    }
  };

  const bookingColumns = [
    { 
      title: t('booking.title'), 
      render: (_: any, r: Booking) => (
        <div className="flex flex-col">
          <span className="text-sm font-mono font-bold text-blue-600">{r.bookingNo}</span>
          <span className="text-xs text-slate-500">{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</span>
        </div>
      )
    },
    { 
      title: t('booking.route'), 
      render: (_: any, r: Booking) => (
        <div className="flex items-center gap-2">
          <Badge count={r.carrier} color="#1d4ed8" className="font-mono" />
          <div className="flex flex-col">
            <span className="text-sm font-bold">{r.origin} → {r.destination}</span>
            <span className="text-[10px] text-slate-400">ETD: {dayjs(r.flightDate).format('MM-DD')}</span>
          </div>
        </div>
      )
    },
    { 
      title: t('booking.description'), 
      render: (_: any, r: Booking) => {
        const whInfo = (r as any).warehouseInfo;
        return (
          <div className="text-xs">
            {whInfo ? (
              <div className="bg-blue-50 p-1 rounded border border-blue-100 mb-1">
                <Text strong className="text-[10px] text-blue-700">W/H: {whInfo.grossWeight}KG / {whInfo.chargeableWeight}KG</Text>
              </div>
            ) : (
              <div className="font-medium text-slate-700">{r.pieces} PCS / {r.weight} KGS / {r.volume} CBM</div>
            )}
            <div className="text-slate-400 truncate w-32">{r.goodsDescription}</div>
          </div>
        )
      }
    },
    { 
      title: t('common.status'), 
      render: (_: any, r: Booking) => (
        <div className="flex flex-col gap-1">
          {getStatusTag(r.status)}
          {r.spaceStatus === 'Partial' && <span className="text-[10px] text-orange-500 font-bold">{t('booking.status.partial')}: {r.confirmedVolume} CBM</span>}
        </div>
      )
    },
    { 
      title: t('common.actions'), 
      align: 'right' as const,
      render: (_: any, r: Booking) => (
        <Space>
           {r.draftMawbUrl && !r.isDraftConfirmed && (
             <Button 
               size="small" 
               type="primary" 
               className="bg-orange-500 border-orange-500" 
               onClick={() => handleBookingAction(r.id, r.status, { isDraftConfirmed: true })}
               icon={<CheckCircle2 size={14} />}
             >
               {t('booking.confirmDraft')}
             </Button>
           )}
           {r.manifestFileUrl && (
             <Button size="small" type="dashed" onClick={() => message.info(`${t('common.loading')} ${r.manifestFileUrl}`)} icon={<Package size={14} />}>{t('booking.manifest')}</Button>
           )}
           {(r.status === 'pre_booked' || r.status === 'space_confirmed' || r.status === 'space_partial') && (
             <Button type="primary" size="small" ghost onClick={() => { setSelectedBooking(r); setActionModalOpen(true); }}>{t('common.submit')}</Button>
           )}
           {r.status === 'warehouse_in' && (
             <>
               <Button size="small" danger onClick={() => handleBookingAction(r.id, 'on_hold')}>{t('booking.status.on_hold')}</Button>
               <Button size="small" type="primary" className="bg-blue-600" onClick={() => handleExportExcel(r)}>{t('booking.manifest')} Excel</Button>
             </>
           )}
           {r.status === 'on_hold' && (
             <Button size="small" type="primary" onClick={() => handleBookingAction(r.id, 'warehouse_in')}>{t('common.resume')}</Button>
           )}
           {r.status === 'finalized' && <Button icon={<Printer size={14} />} size="small" onClick={() => handlePrint(r)}>{t('booking.order')}</Button>}
        </Space>
      )
    }
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Title level={2}>{t('booking.title')}</Title>
          <Text type="secondary">{t('booking.new')}</Text>
        </div>
        <Button 
          type="primary" 
          size="large" 
          icon={<FilePlus size={18} />} 
          onClick={() => setNewModalOpen(true)}
          className="rounded-lg h-12 px-6 shadow-md shadow-blue-200"
        >
          {t('common.create')}
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <Table 
          dataSource={bookings} 
          loading={loading} 
          rowKey="id"
          columns={bookingColumns}
        />
      </div>

      {/* New Booking Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Package size={20} className="text-blue-500" />
            <span>{t('booking.new')}</span>
          </div>
        }
        open={newModalOpen}
        onCancel={() => setNewModalOpen(false)}
        onOk={() => form.submit()}
        width={750}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ pieces: 1, currency: 'CNY', declarationMethod: 'formal' }}>
          <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="customerId" label={t('booking.customer')} rules={[{ required: true }]}>
                 <Select 
                   showSearch 
                   placeholder={t('common.search')}
                   options={customers.map(c => ({ label: `${c.name} (${c.code})`, value: c.id }))}
                 />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="rateId" label={t('booking.route')} rules={[{ required: true }]}>
                 <Select 
                   showSearch 
                   placeholder={t('common.search')}
                   options={rates.filter(r => typeof r.baseFreight === 'number').map(r => ({ label: `[${r.carrier}] ${r.origin}→${r.destination}${r.flightNo ? ` | ${r.flightNo}` : ''}`, value: r.id }))}
                 />
               </Form.Item>
             </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="flightDate" label={t('booking.flightDate')} rules={[{ required: true }]}>
                <DatePicker className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="declarationMethod" label={t('booking.declaration')} rules={[{ required: true }]}>
                <Select options={[
                  { label: 'Formal', value: 'formal' },
                  { label: '9610', value: '9610' },
                  { label: '9710', value: '9710' },
                  { label: '9810', value: '9810' },
                ]} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="unitPrice" label={t('booking.unitPrice')} rules={[{ required: true }]}>
                <InputNumber className="w-full" placeholder="Price/KG" step={0.1} precision={2} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
             <Col span={6}>
               <Form.Item name="pieces" label={t('booking.pieces')} rules={[{ required: true }]}>
                 <InputNumber className="w-full" min={1} />
               </Form.Item>
             </Col>
             <Col span={6}>
               <Form.Item name="weight" label={t('booking.weight')} rules={[{ required: true }]}>
                 <InputNumber className="w-full" addonAfter="KG" precision={2} />
               </Form.Item>
             </Col>
             <Col span={6}>
               <Form.Item name="volume" label={t('booking.volume')} rules={[{ required: true }]}>
                 <InputNumber className="w-full" addonAfter="CBM" precision={2} />
               </Form.Item>
             </Col>
             <Col span={6}>
               <Form.Item name="currency" label={t('booking.currency')}>
                 <Select options={[{ label: 'CNY', value: 'CNY' }, { label: 'USD', value: 'USD' }]} />
               </Form.Item>
             </Col>
          </Row>

          <Form.Item name="goodsDescription" label={t('booking.description')} rules={[{ required: true }]}>
            <Input.TextArea placeholder={t('booking.description')} rows={2} />
          </Form.Item>

          <Form.Item label={t('booking.manifest') + ' (Excel)'} required>
             <Upload 
               maxCount={1}
               beforeUpload={() => false}
               onChange={(info) => {
                 if (info.fileList.length > 0) {
                   form.setFieldsValue({ manifestFileUrl: info.fileList[0].name });
                 }
               }}
             >
               <Button icon={<FilePlus size={14} />}>{t('common.search')}</Button>
             </Upload>
             <Form.Item name="manifestFileUrl" noStyle rules={[{ required: true, message: 'Please upload manifest' }]}>
               <Input type="hidden" />
             </Form.Item>
          </Form.Item>

          <div className="bg-amber-50 p-4 rounded-lg border border-amber-100">
             <div className="flex gap-2">
                <AlertCircle size={16} className="text-amber-500 mt-1" />
                <Text type="secondary" className="text-xs">
                   Tips: {t('booking.status.pending')}
                </Text>
             </div>
          </div>
        </Form>
      </Modal>

      {/* Client Consignment Modal */}
      <Modal
        title={t('common.submit')}
        open={actionModalOpen}
        onCancel={() => setActionModalOpen(false)}
        onOk={() => clientForm.submit()}
        width={700}
      >
        <Form form={clientForm} layout="vertical" onFinish={handleClientAction}>
           <div className="mb-4 bg-blue-50 p-3 rounded border border-blue-100">
              <Text strong className="block text-blue-800">{t('booking.status.prebooked')}</Text>
              <Text className="text-sm">{t('common.status')}: <b>{selectedBooking?.spaceStatus}</b> | {t('booking.internalNotes')}: {selectedBooking?.operationRemarks || '--'}</Text>
           </div>
           
           <Form.Item name="shipperInfo" label={t('booking.shipper')} rules={[{ required: true }]}>
             <Input.TextArea rows={3} placeholder="Name, Address, Contact..." />
           </Form.Item>
           <Form.Item name="consigneeInfo" label={t('booking.consignee')} rules={[{ required: true }]}>
             <Input.TextArea rows={3} placeholder="Full consignee details..." />
           </Form.Item>
           <Form.Item name="alsoNotify" label={t('booking.notify')}>
             <Input.TextArea rows={2} />
           </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookingList;
