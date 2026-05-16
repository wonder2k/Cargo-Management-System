import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Drawer, Form, Input, Select, App, Space, Typography, Row, Col, Modal, Tabs, Statistic, Badge, InputNumber, Divider, DatePicker, Upload, Tooltip } from 'antd';
import { MAWB, MawbStatus, Booking, Customer } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, Play, Package, FileText, CheckCircle2, XCircle, Clock, TrendingUp, Upload as UploadIcon, ExternalLink, PlaneTakeoff, PlaneLanding, Activity } from 'lucide-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { operationApi, businessApi, uploadApi } from '../../services/api';
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
  { value: 'closed', labelKey: 'operation.financeSettlement', color: '#8c8c8c' },
  { value: 'exception', labelKey: 'operation.exception', color: 'red' },
  { value: 'on_hold', labelKey: 'booking.status.on_hold', color: 'volcano' },
];

export const MawbList: React.FC = () => {
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('active');

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedMawb, setSelectedMawb] = useState<MAWB | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [detailBooking, setDetailBooking] = useState<Booking | null>(null);

  // Modal states
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [finalModalOpen, setFinalModalOpen] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);
  const [trackingModalOpen, setTrackingModalOpen] = useState(false);
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [manifestTarget, setManifestTarget] = useState<Booking | null>(null);
  const [draftTarget, setDraftTarget] = useState<MAWB | null>(null);

  const { user: profile } = useAuth();
  const { t } = useTranslation();
  const { message } = App.useApp();

  const [spaceForm] = Form.useForm();
  const [finalForm] = Form.useForm();
  const [warehouseForm] = Form.useForm();
  const [customsForm] = Form.useForm();
  const [terminalForm] = Form.useForm();
  const [trackingForm] = Form.useForm();
  // warehouse dims auto-calc for chargeable weight
  const grossWt = Form.useWatch('grossWeight', warehouseForm);
  const dims = Form.useWatch('dims', warehouseForm);

  useEffect(() => {
    if (grossWt !== undefined || dims) {
      const volWeight = (dims || []).reduce((acc: number, dim: any) => {
        const l = Number(dim?.l) || 0, w = Number(dim?.w) || 0, h = Number(dim?.h) || 0;
        return acc + (l * w * h) / 6000;
      }, 0);
      const calc = Math.max(Number(grossWt || 0), volWeight);
      const cur = warehouseForm.getFieldValue('chargeableWeight');
      if (Number(cur) !== Number(calc.toFixed(2))) {
        warehouseForm.setFieldsValue({ chargeableWeight: Number(calc.toFixed(2)) });
      }
    }
  }, [grossWt, dims, warehouseForm]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, bRes, cRes] = await Promise.all([
        operationApi.getMawbs(),
        businessApi.getBookings(),
        businessApi.getCustomers(),
      ]);
      setMawbs(mRes.data);
      setAllBookings(bRes.data);
      setCustomers(cRes.data);
    } catch {
      message.error(t('common.failedToFetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ==== Workflow Handlers ====

  // Space confirmation on a pending booking
  const handleConfirmSpace = async (values: any) => {
    if (!selectedBooking) return;
    try {
      const statusMap: Record<string, string> = { Yes: 'space_confirmed', Partial: 'space_partial', No: 'space_rejected' };
      await businessApi.updateBooking(selectedBooking.id, {
        status: statusMap[values.spaceStatus] || 'space_confirmed',
        operationRemarks: values.operationRemarks || '',
      });
      message.success('Space status updated');
      setSpaceModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };

  // Finalize booking → create MAWB
  const handleFinalizeBooking = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await operationApi.createMawbFromBooking({
        bookingNo: selectedBooking.bookingNo,
        mawbNo: values.mawbNo,
        warehouseId: values.warehouseId,
        entryTime: values.entryTime?.toISOString(),
        pieces: selectedBooking.pieces,
        weight: selectedBooking.weight,
        volume: selectedBooking.volume,
      });
      message.success('MAWB issued — moved to Operation');
      setFinalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };

  // Warehouse entry (weight, dims, chargeable)
  const handleWarehouseEntry = async (values: any) => {
    if (!selectedMawb) return;
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'warehouse_in',
        weight: values.grossWeight,
        chargeableWeight: values.chargeableWeight,
        pieces: values.actualPieces,
        dimensions: values.dims || [],
        remarks: values.remarks || '',
      });
      // Auto-register with 17TRACK
      try { fetch('/api/track/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ number: selectedMawb.mawbNo }) }); } catch {}
      message.success(t('common.success'));
      setWarehouseModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };

  // Customs clearance
  const handleCustoms = async (values: any) => {
    if (!selectedMawb) return;
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'customs',
        remarks: values.customsRemark || '',
      });
      message.success(t('common.success'));
      setCustomsModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };

  // Terminal in
  const handleTerminal = async (values: any) => {
    if (!selectedMawb) return;
    try {
      await operationApi.updateMawb(selectedMawb.id, {
        status: 'terminal_in',
        remarks: values.terminalRemark || '',
      });
      message.success(t('common.success'));
      setTerminalModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };

  // Tracking (depart / arrive)
  const handleTracking = async (values: any) => {
    if (!selectedMawb) return;
    try {
      const status = values.ata ? 'arrived' : 'departed';
      const payload: any = { status };
      if (values.atd) payload.atd = values.atd.toISOString();
      if (values.ata) payload.ata = values.ata.toISOString();
      await operationApi.updateMawb(selectedMawb.id, payload);
      message.success(t('common.success'));
      setTrackingModalOpen(false);
      fetchData();
    } catch {
      message.error(t('common.error'));
    }
  };

  // Upload handlers
  const handleUploadManifest = async (file: File) => {
    if (!manifestTarget) return false;
    try {
      const res = await uploadApi.uploadFile(file);
      await businessApi.updateBooking(manifestTarget.id, {
        manifestFileUrl: res.data.fileUrl,
        manifestFileName: res.data.fileName,
      });
      message.success('Manifest uploaded');
      setManifestModalOpen(false);
      setManifestTarget(null);
      fetchData();
    } catch { message.error('Upload failed'); }
    return false;
  };

  const handleUploadDraft = async (file: File) => {
    if (!draftTarget) return false;
    try {
      const res = await uploadApi.uploadFile(file);
      await operationApi.updateMawb(draftTarget.id, {
        draftFileUrl: res.data.fileUrl,
        draftFileName: res.data.fileName,
      });
      message.success('Draft MAWB uploaded');
      setDraftModalOpen(false);
      setDraftTarget(null);
      fetchData();
    } catch { message.error('Upload failed'); }
    return false;
  };

  // Close MAWB → transfer to Finance
  const handleClose = async (mawb: MAWB) => {
    Modal.confirm({
      title: t('operation.financeSettlement'),
      content: 'Confirm completion and transfer to Finance? AR/AP records will be created.',
      onOk: async () => {
        try {
          await operationApi.closeMawb(mawb.id);
          message.success('MAWB closed, transferred to Finance');
          fetchData();
        } catch {
          message.error(t('common.error'));
        }
      },
    });
  };

  // Open correct modal based on MAWB status
  const handleNextStep = (mawb: MAWB) => {
    setSelectedMawb(mawb);
    switch (mawb.status) {
      case 'booked':
      case 'confirmed':
        warehouseForm.resetFields();
        setWarehouseModalOpen(true);
        break;
      case 'warehouse_in':
        customsForm.resetFields();
        setCustomsModalOpen(true);
        break;
      case 'customs':
        terminalForm.resetFields();
        setTerminalModalOpen(true);
        break;
      case 'terminal_in':
      case 'departed':
        trackingForm.resetFields();
        setTrackingModalOpen(true);
        break;
      case 'arrived':
        handleClose(mawb);
        break;
      default:
        setDrawerOpen(true);
    }
  };

  const getNextStatusLabel = (status: MawbStatus) => {
    const idx = MAWB_STATUSES.findIndex(s => s.value === status);
    if (idx >= 0 && idx < MAWB_STATUSES.length - 1) return t(MAWB_STATUSES[idx + 1].labelKey);
    return null;
  };

  const filteredMawbs = mawbs.filter(m =>
    (m.mawbNo || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (m.origin || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (m.destination || '').toLowerCase().includes(searchText.toLowerCase())
  );

  // Bookings that are not yet MAWBs
  const pendingBookings = allBookings.filter(b =>
    !['finalized', 'cancelled', 'closed'].includes(b.status || '') && !b.mawbNo
  );
  // Bookings that have been finalized with a MAWB
  const finishedBookings = allBookings.filter(b =>
    (b.status === 'finalized' || !!b.mawbNo) && b.status !== 'closed'
  );
  const activeMawbCount = mawbs.filter(m => m.status !== 'closed' && m.status !== 'exception').length;

  const triggerDownload = (fileName: string) => {
    if (fileName?.startsWith('http')) {
      window.open(fileName, '_blank');
    } else {
      const blob = new Blob(['Mock file content for: ' + fileName], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }
  };

  // ==== MAWB List Columns ====
  const RouteTitle = t('common.route');
  const mawbColumns = [
    {
      title: t('operation.mawbRef'),
      render: (_: any, r: MAWB) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-1">
            <span className="text-sm font-mono font-bold text-blue-600 cursor-pointer" onClick={() => { setSelectedMawb(r); setDrawerOpen(true); }}>{r.mawbNo}</span>
            <Tooltip title={t('operation.viewTrackingInternal')}><Search size={11} className="text-slate-300 hover:text-blue-500 cursor-pointer" onClick={() => { setSelectedMawb(r); setDrawerOpen(true); }} /></Tooltip>
            <Tooltip title={t('operation.manualQuery')}><ExternalLink size={11} className="text-slate-300 hover:text-blue-500 cursor-pointer" onClick={() => window.open(`https://t.17track.net/zh-cn?nums=${r.mawbNo}`, '_blank')} /></Tooltip>
          </div>
          <span className="text-[10px] text-slate-400">{r.carrier || '--'}</span>
        </div>
      ),
    },
    {
      title: RouteTitle,
      render: (_: any, r: MAWB) => <Tag color="blue">{r.origin} → {r.destination}</Tag>,
      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
        const origins = Array.from(new Set(mawbs.map(m => m.origin))).sort();
        const destinations = Array.from(new Set(mawbs.map(m => m.destination))).sort();
        const currentOrigin = selectedKeys.find((k: string) => k.startsWith('o:'))?.replace('o:', '') || '';
        const currentDest = selectedKeys.find((k: string) => k.startsWith('d:'))?.replace('d:', '') || '';
        return (
          <div className="p-3 w-64 flex flex-col gap-3">
            <div>
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><PlaneTakeoff size={12} /> {t('common.origin')}</div>
              <Select className="w-full" placeholder={t('common.all')} allowClear
                value={currentOrigin || undefined}
                options={origins.map(o => ({ label: o, value: o }))}
                onChange={(val) => {
                  const newKeys = selectedKeys.filter((k: string) => !k.startsWith('o:'));
                  if (val) newKeys.push(`o:${val}`);
                  setSelectedKeys(newKeys);
                }} />
            </div>
            <div>
              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><PlaneLanding size={12} /> {t('common.destination')}</div>
              <Select className="w-full" placeholder={t('common.all')} allowClear
                value={currentDest || undefined}
                options={destinations.map(d => ({ label: d, value: d }))}
                onChange={(val) => {
                  const newKeys = selectedKeys.filter((k: string) => !k.startsWith('d:'));
                  if (val) newKeys.push(`d:${val}`);
                  setSelectedKeys(newKeys);
                }} />
            </div>
            <div className="flex justify-between mt-2">
              <Button size="small" onClick={() => { if (clearFilters) clearFilters(); confirm(); }} className="text-xs">{t('common.cancel')}</Button>
              <Button type="primary" size="small" onClick={() => confirm()} className="text-xs bg-blue-600">{t('common.confirm')}</Button>
            </div>
          </div>
        );
      },
      filterIcon: (filtered: boolean) => (
        <div className="flex flex-col -space-y-1 items-center">
          <PlaneTakeoff size={12} className={filtered ? 'text-blue-500' : 'text-slate-400'} />
          <PlaneLanding size={12} className={filtered ? 'text-blue-500' : 'text-slate-400'} />
        </div>
      ),
      onFilter: (value: any, record: MAWB) => {
        const val = value as string;
        if (val.startsWith('o:')) return record.origin === val.replace('o:', '');
        if (val.startsWith('d:')) return record.destination === val.replace('d:', '');
        return true;
      }
    },
    {
      title: 'Flight',
      render: (_: any, r: MAWB) => (
        <div className="text-xs">
          <div className="text-slate-700 font-bold">{r.carrier || '--'}</div>
          <div className="text-slate-400">{r.flightDate ? dayjs(r.flightDate).format('MM-DD') : '--'}</div>
        </div>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      filters: MAWB_STATUSES.map(s => ({ text: t(s.labelKey), value: s.value })),
      onFilter: (value: any, record: MAWB) => record.status === value,
      render: (status: MawbStatus) => {
        const s = MAWB_STATUSES.find(x => x.value === status);
        return <Tag color={s?.color}>{t(s?.labelKey || status)}</Tag>;
      },
    },
    {
      title: t('common.cargo') || 'Cargo',
      render: (_: any, r: MAWB) => (
        <div className="text-xs">
          {r.pieces || 0} PCS / {r.weight || 0} KG
        </div>
      ),
    },
    {
      title: t('operation.docs') || 'Docs',
      width: 150,
      render: (_: any, r: MAWB) => {
        const b = allBookings.find(bk => bk.mawbNo === r.mawbNo);
        const hasManifest = !!b?.manifestFileUrl;
        const hasDraft = !!r.draftFileUrl;
        return (
          <Space size="small" wrap>
            <Button size="small" icon={<Package size={12} />}
              className={(hasManifest ? 'text-blue-600 border-blue-600' : 'text-red-500 border-red-500') + ' text-[11px]'}
              onClick={() => {
                if (hasManifest && b?.manifestFileUrl) triggerDownload(b.manifestFileUrl);
                else if (b) { setManifestTarget(b); setManifestModalOpen(true); }
              }}>
              {t('operation.manifest')||'Manifest'}
            </Button>
            <Button size="small" icon={<FileText size={12} />}
              className={(hasDraft ? 'text-blue-600 border-blue-600' : 'text-red-500 border-red-500') + ' text-[11px]'}
              onClick={() => {
                if (hasDraft && r.draftFileUrl) triggerDownload(r.draftFileUrl);
                else { setDraftTarget(r); setDraftModalOpen(true); }
              }}>
              {t('operation.steps.draft')||'Draft'}
            </Button>
          </Space>
        );
      },
    },
    {
      title: t('common.actions'),
      align: 'right' as const,
      render: (_: any, r: MAWB) => {
        const nextLabel = getNextStatusLabel(r.status);
        if (!nextLabel || r.status === 'on_hold' || r.status === 'exception') return null;
        return (
          <Space>
            {(r.status === 'warehouse_in' || r.status === 'customs') && (
              <Tooltip title={t('common.upload')+' Draft MAWB'}>
                <Button size="small" icon={<UploadIcon size={14} />}
                  onClick={() => { setDraftTarget(r); setDraftModalOpen(true); }} />
              </Tooltip>
            )}
            <Button type="primary" size="small" icon={<Play size={10} />}
              onClick={() => handleNextStep(r)}
              className="flex items-center gap-1">
              {nextLabel}
            </Button>
          </Space>
        );
      },
    },
  ];

  // ==== Pending Bookings Columns ====
  const pendingCols = [
    {
      title: t('common.bookingNo') || 'Booking No',
      render: (_: any, r: Booking) => (
        <span className="font-mono font-bold text-blue-600 cursor-pointer"
          onClick={() => { setDetailBooking(r); setDetailDrawerOpen(true); }}>
          {r.bookingNo}
        </span>
      ),
    },
    {
      title: t('common.customer'),
      render: (_: any, r: Booking) => customers.find(c => c.id === r.customerId)?.name || r.customerName || '--',
    },
    {
      title: RouteTitle,
      render: (_: any, r: Booking) => <Tag color="geekblue">{r.origin} → {r.destination}</Tag>,
    },
    {
      title: 'Flight',
      render: (_: any, r: Booking) => (
        <div className="text-xs">
          <div className="text-slate-700 font-bold">{r.carrier || '--'}</div>
          <div className="text-slate-400">{r.flightDate ? dayjs(r.flightDate).format('MM-DD') : '--'}</div>
        </div>
      ),
    },
    {
      title: t('common.cargo') || 'Cargo',
      render: (_: any, r: Booking) => (
        <div className="text-xs">
          {r.pieces}P / {r.weight}K / {r.volume}C
          <div className="text-slate-400 truncate w-28">{r.goodsDescription}</div>
        </div>
      ),
    },
    {
      title: t('common.status'),
      dataIndex: 'status',
      filters: [
        { text: t('booking.status.pending'), value: 'pending' },
        { text: t('booking.status.space_confirmed'), value: 'space_confirmed' },
        { text: t('booking.status.client_accepted'), value: 'client_accepted' },
      ],
      onFilter: (value: any, r: Booking) => r.status === value,
      render: (s: string) => {
        const colors: Record<string, string> = { pending: 'orange', space_confirmed: 'green', client_accepted: 'blue' };
        return <Tag color={colors[s] || 'default'}>{t(`booking.status.${s}`)}</Tag>;
      },
    },
    {
      title: t('common.actions'),
      align: 'right' as const,
      render: (_: any, r: Booking) => (
        <Space>
          {['pending', 'space_partial', 'space_rejected'].includes(r.status || '') && (
            <Button size="small" type="primary" onClick={() => { setSelectedBooking(r); setSpaceModalOpen(true); }}>
              {t('operation.setConfirmed')}
            </Button>
          )}
          {r.status === 'client_accepted' && (
            <Button size="small" type="primary" className="bg-green-600 border-green-600"
              onClick={() => { setSelectedBooking(r); finalForm.setFieldsValue({ entryTime: dayjs().add(1, 'd').hour(16).minute(0).second(0) }); setFinalModalOpen(true); }}>
              Issue MAWB
            </Button>
          )}
          {r.status === 'space_confirmed' && (
            <span className="text-xs text-slate-400 italic">Awaiting client</span>
          )}
          <Button size="small" icon={<UploadIcon size={14} />}
            onClick={() => { setManifestTarget(r); setManifestModalOpen(true); }}>
            Manifest
          </Button>
        </Space>
      ),
    },
  ];

  // ==== Finished Bookings Columns ====
  const finishedCols = [
    {
      title: t('common.bookingNo') || 'Booking',
      render: (_: any, r: Booking) => (
        <span className="font-mono font-bold text-blue-600 cursor-pointer"
          onClick={() => { setDetailBooking(r); setDetailDrawerOpen(true); }}>
          {r.bookingNo}
        </span>
      ),
    },
    {
      title: 'MAWB',
      render: (_: any, r: Booking) => <span className="font-mono text-blue-500 font-bold">{r.mawbNo || '--'}</span>,
    },
    {
      title: t('common.customer'),
      render: (_: any, r: Booking) => customers.find(c => c.id === r.customerId)?.name || r.customerName || '--',
    },
    {
      title: RouteTitle,
      render: (_: any, r: Booking) => <Tag>{r.origin} → {r.destination}</Tag>,
    },
    {
      title: 'Flight',
      render: (_: any, r: Booking) => (
        <div className="text-xs">
          <div className="text-slate-700 font-bold">{r.carrier || '--'}</div>
          <div className="text-slate-400">{r.flightDate ? dayjs(r.flightDate).format('MM-DD') : '--'}</div>
        </div>
      ),
    },
    {
      title: t('common.status'),
      filters: MAWB_STATUSES.map(s => ({ text: t(s.labelKey), value: s.value })),
      onFilter: (value: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        const s = mawb?.status || r.status;
        return s === value;
      },
      render: (_: any, r: Booking) => {
        const mawb = mawbs.find(m => m.mawbNo === r.mawbNo);
        const s = mawb?.status || r.status;
        const config = MAWB_STATUSES.find(x => x.value === s);
        return <Tag color={config?.color}>{t(config?.labelKey || s)}</Tag>;
      },
    },
  ];

  const tabItems = [
    {
      key: 'active',
      label: (<Badge count={activeMawbCount} size="small" offset={[6, 0]}><span className="px-2">{t('operation.activeShipments')}</span></Badge>),
      children: (
        <Table dataSource={filteredMawbs} loading={loading} rowKey="id" columns={mawbColumns}
          pagination={{ pageSize: 15 }} />
      ),
    },
    {
      key: 'bookings',
      label: (<Badge count={pendingBookings.length} size="small" offset={[6, 0]} color="#faad14"><span className="px-2">{t('operation.newRequests')}</span></Badge>),
      children: (
        <Table dataSource={pendingBookings} loading={loading} rowKey="id" columns={pendingCols}
          pagination={{ pageSize: 15 }} />
      ),
    },
    {
      key: 'finished',
      label: (<Badge count={finishedBookings.length} size="small" offset={[6, 0]} color="#87d068"><span className="px-2">{t('operation.finishedRequests')}</span></Badge>),
      children: (
        <Table dataSource={finishedBookings} loading={loading} rowKey="id" columns={finishedCols}
          pagination={{ pageSize: 15 }} />
      ),
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div style={{ whiteSpace: 'nowrap' }}>
          <Title level={2} className="mb-0">{t('operation.title')}</Title>
          <Text type="secondary">{t('operation.subtitle')}</Text>
        </div>
        <Input prefix={<Search size={16} className="text-slate-400" />}
          placeholder={t('common.searchMawb')} className="w-48"
          onChange={e => setSearchText(e.target.value)} />
      </div>

      <Card className="shadow-sm">
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Card>

      {/* Space Confirmation Modal */}
      <Modal title={t('operation.setConfirmed')} open={spaceModalOpen}
        onCancel={() => setSpaceModalOpen(false)} onOk={() => spaceForm.submit()}>
        <Form form={spaceForm} layout="vertical" onFinish={handleConfirmSpace}>
          <Form.Item name="spaceStatus" label="Space Allocation" rules={[{ required: true }]}>
            <Select options={[{ label: 'Yes', value: 'Yes' }, { label: 'No', value: 'No' }, { label: 'Partial', value: 'Partial' }]} />
          </Form.Item>
          <Form.Item name="operationRemarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Final Booking → MAWB Modal */}
      <Modal title="Issue MAWB" open={finalModalOpen}
        onCancel={() => setFinalModalOpen(false)} onOk={() => finalForm.submit()}>
        <Form form={finalForm} layout="vertical" onFinish={handleFinalizeBooking}>
          <Form.Item name="mawbNo" label="MAWB Number" rules={[{ required: true }]}>
            <Input placeholder="406-12345678" />
          </Form.Item>
          <Form.Item name="warehouseId" label="Warehouse">
            <Select options={(profile as any)?.warehouses?.map((w: any) => ({ label: w.name, value: w.id })) || []}
              placeholder="Select warehouse" />
          </Form.Item>
          <Form.Item name="entryTime" label="Advised Entry Time">
            <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Warehouse Entry Modal */}
      <Modal title={t('operation.steps.warehouse')} open={warehouseModalOpen} width={650}
        onCancel={() => setWarehouseModalOpen(false)} onOk={() => warehouseForm.submit()}>
        <Form form={warehouseForm} layout="vertical" onFinish={handleWarehouseEntry}>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="grossWeight" label={`${t('operation.grossWeight')} (KG)`} rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={2} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="chargeableWeight" label={`${t('operation.chargeableWeight')} (KG)`} rules={[{ required: true }]}>
                <InputNumber className="w-full" precision={2} readOnly />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="actualPieces" label="Actual PCS" rules={[{ required: true }]}>
                <InputNumber className="w-full" min={1} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={t('operation.dimensions') + ' (cm, L×W×H)'}>
            <Form.List name="dims">
              {(fields, { add, remove }) => (
                <>
                  {fields.map(({ key, name, ...rest }) => (
                    <Row key={key} gutter={8} className="mb-2 items-center">
                      <Col span={6}><Form.Item {...rest} name={[name, 'l']} noStyle rules={[{ required: true }]}><InputNumber placeholder="L" className="w-full" /></Form.Item></Col>
                      <Col span={6}><Form.Item {...rest} name={[name, 'w']} noStyle rules={[{ required: true }]}><InputNumber placeholder="W" className="w-full" /></Form.Item></Col>
                      <Col span={6}><Form.Item {...rest} name={[name, 'h']} noStyle rules={[{ required: true }]}><InputNumber placeholder="H" className="w-full" /></Form.Item></Col>
                      <Col span={6}><Button danger type="link" onClick={() => remove(name)}>Remove</Button></Col>
                    </Row>
                  ))}
                  <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>{t('operation.addDim')}</Button>
                </>
              )}
            </Form.List>
          </Form.Item>
          <Form.Item name="remarks" label="Remarks"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>

      {/* Customs Modal */}
      <Modal title={t('operation.steps.customs')} open={customsModalOpen}
        onCancel={() => setCustomsModalOpen(false)} onOk={() => customsForm.submit()}>
        <Form form={customsForm} layout="vertical" onFinish={handleCustoms}>
          <Form.Item name="customsRemark" label="Customs Remark"><Input.TextArea rows={3} placeholder="Cleared without issues?" /></Form.Item>
        </Form>
      </Modal>

      {/* Terminal Modal */}
      <Modal title={t('operation.steps.terminal')} open={terminalModalOpen}
        onCancel={() => setTerminalModalOpen(false)} onOk={() => terminalForm.submit()}>
        <Form form={terminalForm} layout="vertical" onFinish={handleTerminal}>
          <Form.Item name="terminalRemark" label="Terminal Remark"><Input.TextArea rows={3} placeholder="Build-up completed?" /></Form.Item>
        </Form>
      </Modal>

      {/* Tracking Modal (Depart/Arrive) */}
      <Modal title={t('operation.steps.tracking')} open={trackingModalOpen} width={600}
        onCancel={() => setTrackingModalOpen(false)} onOk={() => trackingForm.submit()}>
        <Form form={trackingForm} layout="vertical" onFinish={handleTracking}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="atd" label={t('operation.departure') + ' (ATD)'}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ata" label={t('operation.arrival') + ' (ATA)'}>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Manifest Upload Modal */}
      <Modal title="Upload Cargo Manifest" open={manifestModalOpen}
        onCancel={() => { setManifestModalOpen(false); setManifestTarget(null); }}
        footer={null} destroyOnClose>
        <div className="py-4">
          <Upload.Dragger
            accept=".xlsx,.xls,.pdf"
            beforeUpload={(file) => handleUploadManifest(file)}
            showUploadList={false}
          >
            <p className="text-4xl mb-2 text-slate-300"><UploadIcon size={32} /></p>
            <p className="text-sm font-medium">Click or drag manifest file here</p>
            <p className="text-xs text-slate-400 mt-1">Excel (.xlsx) or PDF format, max 10MB</p>
          </Upload.Dragger>
        </div>
      </Modal>

      {/* Draft MAWB Upload Modal */}
      <Modal title="Upload Draft MAWB" open={draftModalOpen}
        onCancel={() => { setDraftModalOpen(false); setDraftTarget(null); }}
        footer={null} destroyOnClose>
        <div className="py-4">
          <Upload.Dragger
            accept=".pdf"
            beforeUpload={(file) => handleUploadDraft(file)}
            showUploadList={false}
          >
            <p className="text-4xl mb-2 text-slate-300"><FileText size={32} /></p>
            <p className="text-sm font-medium">Click or drag Draft MAWB PDF here</p>
            <p className="text-xs text-slate-400 mt-1">PDF format, max 10MB</p>
          </Upload.Dragger>
        </div>
      </Modal>

      {/* MAWB Detail Drawer */}
      <Drawer title={`${t('operation.mawbRef')}: ${selectedMawb?.mawbNo}`}
        open={drawerOpen} onClose={() => setDrawerOpen(false)} width={600}>
        {selectedMawb && (
          <div className="space-y-4">
            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Origin:</Text> <div className="font-bold">{selectedMawb.origin}</div></Col>
                <Col span={12}><Text type="secondary">Destination:</Text> <div className="font-bold">{selectedMawb.destination}</div></Col>
                <Col span={12}><Text type="secondary">Carrier:</Text> <div className="font-bold">{selectedMawb.carrier}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(MAWB_STATUSES.find(s => s.value === selectedMawb.status)?.labelKey || selectedMawb.status)}</Tag></Col>
              </Row>
            </Card>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col span={12}><Statistic title="Weight" value={selectedMawb.weight || 0} suffix="KG" /></Col>
              <Col span={12}><Statistic title="Chargeable" value={selectedMawb.chargeableWeight || 0} suffix="KG" /></Col>
            </Row>
            {selectedMawb.remarks && (
              <div className="p-3 border rounded bg-slate-50">
                <Text type="secondary" className="text-xs block mb-1">Remarks</Text>
                <div>{selectedMawb.remarks}</div>
              </div>
            )}
            <Divider orientation="left">{t('operation.docs') || 'Docs'}</Divider>
            <div className="flex gap-3">
              {(() => {
                const b = allBookings.find(bk => bk.mawbNo === selectedMawb.mawbNo);
                return (
                  <>
                    <Button size="small" icon={<Package size={14} />}
                      className={b?.manifestFileUrl ? 'text-blue-600' : 'text-red-500'}
                      onClick={() => {
                        if (b?.manifestFileUrl) triggerDownload(b.manifestFileUrl);
                        else if (b) { setManifestTarget(b); setManifestModalOpen(true); }
                      }}>
                      {t('operation.manifest')||'Manifest'}
                    </Button>
                    <Button size="small" icon={<FileText size={14} />}
                      className={selectedMawb.draftFileUrl ? 'text-blue-600' : 'text-red-500'}
                      onClick={() => {
                        if (selectedMawb.draftFileUrl) triggerDownload(selectedMawb.draftFileUrl);
                        else { setDraftTarget(selectedMawb); setDraftModalOpen(true); }
                      }}>
                      {t('operation.steps.draft')||'Draft'}
                    </Button>
                  </>
                );
              })()}
            </div>
            <Divider orientation="left" className="text-blue-600 font-bold">
              <Space><Activity size={16} /> 17TRACK {t('operation.tracking')}</Space>
            </Divider>
            <MawbTrackingTable mawbNo={selectedMawb.mawbNo} />
          </div>
        )}
      </Drawer>

      {/* Booking Detail Drawer */}
      <Drawer title={`Booking: ${detailBooking?.bookingNo}`}
        open={detailDrawerOpen} onClose={() => setDetailDrawerOpen(false)} width={450}>
        {detailBooking && (
          <div className="space-y-4">
            <Card size="small" className="bg-slate-50">
              <Row gutter={[16, 16]}>
                <Col span={12}><Text type="secondary">Customer:</Text> <div className="font-bold">{detailBooking.customerName}</div></Col>
                <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <Tag>{t(`booking.status.${detailBooking.status}`)}</Tag></Col>
                <Col span={12}><Text type="secondary">Route:</Text> <div className="font-bold">{detailBooking.origin} → {detailBooking.destination}</div></Col>
                <Col span={12}><Text type="secondary">MAWB:</Text> <span className="font-mono text-blue-600">{detailBooking.mawbNo || '--'}</span></Col>
              </Row>
            </Card>
            <Divider />
            <Row gutter={[16, 16]}>
              <Col span={8}><Statistic title="Pieces" value={detailBooking.pieces} /></Col>
              <Col span={8}><Statistic title="Weight" value={detailBooking.weight} suffix="KG" /></Col>
              <Col span={8}><Statistic title="Volume" value={detailBooking.volume} suffix="CBM" /></Col>
            </Row>
            <div className="p-3 border rounded bg-slate-50">
              <Text type="secondary" className="text-xs block mb-1">Goods</Text>
              <div>{detailBooking.goodsDescription}</div>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default MawbList;
