import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Form, Input, Select, InputNumber, Space, App, Tag, Row, Col, DatePicker, Card, Typography, Divider, Drawer, Statistic, Badge, Upload, Tooltip } from 'antd';
import { Customer, FlightRate, Booking, BookingStatus, MawbStatus, MAWB } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { FilePlus, Package, Printer, ExternalLink, FileText, Info } from 'lucide-react';
import dayjs from 'dayjs';
import { PDFService } from '../../services/PDFService';
import { useTranslation } from 'react-i18next';
import { businessApi, operationApi, uploadApi } from '../../services/api';

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
  const [loading, setLoading] = useState(false);
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [actionModalOpen, setActionModalOpen] = useState(false);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [manifestTarget, setManifestTarget] = useState<Booking | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [rateSchedule, setRateSchedule] = useState('');
  const { user: profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  const { message } = App.useApp();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bookRes, custRes, rateRes] = await Promise.all([
        businessApi.getBookings(),
        businessApi.getCustomers(),
        businessApi.getRates()
      ]);
      setBookings(bookRes.data);
      setCustomers(custRes.data);
      setRates(rateRes.data);
    } catch { message.error('Fetch failed'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async (values: any) => {
    const rate = rates.find(r => r.id === values.rateId);
    if (!rate) return;
    const customer = customers.find(c => c.id === values.customerId);
    try {
      await businessApi.createBooking({
        ...values, origin: rate.origin, destination: rate.destination,
        carrier: rate.carrier, flightNo: rate.flightNo,
        flightDate: values.flightDate.toISOString(),
        customerName: customer?.name || '',
      });
      message.success(t('common.success'));
      setNewModalOpen(false); fetchData(); form.resetFields();
    } catch { message.error(t('common.error')); }
  };

  const handleClientAction = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await businessApi.updateBooking(selectedBooking.id, { ...values, status: 'client_accepted' });
      message.success(t('common.success'));
      setActionModalOpen(false); fetchData();
    } catch { message.error(t('common.error')); }
  };

  const triggerDownload = (fileName: string) => {
    if (fileName?.startsWith('http')) window.open(fileName, '_blank');
    else {
      const blob = new Blob(['Mock file: ' + fileName], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    }
  };

  const handleUploadManifest = async (file: File) => {
    if (!manifestTarget) return false;
    try {
      const res = await uploadApi.uploadFile(file);
      await businessApi.updateBooking(manifestTarget.id, {
        manifestFileUrl: res.data.fileUrl, manifestFileName: res.data.fileName,
      });
      message.success('Manifest uploaded');
      setManifestModalOpen(false); setManifestTarget(null); fetchData();
    } catch { message.error('Upload failed'); }
    return false;
  };

  const getStatusTag = (status: BookingStatus | MawbStatus) => {
    const config = MAWB_STATUSES.find(x => x.value === status);
    return <Tag color={config?.color || 'default'}>{t(config?.labelKey || status)}</Tag>;
  };

  const needsAction = bookings.filter(b =>
    (b.status === 'pre_booked' || b.status === 'space_confirmed') || !b.manifestFileUrl
  ).length;

  return (
    <div className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('common.bookings')}</Title>
          <div className="flex items-center gap-2">
            <Text type="secondary">{t('bookings.subtitle')}</Text>
            {needsAction > 0 && <Badge count={needsAction} size="small" color="#faad14" />}
          </div>
        </div>
        <Button type="primary" size="large" icon={<FilePlus size={18} />}
          onClick={async () => {
            try { const [custRes, rateRes] = await Promise.all([businessApi.getCustomers(), businessApi.getRates()]); setCustomers(custRes.data); setRates(rateRes.data); } catch {}
            setNewModalOpen(true);
          }}>
          {t('common.add')}
        </Button>
      </div>

      <div className="mb-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1"><Info size={12} /> {t('operation.docs')||'Docs'}:</span>
        <span className="flex items-center gap-1"><Package size={12} className="text-blue-500" /> {t('operation.manifest')||'Manifest'} = {t('common.download')||'已上传'}</span>
        <span className="flex items-center gap-1"><Package size={12} className="text-slate-400" /> {t('operation.manifest')||'Manifest'} = {t('common.upload')||'待上传'}</span>
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <Table dataSource={bookings} loading={loading} rowKey="id" columns={[
          {
            title: t('quotes.quoteNo') || 'No',
            sorter: (a: Booking, b: Booking) => (a.bookingNo || '').localeCompare(b.bookingNo || ''),
            render: (r: Booking) => (
              <div className="flex flex-col cursor-pointer" onClick={() => { setSelectedBookingDetail(r); setDetailDrawerOpen(true); }}>
                <span className="text-sm font-mono font-bold text-blue-600">{r.bookingNo}</span>
                <span className="text-[10px] text-slate-500">{dayjs(r.createdAt).format('YYYY-MM-DD')}</span>
                {r.mawbNo && (
                  <span className="text-[10px] font-mono text-blue-500 mt-0.5 flex items-center gap-1" onClick={(e) => { e.stopPropagation(); window.open(`https://t.17track.net/zh-cn?nums=${r.mawbNo}`, '_blank'); }}>
                    {r.mawbNo} <ExternalLink size={10} />
                  </span>
                )}
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
            title: t('operation.docs') || 'Docs',
            render: (r: Booking) => (
              <Button size="small"
                icon={<Package size={14} className={r.manifestFileUrl ? 'text-blue-500' : 'text-slate-400'} />}
                onClick={() => {
                  if (r.manifestFileUrl) triggerDownload(r.manifestFileUrl);
                  else { setManifestTarget(r); setManifestModalOpen(true); }
                }}>
                {t('operation.manifest')||'Manifest'}
              </Button>
            ),
          },
          {
            title: t('common.status'),
            filters: [
              { text: t('booking.status.pending'), value: 'pending' },
              { text: t('booking.status.prebooked'), value: 'pre_booked' },
              { text: t('booking.status.space_confirmed'), value: 'space_confirmed' },
              { text: t('booking.status.client_accepted'), value: 'client_accepted' },
              { text: t('booking.status.finalized'), value: 'finalized' },
              { text: t('booking.status.closed'), value: 'closed' },
            ],
            onFilter: (value: any, r: Booking) => r.status === value,
            sorter: (a: Booking, b: Booking) => (a.status || '').localeCompare(b.status || ''),
            render: (r: Booking) => getStatusTag(r.status)
          },
          {
            title: t('common.actions'),
            align: 'right' as const,
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
        ]} />
      </div>

      <Modal title={t('common.add')} open={newModalOpen} onCancel={() => setNewModalOpen(false)}
        onOk={() => form.submit()} width={700}>
        <Form form={form} layout="vertical" onFinish={handleCreate} initialValues={{ pieces: 1, currency: 'CNY', declarationMethod: 'formal' }}>
          <Row gutter={16}>
             <Col span={12}><Form.Item name="customerId" label={t('common.customer')||'Customer'} rules={[{ required: true }]}>
               <Select options={customers.map(c => ({ label: c.name, value: c.id }))} /></Form.Item></Col>
             <Col span={12}><Form.Item name="rateId" label={t('common.route')||'Route'} rules={[{ required: true }]}>
               <Select options={rates.map(r => ({ label: `[${r.carrier}] ${r.origin}→${r.destination}`, value: r.id }))}
                 onChange={(id) => { const r = rates.find(x => x.id === id); setRateSchedule(r?.schedule || ''); }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="flightDate" label={t('common.flightDate')||'Flight Date'} rules={[{ required: true }]}>
              <DatePicker className="w-full" disabledDate={(current) => {
                if (!rateSchedule || !current) return false;
                const dow = current.day();
                const schedDays = rateSchedule.split(',').map(Number);
                return !schedDays.includes(dow === 0 ? 7 : dow);
              }} /></Form.Item></Col>
            <Col span={8}><Form.Item name="declarationMethod" label={t('bookings.declaration')||'Declaration'} rules={[{ required: true }]}>
              <Select options={[
                { label: t('bookings.declarationMethods.formal')||'Formal', value: 'formal' },
                { label: '9610', value: '9610' }, { label: '9710', value: '9710' }, { label: '9810', value: '9810' }
              ]} /></Form.Item></Col>
            <Col span={8}><Form.Item name="unitPrice" label={t('common.unitPrice')||'Unit Price'} rules={[{ required: true }]}>
              <InputNumber className="w-full" /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
             <Col span={8}><Form.Item name="pieces" label={t('common.pieces')||'Pieces'} rules={[{ required: true }]}><InputNumber className="w-full" min={1} /></Form.Item></Col>
             <Col span={8}><Form.Item name="weight" label={t('common.weight')||'Weight'} rules={[{ required: true }]}><InputNumber className="w-full" addonAfter="KG" /></Form.Item></Col>
             <Col span={8}><Form.Item name="volume" label={t('common.volume')||'Volume'} rules={[{ required: true }]}><InputNumber className="w-full" addonAfter="CBM" /></Form.Item></Col>
          </Row>
          <Form.Item name="goodsDescription" label={t('common.goodsDesc')||'Goods Description'} rules={[{ required: true }]}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('common.submit')||'Submit'} open={actionModalOpen} onCancel={() => setActionModalOpen(false)} onOk={() => clientForm.submit()}>
        <Form form={clientForm} layout="vertical" onFinish={handleClientAction}>
           <Form.Item name="shipperInfo" label={t('common.shipperInfo')||'Shipper Info'} rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
           <Form.Item name="consigneeInfo" label={t('common.consigneeInfo')||'Consignee Info'} rules={[{ required: true }]}><Input.TextArea rows={3} /></Form.Item>
           <Form.Item name="alsoNotify" label={t('common.notifyParty')||'Notify Party'}><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('operation.manifest')||'Manifest'} open={manifestModalOpen}
        onCancel={() => { setManifestModalOpen(false); setManifestTarget(null); }} footer={null}>
        <div className="py-4">
          <Upload.Dragger accept=".xlsx,.xls,.pdf"
            beforeUpload={(file) => handleUploadManifest(file)} showUploadList={false}>
            <p className="text-4xl mb-2 text-slate-300"><FileText size={32} /></p>
            <p className="text-sm font-medium">Click or drag manifest file here</p>
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) or PDF format, max 10MB</p>
          </Upload.Dragger>
        </div>
      </Modal>

      <Drawer title={<span className="font-mono">{selectedBookingDetail?.bookingNo}</span>}
        open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} width={450}>
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
            <Divider orientation="left">{t('operation.docs')||'Docs'}</Divider>
            {selectedBookingDetail.manifestFileUrl ? (
              <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(selectedBookingDetail.manifestFileUrl!)}>
                <Space><Package size={18} className="text-blue-500" /> <Text className="font-medium">{t('operation.manifest')||'Manifest'}</Text></Space>
                <Button type="link" icon={<ExternalLink size={14} />}>{t('common.download')||'Download'}</Button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 border rounded">
                <Space><Package size={18} className="text-slate-300" /> <Text className="font-medium text-slate-400">{t('operation.manifest')||'Manifest'}</Text></Space>
                <Text type="secondary" className="text-xs">{t('common.noData')||'Not uploaded'}</Text>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default BookingList;
