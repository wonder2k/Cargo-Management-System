import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Drawer, Steps, Form, Input, Select, App, Space, Typography, theme, Row, Col, Modal, Tabs, InputNumber, DatePicker, Tooltip, Empty, Upload, Divider, Badge } from 'antd';
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { MAWB, MawbStatus, Customer, Booking, BookingStatus } from '../../types';
import { Plus, Info, LayoutList, History, FileText, ChevronRight, CheckCircle2, XCircle, Package, MapPin, Plane, Search, Play, Pause, Camera, ExternalLink, Activity } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import MawbTrackingTable from '../../components/MawbTrackingTable';

const { Text, Title } = Typography;

const MAWB_STATUSES: { value: MawbStatus; labelKey: string; color: string }[] = [
  { value: 'pending', labelKey: 'booking.status.pending', color: 'orange' },
  { value: 'booked', labelKey: 'booking.status.prebooked', color: 'gold' },
  { value: 'confirmed', labelKey: 'operation.whseEntryConfirmed', color: 'lime' },
  { value: 'warehouse_in', labelKey: 'booking.status.warehouse_in', color: 'cyan' },
  { value: 'customs', labelKey: 'booking.status.customs', color: 'geekblue' },
  { value: 'terminal_in', labelKey: 'operation.setTerminalIn', color: 'purple' },
  { value: 'departed', labelKey: 'booking.status.departed', color: 'blue' },
  { value: 'arrived', labelKey: 'booking.status.arrived', color: 'green' },
  { value: 'closed', labelKey: 'common.ok', color: '#8c8c8c' },
  { value: 'exception', labelKey: 'operation.exception', color: 'red' },
  { value: 'on_hold', labelKey: 'booking.status.on_hold', color: 'volcano' },
];

export const MawbList: React.FC = () => {
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMawb, setSelectedMawb] = useState<MAWB | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [finalBookingModalOpen, setFinalBookingModalOpen] = useState(false);
  
  // New Modals for Operation Steps
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  
  const [searchText, setSearchText] = useState('');
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [warehouseForm] = Form.useForm();
  const [draftForm] = Form.useForm();
  const [customsForm] = Form.useForm();
  const [terminalForm] = Form.useForm();
  const [trackingForm] = Form.useForm();
  const [spaceForm] = Form.useForm();
  const [finalForm] = Form.useForm();
  const { message } = App.useApp();

  const warehouseGrossWeight = Form.useWatch('grossWeight', warehouseForm);
  const warehouseDims = Form.useWatch('dims', warehouseForm);

  useEffect(() => {
    if (warehouseGrossWeight !== undefined || warehouseDims) {
      const volWeight = (warehouseDims || []).reduce((acc: number, dim: any) => {
        const l = Number(dim?.l) || 0;
        const w = Number(dim?.w) || 0;
        const h = Number(dim?.h) || 0;
        return acc + (l * w * h) / 6000;
      }, 0);
      const calculatedChargeable = Math.max(warehouseGrossWeight || 0, volWeight);
      
      const currentVal = warehouseForm.getFieldValue('chargeableWeight');
      const newVal = Number(calculatedChargeable.toFixed(2));
      if (currentVal !== newVal) {
        warehouseForm.setFieldsValue({ chargeableWeight: newVal });
      }
    }
  }, [warehouseGrossWeight, warehouseDims, warehouseForm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const mawbSnap = await getDocs(query(collection(db, 'mawbs'), orderBy('lastUpdated', 'desc')));
      const bookSnap = await getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc')));
      const custSnap = await getDocs(collection(db, 'customers'));

      setMawbs(mawbSnap.docs.map(d => ({ id: d.id, ...d.data() } as MAWB)));
      setPendingBookings(bookSnap.docs.map(d => ({ id: d.id, ...d.data() } as Booking)));
      setCustomers(custSnap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    } catch (e) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatusTransition = (record: MAWB) => {
    setSelectedMawb(record);
    switch (record.status) {
      case 'booked':
      case 'confirmed':
        warehouseForm.setFieldsValue(record);
        setWarehouseModalOpen(true);
        break;
      case 'warehouse_in': {
        const b = pendingBookings.find(bk => bk.mawbNo === record.internalMawbNo);
        if (!b?.draftMawbUrl) {
          draftForm.setFieldsValue({ draftMawbUrl: `${record.internalMawbNo}_Draft.pdf` });
          setDraftModalOpen(true);
        } else if (!b?.isDraftConfirmed) {
          message.warning('Waiting for client to confirm MAWB Draft');
        } else {
          customsForm.setFieldsValue(record);
          setCustomsModalOpen(true);
        }
        break;
      }
      case 'customs':
        terminalForm.setFieldsValue(record);
        setTerminalModalOpen(true);
        break;
      case 'terminal_in':
      case 'departed':
        trackingForm.setFieldsValue(record);
        setTrackingModalOpen(true);
        break;
      default:
        setDrawerOpen(true);
    }
  };

  const handleUpdateStep = async (newStatus: MawbStatus, values: any = {}) => {
    if (!selectedMawb) return;
    try {
      const now = new Date().toISOString();
      const cleanedValues = Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, v === undefined ? null : v])
      );
      
      const updatedData = {
        ...cleanedValues,
        status: newStatus,
        lastUpdated: now
      };
      
      await updateDoc(doc(db, 'mawbs', selectedMawb.id), updatedData);
      
      // If warehouse in, also notify booking and update tracking status if possible
      if (newStatus === 'warehouse_in') {
        const q = query(collection(db, 'bookings'), where('mawbNo', '==', selectedMawb.internalMawbNo));
        const bookingSnap = await getDocs(q);
        if (!bookingSnap.empty) {
          await updateDoc(doc(db, 'bookings', bookingSnap.docs[0].id), {
            status: 'warehouse_in',
            warehouseInfo: values
          });
        }

        // Try to trigger 17TRACK registration automatically when warehouse in
        try {
          fetch('/api/track/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: selectedMawb.internalMawbNo })
          });
        } catch (e) {
          console.error('Auto-track registration failed', e);
        }
      }

      message.success(t('common.updated'));
      fetchData();
      setWarehouseModalOpen(false);
      setCustomsModalOpen(false);
      setTerminalModalOpen(false);
      setTrackingModalOpen(false);
    } catch (e) {
      message.error(t('common.error'));
    }
  };

  const handleUploadDraft = async (values: any) => {
    if (!selectedMawb) return;
    try {
      const q = query(collection(db, 'bookings'), where('mawbNo', '==', selectedMawb.internalMawbNo));
      const bookingSnap = await getDocs(q);
      if (!bookingSnap.empty) {
        await updateDoc(doc(db, 'bookings', bookingSnap.docs[0].id), {
          draftMawbUrl: values.draftMawbUrl,
          isDraftConfirmed: false
        });
        message.success(t('common.success'));
        setDraftModalOpen(false);
        fetchData();
      }
    } catch (e) {
      message.error(t('common.error'));
    }
  };

  const filteredMawbs = mawbs.filter(m => 
    m.internalMawbNo.toLowerCase().includes(searchText.toLowerCase()) ||
    m.origin.toLowerCase().includes(searchText.toLowerCase()) ||
    m.destination.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleConfirmSpace = async (values: any) => {
    if (!selectedBooking) return;
    try {
      const status: BookingStatus = values.spaceStatus === 'Yes' ? 'space_confirmed' : 
                                    values.spaceStatus === 'Partial' ? 'space_partial' : 'space_rejected';
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        status,
        spaceStatus: values.spaceStatus,
        operationRemarks: values.operationRemarks || '',
        updatedAt: new Date().toISOString()
      });
      message.success('Space status updated');
      setSpaceModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error('Failed to update space: ' + e.message);
    }
  };

  const handleFinalBooking = async (values: any) => {
    if (!selectedBooking) return;
    try {
      // 1. Create MAWB record
      const mawbData: Omit<MAWB, 'id'> = {
        internalMawbNo: values.mawbNo || '',
        customerId: selectedBooking.customerId || '',
        origin: selectedBooking.origin || '',
        destination: selectedBooking.destination || '',
        carrier: selectedBooking.carrier || '',
        flightNo: selectedBooking.flightNo || selectedBooking.flightDate || '',
        status: 'booked',
        lastUpdated: new Date().toISOString()
      };
      await addDoc(collection(db, 'mawbs'), mawbData);

      // 2. Update Booking
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        status: 'finalized',
        mawbNo: values.mawbNo || '',
        warehouseId: values.warehouseId || '',
        entryTime: values.entryTime?.toISOString() || null,
        updatedAt: new Date().toISOString()
      });

      message.success('MAWB Issued - Moved to Operation Center');
      setFinalBookingModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error('Finalization failed: ' + e.message);
    }
  };

  const getNextStatusLabel = (status: MawbStatus) => {
    const idx = MAWB_STATUSES.findIndex(s => s.value === status);
    if (idx >= 0 && idx < MAWB_STATUSES.length - 1) {
      return t(MAWB_STATUSES[idx + 1].labelKey);
    }
    return null;
  };

  const activeMawbCount = mawbs.filter(m => m.status !== 'closed').length;
  const pendingBookingCount = pendingBookings.filter(b => ['pending', 'client_accepted'].includes(b.status)).length;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Title level={2}>{t('operation.title')}</Title>
          <Text type="secondary">{t('operation.subtitle')}</Text>
        </div>
        <div className="flex gap-4">
          <Input 
            prefix={<Search size={16} className="text-slate-400" />}
            placeholder={t('operation.searchPlaceholder')}
            className="w-64 rounded-lg"
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      <Tabs 
        defaultActiveKey="active"
        items={[
          {
            key: 'active',
            label: (
              <Badge count={activeMawbCount} offset={[10, 0]} size="small" showZero={false}>
                <span className="px-4 font-semibold">{t('operation.activeShipments')}</span>
              </Badge>
            ),
            children: (
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <Table 
                  dataSource={filteredMawbs} 
                  loading={loading} 
                  rowKey="id"
                  columns={[
                    { 
                      title: t('operation.mawbRef'), 
                      dataIndex: 'internalMawbNo', 
                      sorter: (a, b) => a.internalMawbNo.localeCompare(b.internalMawbNo),
                      render: (text, record) => (
                        <div className="flex items-center gap-2">
                           <div className="cursor-pointer group" onClick={() => { setSelectedMawb(record); setDrawerOpen(true); }}>
                             <span className="text-sm font-mono font-bold text-blue-600 group-hover:underline">{text}</span>
                             <p className="text-[10px] text-slate-400">{record.airlineMawbNo || '--'}</p>
                           </div>
                           <Tooltip title={t('operation.viewTrackingInternal')}>
                              <Button 
                                type="text" 
                                size="small" 
                                icon={<Search size={14} className="text-slate-400" />} 
                                onClick={() => { setSelectedMawb(record); setDrawerOpen(true); }}
                              />
                           </Tooltip>
                           <Tooltip title={t('operation.manualQuery')}>
                              <Button 
                                type="text" 
                                size="small" 
                                icon={<ExternalLink size={14} className="text-blue-500" />} 
                                onClick={() => window.open(`https://t.17track.net/zh-cn?nums=${record.airlineMawbNo || record.internalMawbNo}`, '_blank')}
                              />
                           </Tooltip>
                        </div>
                      )
                    },
                    {
                      title: t('operation.docs'),
                      render: (_, r) => {
                        // Find booking for this MAWB to get manifest
                        const b = pendingBookings.find(bk => bk.mawbNo === r.internalMawbNo);
                        return (
                          <Space size="middle">
                            {b?.manifestFileUrl ? (
                              <Tooltip title={`${t('booking.manifest')}: ${b.manifestFileUrl}`}>
                                <Button size="small" icon={<Package size={14} />} onClick={() => message.info(`${t('common.loading')} ${b.manifestFileUrl}`)} />
                              </Tooltip>
                            ) : <Badge status="default" text={t('operation.docs')} className="text-[10px]" />}
                            
                            {b?.draftMawbUrl ? (
                              <Tooltip title={`${t('operation.steps.draft')}${b.isDraftConfirmed ? ` & ${t('common.confirm')}` : ''}`}>
                                <Badge dot={!b.isDraftConfirmed} status={b.isDraftConfirmed ? "success" : "processing"}>
                                  <Button size="small" icon={<FileText size={14} />} onClick={() => message.info(`${t('common.loading')} ${b.draftMawbUrl}`)} />
                                </Badge>
                              </Tooltip>
                            ) : null}
                          </Space>
                        );
                      }
                    },
                    { 
                      title: t('operation.route'), 
                      render: (_, r) => <Tag color="blue">{r.origin} → {r.destination}</Tag>,
                      filters: Array.from(new Set(mawbs.map(m => m.origin))).map(o => ({ text: o, value: o })),
                      onFilter: (value, record) => record.origin === value
                    },
                    { 
                      title: t('operation.status'), 
                      dataIndex: 'status',
                      filters: MAWB_STATUSES.map(s => ({ text: t(s.labelKey), value: s.value })),
                      onFilter: (value, record) => record.status === value,
                      render: (status: MawbStatus) => {
                        const s = MAWB_STATUSES.find(x => x.value === status);
                        return <Tag color={s?.color} className="font-medium px-3 py-0.5 rounded-full">{s ? t(s.labelKey) : status}</Tag>;
                      }
                    },
                    { 
                      title: t('operation.nextStep'), 
                      align: 'center',
                      render: (_, r) => {
                        const nextLabel = getNextStatusLabel(r.status);
                        if (!nextLabel || r.status === 'on_hold') return null;
                        return (
                          <Button 
                            type="primary" 
                            size="small" 
                            className="bg-blue-600 flex items-center gap-1 text-[11px]"
                            onClick={() => handleStatusTransition(r)}
                          >
                             {nextLabel} <Play size={10} fill="currentColor" />
                          </Button>
                        );
                      }
                    },
                    {
                      title: t('operation.exception'),
                      align: 'right',
                      render: (_, r) => (
                        <Space>
                          {r.status !== 'on_hold' ? (
                            <Button size="small" type="text" danger onClick={() => handleUpdateStep('on_hold')} icon={<Pause size={14} />}>{t('booking.status.on_hold')}</Button>
                          ) : (
                            <Button size="small" type="primary" onClick={() => handleStatusTransition(r)} icon={<Play size={14} />}>{t('common.resume')}</Button>
                          )}
                        </Space>
                      )
                    }
                  ]}
                />
              </div>
            )
          },
          {
            key: 'bookings',
            label: (
              <Badge count={pendingBookingCount} offset={[10, 0]} size="small" showZero={false} color="#faad14">
                <span className="px-4 font-semibold">{t('operation.newRequests')}</span>
              </Badge>
            ),
            children: (
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <Table 
                  dataSource={pendingBookings} 
                  loading={loading} 
                  rowKey="id"
                  columns={[
                    { title: t('booking.title'), dataIndex: 'bookingNo', render: (t, r) => <span className="font-mono font-bold">{t}</span> },
                    { title: t('booking.customer'), dataIndex: 'customerName' },
                    { title: t('booking.cargo'), render: (_, r) => `${r.pieces}P / ${r.weight}K / ${r.volume}C` },
                    { title: t('common.actions'), align: 'right', render: (_, r) => (
                        <Space>
                           {r.status === 'pending' && <Button size="small" type="primary" onClick={() => { setSelectedBooking(r); setSpaceModalOpen(true); }}>{t('operation.setConfirmed')}</Button>}
                           {r.status === 'client_accepted' && <Button size="small" type="primary" className="bg-green-600 border-green-600" onClick={() => { setSelectedBooking(r); finalForm.setFieldsValue({ entryTime: dayjs().add(1, 'day').hour(16) }); setFinalBookingModalOpen(true); }}>{t('booking.status.finalized')}</Button>}
                        </Space>
                    )}
                  ]}
                />
              </div>
            )
          }
        ]}
      />

      {/* 1. Warehouse Arrival Modal */}
      <Modal
        title={t('operation.steps.warehouse')}
        open={warehouseModalOpen}
        onCancel={() => setWarehouseModalOpen(false)}
        onOk={() => warehouseForm.submit()}
        width={700}
      >
        <Form form={warehouseForm} layout="vertical" onFinish={(v) => handleUpdateStep('warehouse_in', v)}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="grossWeight" label={`${t('operation.grossWeight')} (KG)`} rules={[{ required: true }]}><InputNumber className="w-full" precision={2} /></Form.Item></Col>
            <Col span={8}><Form.Item name="chargeableWeight" label={`${t('operation.chargeableWeight')} (KG)`} rules={[{ required: true }]}><InputNumber className="w-full" precision={2} readOnly /></Form.Item></Col>
            <Col span={8}><Form.Item name="actualPieces" label={t('operation.pieces')} rules={[{ required: true }]}><InputNumber className="w-full" min={1} /></Form.Item></Col>
          </Row>
          <Form.Item label={t('operation.dimensions')}>
             <Form.List name="dims">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={8} className="mb-2 items-center">
                        <Col span={6}><Form.Item {...restField} name={[name, 'l']} noStyle rules={[{ required: true }]}><InputNumber placeholder="L" className="w-full" /></Form.Item></Col>
                        <Col span={6}><Form.Item {...restField} name={[name, 'w']} noStyle rules={[{ required: true }]}><InputNumber placeholder="W" className="w-full" /></Form.Item></Col>
                        <Col span={6}><Form.Item {...restField} name={[name, 'h']} noStyle rules={[{ required: true }]}><InputNumber placeholder="H" className="w-full" /></Form.Item></Col>
                        <Col span={6} className="flex items-center"><Button onClick={() => remove(name)} type="link" danger className="px-0">{t('common.delete')}</Button></Col>
                      </Row>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>{t('operation.addDim')}</Button>
                  </>
                )}
             </Form.List>
          </Form.Item>
          <Divider orientation="left" className="text-xs">{t('operation.returnedItems')}</Divider>
          <Form.List name="returnedItems">
             {(fields, { add, remove }) => (
               <>
                 {fields.map(({ key, name, ...restField }) => (
                   <Card key={key} size="small" className="mb-2 bg-red-50">
                     <Row gutter={8}>
                       <Col span={12}><Form.Item {...restField} name={[name, 'subMawb']} label="Sub-ID" rules={[{ required: true }]}><Input /></Form.Item></Col>
                       <Col span={12}><Form.Item {...restField} name={[name, 'reason']} label={t('operation.reason')} rules={[{ required: true }]}><Input /></Form.Item></Col>
                     </Row>
                     <Button size="small" danger onClick={() => remove(name)}>{t('common.delete')}</Button>
                   </Card>
                 ))}
                 <Button type="link" onClick={() => add()} icon={<Info size={14} />}>{t('operation.returnedItems')}</Button>
               </>
             )}
          </Form.List>
        </Form>
      </Modal>

      {/* 1.5 MAWB Draft Modal */}
      <Modal
        title={t('operation.steps.draft')}
        open={draftModalOpen}
        onCancel={() => setDraftModalOpen(false)}
        onOk={() => draftForm.submit()}
      >
        <Form form={draftForm} layout="vertical" onFinish={handleUploadDraft}>
          <Form.Item label={t('operation.steps.draft')} required>
             <Upload 
               maxCount={1}
               accept="application/pdf"
               beforeUpload={() => false}
               onChange={(info) => {
                 if (info.fileList.length > 0) {
                   draftForm.setFieldsValue({ draftMawbUrl: info.fileList[0].name });
                 }
               }}
             >
               <Button icon={<FileText size={14} />}>{t('common.search')}</Button>
             </Upload>
             <Form.Item name="draftMawbUrl" noStyle rules={[{ required: true, message: t('booking.uploadManifest') }]}>
               <Input type="hidden" />
             </Form.Item>
          </Form.Item>
          <div className="bg-blue-50 p-3 rounded border border-blue-100 text-xs text-blue-800">
             {t('operation.uploadDraftDesc')}
          </div>
        </Form>
      </Modal>

      {/* 2. Customs Modal */}
      <Modal
        title={t('operation.steps.customs')}
        open={customsModalOpen}
        onCancel={() => setCustomsModalOpen(false)}
        onOk={() => customsForm.submit()}
      >
        <Form form={customsForm} layout="vertical" onFinish={(v) => handleUpdateStep('customs', v)} initialValues={{ customsCleared: true }}>
           <Form.Item name="customsCleared" label={t('common.confirm')} valuePropName="checked">
             <Select options={[{ label: t('common.ok'), value: true }, { label: t('common.cancel'), value: false }]} />
           </Form.Item>
           <Form.Item name="customsRemark" label={t('operation.remark')}>
             <Input.TextArea placeholder="Everything cleared? Any delay?" rows={2} />
           </Form.Item>
           <Form.Item name="customsException" label={t('operation.exception')}>
             <Input.TextArea placeholder="Details about any delays or issues..." rows={3} />
           </Form.Item>
        </Form>
      </Modal>

      {/* 3. Terminal In Modal */}
      <Modal
        title={t('operation.steps.terminal')}
        open={terminalModalOpen}
        onCancel={() => setTerminalModalOpen(false)}
        onOk={() => terminalForm.submit()}
      >
        <Form form={terminalForm} layout="vertical" onFinish={(v) => handleUpdateStep('terminal_in', v)} initialValues={{ terminalConfirmed: true }}>
           <Form.Item name="terminalConfirmed" label={t('common.confirm')} valuePropName="checked">
             <Select options={[{ label: t('common.ok'), value: true }, { label: t('common.cancel'), value: false }]} />
           </Form.Item>
           <Form.Item name="terminalRemark" label={t('operation.remark')}>
              <Input.TextArea placeholder="Any damage noted? Waiting for build-up?" rows={2} />
           </Form.Item>
           <Form.Item name="terminalException" label={t('operation.exception')}>
              <Input.TextArea placeholder="Details about damaged items or returns at terminal..." rows={3} />
           </Form.Item>
        </Form>
      </Modal>

      {/* 4. Tracking Modal (Depart/Arrive) */}
      <Modal
        title={t('operation.steps.tracking')}
        open={trackingModalOpen}
        onCancel={() => setTrackingModalOpen(false)}
        onOk={() => trackingForm.submit()}
        width={600}
      >
        <Form form={trackingForm} layout="vertical" onFinish={(v) => handleUpdateStep(v.ata ? 'arrived' : 'departed', v)}>
           <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="atd" label={t('operation.departure')}>
                 <DatePicker showTime className="w-full" />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="ata" label={t('operation.arrival')}>
                 <DatePicker showTime className="w-full" />
               </Form.Item>
             </Col>
           </Row>
           <Form.Item name="pod_time" label={t('operation.pickup')}>
              <DatePicker showTime className="w-full" />
           </Form.Item>
        </Form>
      </Modal>

      {/* Original Drawer for Timeline */}
      <Drawer
        title={`${t('operation.timeline')}: ${selectedMawb?.internalMawbNo}`}
        size="large"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {selectedMawb && (
          <div className="space-y-6">
            <Card size="small" title={t('operation.staticInfo')} className="bg-slate-50 border-none shadow-none">
               <Row gutter={[16, 8]}>
                 <Col span={8}><Text type="secondary">{t('operation.product')}: </Text> Air</Col>
                 <Col span={8}><Text type="secondary">{t('booking.origin')}: </Text> {selectedMawb.origin}</Col>
                 <Col span={8}><Text type="secondary">{t('booking.destination')}: </Text> {selectedMawb.destination}</Col>
                 <Col span={8}><Text type="secondary">{t('common.status')}: </Text> <Tag>{selectedMawb.status}</Tag></Col>
                 <Col span={16}><Text type="secondary">{t('operation.mawbRef')}: </Text> {selectedMawb.airlineMawbNo}</Col>
               </Row>
            </Card>

            <Steps
              direction="vertical"
              size="small"
              current={MAWB_STATUSES.findIndex(s => s.value === selectedMawb.status)}
              items={MAWB_STATUSES.map(s => ({
                title: t(s.labelKey),
                description: selectedMawb.status === s.value ? 'Active' : ''
              }))}
            />

            <Divider orientation="left" className="text-blue-600 font-bold">
              <Space>
                <Activity size={16} />
                {t('operation.tracking.title')} (17TRACK)
              </Space>
            </Divider>

            <MawbTrackingTable mawbNo={selectedMawb.internalMawbNo} />
          </div>
        )}
      </Drawer>

      {/* Older modlas kept for space/issue logic */}
      <Modal title={t('operation.setConfirmed')} open={spaceModalOpen} onCancel={() => setSpaceModalOpen(false)} onOk={() => spaceForm.submit()}>
        <Form form={spaceForm} layout="vertical" onFinish={handleConfirmSpace}>
           <Form.Item name="spaceStatus" label={t('booking.spaceAllocation')} rules={[{ required: true }]}><Select options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }, { label: 'Partial', value: 'Partial' }]} /></Form.Item>
           <Form.Item name="operationRemarks" label={t('booking.internalNotes')}><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('booking.status.finalized')} open={finalBookingModalOpen} onCancel={() => setFinalBookingModalOpen(false)} onOk={() => finalForm.submit()}>
        <Form form={finalForm} layout="vertical" onFinish={handleFinalBooking}>
           <Form.Item name="mawbNo" label={t('booking.mawbNo')} rules={[{ required: true }]}><Input placeholder="406-..." /></Form.Item>
           <Form.Item name="warehouseId" label={t('booking.assignWarehouse')} rules={[{ required: true }]}><Select options={profile?.warehouses?.map(w => ({ label: w.name, value: w.id }))} /></Form.Item>
           <Form.Item name="entryTime" label={t('booking.advisedEntry')}><DatePicker showTime className="w-full" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

