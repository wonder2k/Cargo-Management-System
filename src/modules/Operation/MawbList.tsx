import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Drawer, Steps, Form, Input, Select, App, Space, Typography, theme, Row, Col, Modal, Tabs, InputNumber, DatePicker, Tooltip, Empty, Upload, Divider, Badge, Statistic, List } from 'antd';
import { collection, query, getDocs, updateDoc, doc, addDoc, orderBy, where } from 'firebase/firestore';
import { db, cleanFirestoreData, handleFirestoreError, OperationType } from '../../lib/firebase';
import { MAWB, MawbStatus, Customer, Booking, BookingStatus } from '../../types';
import { Plus, Info, LayoutList, History, FileText, ChevronRight, CheckCircle2, XCircle, Package, MapPin, Plane, Search, Play, Pause, Camera, ExternalLink, Activity, PlaneTakeoff, PlaneLanding } from 'lucide-react';
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
  { value: 'closed', labelKey: 'operation.financeSettlement', color: '#8c8c8c' },
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
  const [manifestModalOpen, setManifestModalOpen] = useState(false);
  const [detailDrawerOpen, setDetailDrawerOpen] = useState(false);
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null);

  // Helper for mock download
  const triggerDownload = (fileName: string) => {
    message.loading(t('common.loading'), 1).then(() => {
      if (fileName.startsWith('http')) {
        window.open(fileName, '_blank');
      } else {
        // Mock download for demo purposes
        const blob = new Blob(['Mock file content for: ' + fileName], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        message.success(`${t('common.success')}: ${fileName}`);
      }
    });
  };
  
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
  const [manifestForm] = Form.useForm();
  const { message, modal } = App.useApp();

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
    console.log('handleStatusTransition called for:', record.internalMawbNo, 'status:', record.status);
    setSelectedMawb(record);
    switch (record.status) {
      case 'booked':
      case 'confirmed':
        warehouseForm.setFieldsValue(record);
        setWarehouseModalOpen(true);
        break;
      case 'warehouse_in': {
        const b = pendingBookings.find(bk => bk.mawbNo === record.internalMawbNo);
        if (!b?.manifestFileUrl || !b?.draftMawbUrl) {
          message.warning('请先完成载货清单和主单草单的上传');
        } else if (!b?.isDraftConfirmed) {
          message.warning('等待客户确认主单草单');
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
      case 'arrived':
        modal.confirm({
          title: t('operation.financeSettlement'),
          content: 'Confirm completion of all operations and transfer to Finance Settlement?',
          onOk: () => {
            console.log('Confirmed finance settlement clicked for mawb:', record.internalMawbNo);
            handleUpdateStep('closed', {}, record);
          }
        });
        break;
      default:
        setDrawerOpen(true);
    }
  };

  const handleUpdateStep = async (newStatus: MawbStatus, values: any = {}, mawbRecord?: MAWB) => {
      const targetMawb = mawbRecord || selectedMawb;
      console.log('handleUpdateStep called: status=', newStatus, 'values=', values, 'mawb=', targetMawb?.internalMawbNo);
      if (!targetMawb) {
        console.log('handleUpdateStep: no selectedMawb');
        return;
      }
    try {
      const now = new Date().toISOString();
      
      // Handle Dayjs conversion before cleaning
      const processDayjs = (obj: any): any => {
        if (!obj) return obj;
        if (dayjs.isDayjs(obj)) return obj.toISOString();
        if (Array.isArray(obj)) return obj.map(processDayjs);
        if (typeof obj === 'object') {
          return Object.fromEntries(
            Object.entries(obj).map(([k, v]) => [k, processDayjs(v)])
          );
        }
        return obj;
      };

      const processedValues = processDayjs(values);
      const cleanedValues = cleanFirestoreData(processedValues);
      
      const updatedData = cleanFirestoreData({
        ...processedValues,
        status: newStatus,
        lastUpdated: now
      });
      
      await updateDoc(doc(db, 'mawbs', targetMawb.id), updatedData);
      
      // Sync status to associated booking
      const q = query(collection(db, 'bookings'), where('mawbNo', '==', targetMawb.internalMawbNo));
      const bookingSnap = await getDocs(q);
      let bookingData: Booking | null = null;
      console.log('Searching booking for mawb:', targetMawb.internalMawbNo);
      if (!bookingSnap.empty) {
        bookingData = bookingSnap.docs[0].data() as Booking;
        console.log('Booking found:', bookingData);
        const bookingUpdate: any = { status: newStatus };
        if (newStatus === 'warehouse_in') {
          bookingUpdate.warehouseInfo = cleanedValues;
        }
        if (newStatus === 'terminal_in') {
          bookingUpdate.terminalInfo = cleanedValues;
        }
        await updateDoc(doc(db, 'bookings', bookingSnap.docs[0].id), bookingUpdate);
        console.log('Booking updated');
      } else {
        console.log('No booking found for mawb:', targetMawb.internalMawbNo);
      }
      
            // If closed, transfer to Finance
            console.log('Checking finance transfer condition: newStatus=', newStatus, 'isClosed=', newStatus === 'closed');
            if (newStatus === 'closed') {
                console.log('Inside newStatus === closed block. bookingData=', bookingData);
                if (bookingData) {
                    try {
                        console.log('Attempting to transfer to Finance:', { mawbNo: targetMawb.internalMawbNo, customerId: bookingData.customerId });
                        
                        // Weights from warehouse info
                        const actualWeight = (bookingData as any).warehouseInfo?.grossWeight || bookingData.weight;
                        const chargeableWeight = (bookingData as any).warehouseInfo?.chargeableWeight || bookingData.weight;
                        const pieces = (bookingData as any).warehouseInfo?.actualPieces || (bookingData as any).pieces || 0;

                        // AR calculation
                        const calculateTotal = (data: Booking) => {
                           let total = (data.unitPrice || 0) * chargeableWeight;
                           total += (data.fuelSurcharge || 0) * chargeableWeight;
                           total += (data.securityScreening || 0) * chargeableWeight;
                           total += (data.terminalHandling || 0) * chargeableWeight;
                           
                           // Customs Fee based on selected declaration method
                           const customs = data.customsMethods?.[data.declarationMethod] || data.customsClearance;
                           if (customs) {
                             total += customs.unit === 'per_kg' ? customs.amount * chargeableWeight : customs.amount;
                           }
                           
                           // Multi-item Miscellaneous fees
                           if (data.miscFees && data.miscFees.length > 0) {
                             total += data.miscFees.reduce((sum, fee) => {
                               return sum + (fee.unit === 'per_kg' ? fee.amount * chargeableWeight : fee.amount);
                             }, 0);
                           } else if (data.otherCharges) {
                             total += data.otherCharges.unit === 'per_kg' ? data.otherCharges.amount * chargeableWeight : data.otherCharges.amount;
                           }
                           
                           return total;
                        };

                        const arAmount = calculateTotal(bookingData);
                        
                        // 1. Generate Accounts Receivable
                        const arData = cleanFirestoreData({
                            mawbNo: targetMawb.internalMawbNo,
                            customerId: bookingData.customerId,
                            customerName: bookingData.customerName,
                            route: `${targetMawb.origin}→${targetMawb.destination}`,
                            pieces: pieces,
                            weight: actualWeight,
                            chargeableWeight: chargeableWeight,
                            flightDate: bookingData.flightDate,
                            declarationMethod: bookingData.declarationMethod,
                            price: bookingData.unitPrice,
                            currency: bookingData.currency,
                            totalAmount: arAmount,
                            // Breakdown fields
                            fuelSurcharge: bookingData.fuelSurcharge,
                            securityScreening: bookingData.securityScreening,
                            terminalHandling: bookingData.terminalHandling,
                            customsClearance: bookingData.customsMethods?.[bookingData.declarationMethod] || bookingData.customsClearance,
                            miscFees: bookingData.miscFees || [],
                            status: 'pending',
                            createdAt: new Date().toISOString()
                        });
                        
                        try {
                          await addDoc(collection(db, 'accountsReceivable'), arData);
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.WRITE, 'accountsReceivable');
                        }

                        // 2. Generate Accounts Payable (Cost to carrier)
                        const calculateCost = (data: Booking) => {
                           let total = (data.costPrice || data.unitPrice * 0.85) * chargeableWeight;
                           total += (data.fuelSurcharge || 0) * chargeableWeight;
                           total += (data.securityScreening || 0) * chargeableWeight;
                           total += (data.terminalHandling || 0) * chargeableWeight;
                           
                           const customs = data.customsMethods?.[data.declarationMethod] || data.customsClearance;
                           if (customs) {
                             total += customs.unit === 'per_kg' ? customs.amount * chargeableWeight : customs.amount;
                           }
                           
                           if (data.miscFees && data.miscFees.length > 0) {
                             total += data.miscFees.reduce((sum, fee) => {
                               return sum + (fee.unit === 'per_kg' ? fee.amount * chargeableWeight : fee.amount);
                             }, 0);
                           } else if (data.otherCharges) {
                             total += data.otherCharges.unit === 'per_kg' ? data.otherCharges.amount * chargeableWeight : data.otherCharges.amount;
                           }
                           return total;
                        };

                        const apAmount = calculateCost(bookingData);
                        const q = (bookingData as any).warehouseInfo?.chargeableWeight || bookingData.weight;
                        
                        // Build line items for breakdown with quantity and unit price
                        const apLineItems = [
                          { 
                            name: 'Air Freight', 
                            quantity: q,
                            unitPrice: bookingData.costPrice || (bookingData.unitPrice * 0.85),
                            amount: (bookingData.costPrice || bookingData.unitPrice * 0.85) * q 
                          },
                          { 
                            name: 'Fuel Surcharge', 
                            quantity: q, 
                            unitPrice: bookingData.fuelSurcharge || 0,
                            amount: (bookingData.fuelSurcharge || 0) * q 
                          },
                          { 
                            name: 'Security Screening', 
                            quantity: q,
                            unitPrice: bookingData.securityScreening || 0,
                            amount: (bookingData.securityScreening || 0) * q 
                          },
                          { 
                            name: 'Terminal Handling', 
                            quantity: q,
                            unitPrice: bookingData.terminalHandling || 0,
                            amount: (bookingData.terminalHandling || 0) * q 
                          },
                        ];

                        const customs = bookingData.customsMethods?.[bookingData.declarationMethod] || bookingData.customsClearance;
                        if (customs) {
                           const customsQty = customs.unit === 'per_kg' ? q : 1;
                           apLineItems.push({ 
                             name: `Customs (${bookingData.declarationMethod})`, 
                             quantity: customsQty,
                             unitPrice: customs.amount,
                             amount: customs.amount * customsQty
                           });
                        }
                        
                        if (bookingData.miscFees && bookingData.miscFees.length > 0) {
                          bookingData.miscFees.forEach(fee => {
                            const feeQty = fee.unit === 'per_kg' ? q : 1;
                            apLineItems.push({
                              name: fee.name,
                              quantity: feeQty,
                              unitPrice: fee.amount,
                              amount: fee.amount * feeQty
                            });
                          });
                        }

                        const apData = cleanFirestoreData({
                            mawbNo: targetMawb.internalMawbNo,
                            vendorName: targetMawb.carrier || 'Carrier',
                            vendorId: targetMawb.carrier || 'default_vendor',
                            route: `${targetMawb.origin}→${targetMawb.destination}`,
                            pieces: pieces,
                            weight: actualWeight,
                            chargeableWeight: chargeableWeight,
                            flightDate: bookingData.flightDate,
                            totalAmount: apAmount,
                            currency: bookingData.currency,
                            lineItems: apLineItems,
                            // Breakdown fields (backward compatibility/direct access)
                            fuelSurcharge: bookingData.fuelSurcharge,
                            securityScreening: bookingData.securityScreening,
                            terminalHandling: bookingData.terminalHandling,
                            customsClearance: bookingData.customsMethods?.[bookingData.declarationMethod] || bookingData.customsClearance,
                            miscFees: bookingData.miscFees || [],
                            status: 'pending',
                            createdAt: new Date().toISOString()
                        });

                        try {
                          await addDoc(collection(db, 'accountsPayable'), apData);
                        } catch (err: any) {
                          handleFirestoreError(err, OperationType.WRITE, 'accountsPayable');
                        }
                        
                        console.log('Successfully transferred to Finance (AR & AP generated)');
                    } catch (error) {
                        console.error('Failed to transfer to Finance:', error);
                        message.error('Failed to transfer to Finance: ' + (error as Error).message);
                    }
                } else {
                    console.log('Skipping finance transfer: bookingData is null');
                }
            } else {
                console.log('Skipping finance transfer: newStatus is not closed');
            }
      
      // If warehouse in, try to trigger 17TRACK registration automatically 
      if (newStatus === 'warehouse_in') {
        try {
          fetch('/api/track/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: targetMawb.internalMawbNo })
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
      console.error(e);
      message.error(t('common.error'));
    }
  };

  const handleUploadDraft = async (values: any) => {
    if (!selectedMawb) return;
    try {
      // Update MAWB with ETD and ETA
      await updateDoc(doc(db, 'mawbs', selectedMawb.id), {
        etd: values.etd?.toISOString(),
        eta: values.eta?.toISOString()
      });

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
      } else {
        message.error('Associated booking not found');
      }
    } catch (e) {
      console.error('Draft upload error:', e);
      message.error(t('common.error'));
    }
  };

  const handleUploadManifest = async (values: any) => {
    if (!selectedBooking) return;
    try {
      await updateDoc(doc(db, 'bookings', selectedBooking.id), {
        manifestFileUrl: values.manifestFileUrl,
        updatedAt: new Date().toISOString()
      });
      message.success(t('common.success'));
      setManifestModalOpen(false);
      fetchData();
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
      
      const sanitizedMawb = cleanFirestoreData(mawbData);
      
      try {
        await addDoc(collection(db, 'mawbs'), sanitizedMawb);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, 'mawbs');
      }

      // 2. Update Booking
      const bookingUpdates = cleanFirestoreData({
        status: 'finalized',
        mawbNo: values.mawbNo || '',
        warehouseId: values.warehouseId || '',
        entryTime: values.entryTime?.toISOString() || null,
        updatedAt: new Date().toISOString()
      });

      try {
        await updateDoc(doc(db, 'bookings', selectedBooking.id), bookingUpdates);
      } catch (err: any) {
        handleFirestoreError(err, OperationType.WRITE, `bookings/${selectedBooking.id}`);
      }

      message.success('MAWB Issued - Moved to Operation Center');
      setFinalBookingModalOpen(false);
      fetchData();
    } catch (e: any) {
      console.error('Finalization error:', e);
      let displayError = e.message;
      try {
        if (e.message.startsWith('{')) {
          const parsed = JSON.parse(e.message);
          displayError = `Error at ${parsed.path} during ${parsed.operationType}`;
        }
      } catch(jsErr) {}
      message.error('Finalization failed: ' + displayError);
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
                       width: 220,
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
                      width: 140,
                      render: (_, r) => {
                        const b = pendingBookings.find(bk => bk.mawbNo === r.internalMawbNo);
                        const hasManifest = !!b?.manifestFileUrl;
                        const hasDraft = !!b?.draftMawbUrl;
                        return (
                          <Space size="middle" wrap>
                            <Button 
                              size="small" 
                              icon={<Package size={14} />} 
                              className={hasManifest ? "text-blue-600 border-blue-600" : "text-red-500 border-red-500"}
                              onClick={() => {
                                if (hasManifest && b?.manifestFileUrl) {
                                  triggerDownload(b.manifestFileUrl);
                                } else if (b) {
                                  setSelectedBooking(b);
                                  manifestForm.setFieldsValue({ manifestFileUrl: undefined });
                                  setManifestModalOpen(true);
                                }
                              }}
                            >
                              {t('booking.manifest')}
                            </Button>

                            <Button 
                              size="small" 
                              icon={<FileText size={14} />} 
                              className={hasDraft ? "text-blue-600 border-blue-600" : "text-red-500 border-red-500"}
                              onClick={() => {
                                 if (hasDraft && b?.draftMawbUrl) {
                                   triggerDownload(b.draftMawbUrl);
                                 } else if (b) {
                                   setSelectedMawb(r);
                                   setSelectedBooking(b);
                                   draftForm.setFieldsValue({ draftMawbUrl: `${r.internalMawbNo}_Draft.pdf` });
                                   setDraftModalOpen(true);
                                 }
                              }}
                            >
                              {t('operation.steps.draft')}
                            </Button>
                          </Space>
                        );
                      }
                    },
                    { 
                      title: t('operation.route'), 
                      width: 140,
                      render: (_, r) => <Tag color="blue">{r.origin} → {r.destination}</Tag>,
                      filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }: any) => {
                        const origins = Array.from(new Set(mawbs.map(m => m.origin))).sort();
                        const destinations = Array.from(new Set(mawbs.map(m => m.destination))).sort();
                        const currentOrigin = selectedKeys.find((k: string) => k.startsWith('o:'))?.replace('o:', '') || '';
                        const currentDest = selectedKeys.find((k: string) => k.startsWith('d:'))?.replace('d:', '') || '';

                        return (
                          <div className="p-3 w-64 flex flex-col gap-3">
                            <div>
                              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><PlaneTakeoff size={12} /> {t('common.origin')}</div>
                              <Select 
                                className="w-full" 
                                placeholder={t('common.all')} 
                                allowClear
                                value={currentOrigin || undefined}
                                options={origins.map(o => ({ label: o, value: o }))}
                                onChange={(val) => {
                                  const newKeys = selectedKeys.filter((k: string) => !k.startsWith('o:'));
                                  if (val) newKeys.push(`o:${val}`);
                                  setSelectedKeys(newKeys);
                                }}
                              />
                            </div>
                            <div>
                              <div className="text-xs text-slate-400 mb-1 flex items-center gap-1"><PlaneLanding size={12} /> {t('common.destination')}</div>
                              <Select 
                                className="w-full" 
                                placeholder={t('common.all')} 
                                allowClear
                                value={currentDest || undefined}
                                options={destinations.map(d => ({ label: d, value: d }))}
                                onChange={(val) => {
                                  const newKeys = selectedKeys.filter((k: string) => !k.startsWith('d:'));
                                  if (val) newKeys.push(`d:${val}`);
                                  setSelectedKeys(newKeys);
                                }}
                              />
                            </div>
                            <div className="flex justify-between mt-2">
                              <Button size="small" onClick={() => { if (clearFilters) clearFilters(); confirm(); }} className="text-xs">{t('common.reset')}</Button>
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
                      onFilter: (value, record) => {
                        const val = value as string;
                        if (val.startsWith('o:')) return record.origin === val.replace('o:', '');
                        if (val.startsWith('d:')) return record.destination === val.replace('d:', '');
                        return true;
                      }
                    },
                    {
                      title: t('booking.carrier'),
                      dataIndex: 'carrier',
                      width: 110,
                      filters: Array.from(new Set(mawbs.map(m => m.carrier).filter(Boolean))).map(c => ({ text: c, value: c })),
                      onFilter: (value, record) => record.carrier === value,
                      render: (text) => <span className="font-bold text-slate-700">{text || '--'}</span>
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

                        const b = pendingBookings.find(bk => bk.mawbNo === r.internalMawbNo);
                        const canFinishCustoms = r.status === 'warehouse_in' ? (!!b?.manifestFileUrl && !!b?.draftMawbUrl) : true;

                        const btn = (
                          <Button 
                            type="primary" 
                            size="small" 
                            disabled={!canFinishCustoms}
                            className="bg-blue-600 flex items-center gap-1 text-[11px]"
                            onClick={() => handleStatusTransition(r)}
                          >
                             {nextLabel} <Play size={10} fill="currentColor" />
                          </Button>
                        );

                        if (r.status === 'warehouse_in' && !canFinishCustoms) {
                          return (
                            <Tooltip title="先上传主单草单并与客户进行确认">
                              <span className="inline-block cursor-not-allowed">
                                {btn}
                              </span>
                            </Tooltip>
                          );
                        }

                        return btn;
                      }
                    },
                    {
                      title: t('operation.exception'),
                      align: 'right',
                      render: (_, r) => (
                        <Space>
                          {r.status !== 'on_hold' ? (
                            <Button 
                              size="small" 
                              type="text" 
                              danger 
                              disabled={['terminal_in', 'departed', 'arrived', 'closed'].includes(r.status)}
                              onClick={() => {
                                handleUpdateStep('on_hold', {}, r);
                              }} 
                              icon={<Pause size={14} />}
                            >
                              {t('booking.status.on_hold')}
                            </Button>
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
              <Badge count={pendingBookings.filter(b => !['finalized', 'cancelled'].includes(b.status) && !b.mawbNo).length} offset={[10, 0]} size="small" showZero={false} color="#faad14">
                <span className="px-4 font-semibold">{t('operation.newRequests')}</span>
              </Badge>
            ),
            children: (
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <Table 
                  dataSource={pendingBookings.filter(b => !['finalized', 'cancelled'].includes(b.status) && !b.mawbNo)} 
                  loading={loading} 
                  rowKey="id"
                  columns={[
                    { 
                      title: t('operation.mawbRef'), 
                      render: (_, r) => (
                        <div className="flex flex-col cursor-pointer group" onClick={() => { setSelectedBookingDetail(r); setDetailDrawerOpen(true); }}>
                          <span className="text-sm font-mono font-bold text-blue-600 group-hover:underline">{r.bookingNo}</span>
                          <span className="text-[10px] text-slate-400">{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</span>
                        </div>
                      )
                    },
                    { 
                      title: t('operation.route'), 
                      render: (_, r) => (
                        <div className="flex flex-col">
                          <Tag color="geekblue" className="w-fit">{r.origin} → {r.destination}</Tag>
                          <span className="text-[10px] text-slate-400 mt-1">ETD: {dayjs(r.flightDate).format('YYYY-MM-DD')}</span>
                        </div>
                      )
                    },
                    { title: t('booking.customer'), dataIndex: 'customerName' },
                    { 
                      title: t('booking.cargo'), 
                      render: (_, r) => (
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{r.pieces}P / {r.weight}K / {r.volume}C</span>
                          <span className="text-[10px] text-slate-400 truncate w-32">{r.goodsDescription}</span>
                        </div>
                      )
                    },
                    {
                      title: t('common.status'),
                      dataIndex: 'status',
                      render: (status: BookingStatus) => {
                        const colors: Record<string, string> = {
                          pending: 'orange',
                          space_confirmed: 'green',
                          space_partial: 'cyan',
                          space_rejected: 'red',
                          client_accepted: 'blue'
                        };
                        return <Tag color={colors[status] || 'default'}>{t(`booking.status.${status}`)}</Tag>;
                      }
                    },
                    { title: t('common.actions'), align: 'right', render: (_, r) => (
                        <Space>
                           {['pending', 'space_partial', 'space_rejected'].includes(r.status) && <Button size="small" type="primary" onClick={() => { setSelectedBooking(r); setSpaceModalOpen(true); }}>{t('operation.setConfirmed')}</Button>}
                           {r.status === 'client_accepted' && <Button size="small" type="primary" className="bg-green-600 border-green-600" onClick={() => { setSelectedBooking(r); finalForm.setFieldsValue({ entryTime: dayjs().add(1, 'day').hour(16).minute(0).second(0).millisecond(0) }); setFinalBookingModalOpen(true); }}>{t('booking.status.finalized')}</Button>}
                           {r.status === 'space_confirmed' && <span className="text-xs text-slate-400 italic">{t('booking.waitClientAccept')}</span>}
                        </Space>
                    )}
                  ]}
                />
              </div>
            )
          },
          {
            key: 'finishedBookings',
            label: (
              <Badge count={pendingBookings.filter(b => b.status !== 'cancelled' && !!b.mawbNo).length} offset={[10, 0]} size="small" showZero={false} color="#87d068">
                <span className="px-4 font-semibold">{t('operation.finishedRequests')}</span>
              </Badge>
            ),
            children: (
              <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
                <Table 
                  dataSource={pendingBookings.filter(b => b.status !== 'cancelled' && !!b.mawbNo)} 
                  loading={loading} 
                  rowKey="id"
                  columns={[
                    { 
                      title: t('operation.mawbRef'), 
                      render: (_, r) => (
                        <div className="flex flex-col cursor-pointer group" onClick={() => { setSelectedBookingDetail(r); setDetailDrawerOpen(true); }}>
                          <span className="text-sm font-mono font-bold text-blue-600 group-hover:underline">{r.bookingNo}</span>
                          <span className="text-[10px] text-blue-500 font-mono font-bold">{r.mawbNo}</span>
                        </div>
                      )
                    },
                    {
                      title: t('operation.route'),
                      render: (_, r) => <div className="flex flex-col"><span className="text-sm font-bold text-slate-700">{r.origin} → {r.destination}</span><span className="text-[10px] text-slate-400">ETD: {dayjs(r.flightDate).format('YYYY-MM-DD')}</span></div>
                    },
                    {
                      title: t('booking.customer'),
                      dataIndex: 'customerName',
                    },
                    {
                        title: t('operation.docs'),
                        render: (_, r) => (
                          <Space>
                            {r.manifestFileUrl && (
                                <Tooltip title={t('booking.manifest')}>
                                    <Button size="small" type="text" icon={<Package size={14} className="text-blue-500" />} onClick={() => triggerDownload(r.manifestFileUrl!)} />
                                </Tooltip>
                            )}
                            {r.draftMawbUrl && (
                                <Tooltip title={t('operation.steps.draft')}>
                                    <Button size="small" type="text" icon={<FileText size={14} className="text-orange-500" />} onClick={() => triggerDownload(r.draftMawbUrl!)} />
                                </Tooltip>
                            )}
                          </Space>
                        )
                    },
                    { 
                      title: t('common.status'), 
                      dataIndex: 'status',
                      render: (status: string) => {
                        const colors: any = { finalized: 'green', warehouse_in: 'cyan', customs: 'geekblue', terminal_in: 'purple' };
                        return <Tag color={colors[status] || 'default'}>{t(`booking.status.${status}`)}</Tag>;
                      }
                    }
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
        <Form form={warehouseForm} layout="vertical" onFinish={(v) => handleUpdateStep('warehouse_in', v, selectedMawb || undefined)}>
          <Row gutter={16}>
            <Col span={8}><Form.Item name="grossWeight" label={`${t('operation.grossWeight')} (KG)`} rules={[{ required: true }]}><InputNumber className="w-full" precision={2} /></Form.Item></Col>
            <Col span={8}><Form.Item name="chargeableWeight" label={`${t('operation.chargeableWeight')} (KG)`} rules={[{ required: true }]}><InputNumber className="w-full" precision={2} readOnly /></Form.Item></Col>
            <Col span={8}><Form.Item name="actualPieces" label={t('operation.pieces')} rules={[{ required: true }]}><InputNumber className="w-full" min={1} /></Form.Item></Col>
          </Row>
          <Form.Item label={`${t('operation.dimensions')} (cm)`}>
             <Form.List name="dims">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }) => (
                      <Row key={key} gutter={8} className="mb-2 items-center">
                        <Col span={6}>
                          <Form.Item {...restField} name={[name, 'l']} noStyle rules={[{ required: true }]}>
                            <InputNumber 
                              id={`dim_input_${name}_l`}
                              placeholder="L" 
                              className="w-full" 
                              onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === 'Enter') {
                                  e.preventDefault();
                                  add();
                                  setTimeout(() => {
                                    const nextInput = document.getElementById(`dim_input_${name + 1}_l`);
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                      (nextInput as HTMLInputElement).select();
                                    }
                                  }, 100);
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item {...restField} name={[name, 'w']} noStyle rules={[{ required: true }]}>
                            <InputNumber 
                              placeholder="W" 
                              className="w-full" 
                              onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === 'Enter') {
                                  e.preventDefault();
                                  add();
                                  setTimeout(() => {
                                    const nextInput = document.getElementById(`dim_input_${name + 1}_l`);
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                      (nextInput as HTMLInputElement).select();
                                    }
                                  }, 100);
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
                        <Col span={6}>
                          <Form.Item {...restField} name={[name, 'h']} noStyle rules={[{ required: true }]}>
                            <InputNumber 
                              placeholder="H" 
                              className="w-full" 
                              onKeyDown={(e) => {
                                if (e.ctrlKey && e.key === 'Enter') {
                                  e.preventDefault();
                                  add();
                                  setTimeout(() => {
                                    const nextInput = document.getElementById(`dim_input_${name + 1}_l`);
                                    if (nextInput) {
                                      (nextInput as HTMLInputElement).focus();
                                      (nextInput as HTMLInputElement).select();
                                    }
                                  }, 100);
                                }
                              }}
                            />
                          </Form.Item>
                        </Col>
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
          <Form.Item label="ETD" name="etd" rules={[{ required: true }]}>
            <DatePicker showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" className="w-full" />
          </Form.Item>
          <Form.Item label="ETA" name="eta" rules={[{ required: true }]}>
            <DatePicker showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" className="w-full" />
          </Form.Item>
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
        <Form form={customsForm} layout="vertical" onFinish={(v) => handleUpdateStep('customs', v, selectedMawb || undefined)} initialValues={{ customsCleared: true }}>
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
        <Form form={terminalForm} layout="vertical" onFinish={(v) => handleUpdateStep('terminal_in', v, selectedMawb || undefined)} initialValues={{ terminalConfirmed: true }}>
           <Form.Item name="terminalConfirmed" label={t('common.confirm')}>
             <Select options={[{ label: t('common.ok'), value: true }, { label: t('common.cancel'), value: false }]} />
           </Form.Item>
           <Form.Item name="terminalRemark" label={t('operation.remark')}>
              <Input.TextArea placeholder="Any damage noted? Waiting for build-up?" rows={2} />
           </Form.Item>
           <Form.Item name="terminalException" label={t('operation.exception')}>
              <Input.TextArea placeholder="Details about damaged items or returns at terminal..." rows={3} />
           </Form.Item>
           <Divider orientation="left" className="text-xs">{t('operation.returnedItems')}</Divider>
           <Form.List name="terminalReturnedItems">
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

      {/* 4. Tracking Modal (Depart/Arrive) */}
      <Modal
        title={t('operation.steps.tracking')}
        open={trackingModalOpen}
        onCancel={() => setTrackingModalOpen(false)}
        onOk={() => trackingForm.submit()}
        width={600}
      >
        <Form form={trackingForm} layout="vertical" onFinish={(v) => handleUpdateStep(v.ata ? 'arrived' : 'departed', v, selectedMawb || undefined)}>
           <Row gutter={16}>
             <Col span={12}>
               <Form.Item name="atd" label={t('operation.departure')}>
                 <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
               </Form.Item>
             </Col>
             <Col span={12}>
               <Form.Item name="ata" label={t('operation.arrival')}>
                 <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
               </Form.Item>
             </Col>
           </Row>
           <Form.Item name="pod_time" label={t('operation.pickup')}>
              <DatePicker showTime format="YYYY-MM-DD HH:mm" className="w-full" />
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
                 
                 {/* Link back to original booking */}
                 {(() => {
                   const booking = pendingBookings.find(b => b.mawbNo === selectedMawb.internalMawbNo);
                   if (!booking) return null;
                   return (
                     <>
                       <Divider className="my-2" />
                       <Col span={12}><Text type="secondary">{t('booking.no')}: </Text> <Tag color="blue">{booking.bookingNo}</Tag></Col>
                       <Col span={12}><Text type="secondary">Space Status: </Text> <Tag color={booking.spaceStatus === 'Yes' ? 'green' : 'orange'}>{booking.spaceStatus || 'N/A'}</Tag></Col>
                       {booking.operationRemarks && (
                         <Col span={24}><Text type="secondary">Booking Notes: </Text> <Text italic className="text-[12px]">{booking.operationRemarks}</Text></Col>
                       )}
                     </>
                   );
                 })()}
               </Row>
            </Card>

            <Card size="small" title={t('operation.docs')} className="bg-slate-50 border-none shadow-none mt-4">
               <Row gutter={[16, 8]}>
                 <Col span={12}>
                   <Text type="secondary">{t('booking.manifest')}: </Text>
                   {(() => {
                     const b = pendingBookings.find(bk => bk.mawbNo === selectedMawb.internalMawbNo);
                     return b?.manifestFileUrl ? (
                       <Tag color="blue" className="cursor-pointer" onClick={() => {
                            if (b.manifestFileUrl) triggerDownload(b.manifestFileUrl);
                          }}>{b.manifestFileUrl}</Tag>
                     ) : (
                       <Button size="small" type="dashed" danger icon={<Plus size={12} />} onClick={() => { if(b) { setSelectedBooking(b); setManifestModalOpen(true); } else { message.error('No booking associated'); } }}>{t('common.search')}</Button>
                     );
                   })()}
                 </Col>
                 <Col span={12}>
                   <Text type="secondary">{t('operation.steps.draft')}: </Text>
                   {(() => {
                     const b = pendingBookings.find(bk => bk.mawbNo === selectedMawb.internalMawbNo);
                     return b?.draftMawbUrl ? (
                       <Space>
                          <Tag 
                            color={b.isDraftConfirmed ? "green" : "orange"}
                            className="cursor-pointer"
                            onClick={() => {
                              if (b.draftMawbUrl) triggerDownload(b.draftMawbUrl);
                            }}
                          >
                            {b.draftMawbUrl}
                          </Tag>
                       </Space>
                     ) : (
                       <Button size="small" type="dashed" icon={<Plus size={12} />} onClick={() => setDraftModalOpen(true)}>{t('common.search')}</Button>
                     );
                   })()}
                 </Col>
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

            {selectedMawb.terminalReturnedItems && selectedMawb.terminalReturnedItems.length > 0 && (
              <Card size="small" title={<Space><Package size={14} className="text-red-500" /> {t('operation.returnedItems')} (Terminal)</Space>} className="bg-red-50 border-red-100 mt-4">
                <List
                  size="small"
                  dataSource={selectedMawb.terminalReturnedItems}
                  renderItem={item => (
                    <List.Item>
                      <Text strong className="mr-2 font-mono">{item.subMawb}:</Text>
                      <Text type="secondary">{item.reason}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            )}

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

       <Drawer
         title={<Space><FileText size={18} className="text-blue-600" /> <span className="font-mono">{selectedBookingDetail?.bookingNo}</span></Space>}
         open={detailDrawerOpen}
         onClose={() => setDetailDrawerOpen(false)}
         width={500}
       >
         {selectedBookingDetail && (
           <div className="space-y-6">
             <Card size="small" className="bg-slate-50">
               <Row gutter={[16, 16]}>
                 <Col span={12}><Text type="secondary">{t('booking.customer')}:</Text> <div className="font-bold">{selectedBookingDetail.customerName}</div></Col>
                 <Col span={12}><Text type="secondary">{t('common.status')}:</Text> <div>{t(`booking.status.${selectedBookingDetail.status}`)}</div></Col>
                 <Col span={12}><Text type="secondary">{t('operation.route')}:</Text> <div className="font-bold">{selectedBookingDetail.origin} → {selectedBookingDetail.destination}</div></Col>
                 <Col span={12}><Text type="secondary">MAWB No:</Text> <div className="font-mono font-bold text-blue-600">{selectedBookingDetail.mawbNo || '--'}</div></Col>
                 <Col span={12}><Text type="secondary">业务员:</Text> <div className="font-bold text-indigo-600">{selectedBookingDetail.salespersonName || '--'}</div></Col>
                 <Col span={12}><Text type="secondary">联系方式:</Text> <div className="font-bold text-indigo-600">{selectedBookingDetail.salespersonContact || '--'}</div></Col>
               </Row>
             </Card>

             <div>
               <Divider orientation="left">{t('booking.cargo')}</Divider>
               <Row gutter={[16, 16]}>
                 <Col span={8}><Statistic title={t('booking.pieces')} value={selectedBookingDetail.pieces} /></Col>
                 <Col span={8}><Statistic title={t('booking.weight')} value={selectedBookingDetail.weight} suffix="KG" /></Col>
                 <Col span={8}><Statistic title={t('booking.volume')} value={selectedBookingDetail.volume} suffix="CBM" /></Col>
               </Row>
               <div className="mt-4 p-3 border rounded bg-slate-50">
                 <Text type="secondary" className="text-xs block mb-1 underline">{t('booking.description')}</Text>
                 <div className="text-sm">{selectedBookingDetail.goodsDescription}</div>
               </div>
             </div>

             {selectedBookingDetail.shipperInfo && (
               <div>
                  <Divider orientation="left">{t('booking.shipper')}</Divider>
                  <div className="text-xs text-slate-600 bg-white p-2 border rounded whitespace-pre-wrap">{selectedBookingDetail.shipperInfo}</div>
               </div>
             )}
             {selectedBookingDetail.consigneeInfo && (
               <div>
                  <Divider orientation="left">{t('booking.consignee')}</Divider>
                  <div className="text-xs text-slate-600 bg-white p-2 border rounded whitespace-pre-wrap">{selectedBookingDetail.consigneeInfo}</div>
               </div>
             )}

             <div className="pt-4">
                <Divider orientation="left">{t('operation.docs')}</Divider>
                <Space direction="vertical" className="w-full">
                  {selectedBookingDetail.manifestFileUrl && (
                    <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(selectedBookingDetail.manifestFileUrl!)}>
                      <Space><Package size={18} className="text-blue-500" /> <Text className="font-medium">{t('booking.manifest')}</Text></Space>
                      <Button type="link" icon={<ExternalLink size={14} />}>Download</Button>
                    </div>
                  )}
                  {selectedBookingDetail.draftMawbUrl && (
                    <div className="flex items-center justify-between p-3 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => triggerDownload(selectedBookingDetail.draftMawbUrl!)}>
                      <Space><FileText size={18} className="text-orange-500" /> <Text className="font-medium">{t('operation.steps.draft')}</Text></Space>
                      <Button type="link" icon={<ExternalLink size={14} />}>Download</Button>
                    </div>
                  )}
                </Space>
             </div>
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
           <Form.Item name="entryTime" label={t('booking.advisedEntry')}><DatePicker showTime={{ format: 'HH:mm' }} format="YYYY-MM-DD HH:mm" className="w-full" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={t('booking.manifest')} open={manifestModalOpen} onCancel={() => setManifestModalOpen(false)} onOk={() => manifestForm.submit()}>
        <Form form={manifestForm} layout="vertical" onFinish={handleUploadManifest}>
          <Form.Item label={t('booking.manifest') + ' (Excel)'} required>
             <Upload 
               maxCount={1}
               beforeUpload={() => false}
               onChange={(info) => {
                 if (info.fileList.length > 0) {
                   manifestForm.setFieldsValue({ manifestFileUrl: info.fileList[0].name });
                 }
               }}
             >
               <Button icon={<Package size={14} />}>{t('common.search')}</Button>
             </Upload>
             <Form.Item name="manifestFileUrl" noStyle rules={[{ required: true, message: t('booking.uploadManifest') }]}>
               <Input type="hidden" />
             </Form.Item>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

