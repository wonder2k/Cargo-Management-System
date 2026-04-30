import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography, Row, Col, Checkbox, Tabs, Badge, Alert, Popover } from 'antd';
import { collection, query, getDocs, addDoc, orderBy, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, cleanFirestoreData } from '../../lib/firebase';
import { FlightRate, Customer } from '../../types';
import { Plane, Plus, ChevronRight, Download, FileText, Settings, History, Trash2, Edit2, TrendingUp, DollarSign } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { PDFService } from '../../services/PDFService';
import { useTranslation } from 'react-i18next';

const { Text, Title } = Typography;

export const PricingList: React.FC = () => {
  const [rates, setRates] = useState<FlightRate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRate, setEditingRate] = useState<FlightRate | null>(null);
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [selectedRateIds, setSelectedRateIds] = useState<React.Key[]>([]);
  const [adjustmentType, setAdjustmentType] = useState<'percent' | 'fixed' | 'manual'>('percent');
  const [adjustmentValue, setAdjustmentValue] = useState<number>(0);
  const [customPrices, setCustomPrices] = useState<Record<string, number>>({});
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [pendingQuotation, setPendingQuotation] = useState<any>(null);
  
  const { profile } = useAuth();
  const { t } = useTranslation();
  const [form] = Form.useForm();
  const [quoteForm] = Form.useForm();
  const { message } = App.useApp();

  const fetchRates = async () => {
    try {
      const q = query(collection(db, 'flight-rates'), orderBy('lastUpdated', 'desc'));
      const snapshot = await getDocs(q);
      setRates(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FlightRate)));
    } catch (e) {
      message.error(t('common.error') + ': Failed to load rates');
    }
  };

  const fetchCustomers = async () => {
    try {
      const q = collection(db, 'customers');
      const snap = await getDocs(q);
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Customer)));
    } catch (e) {}
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      await Promise.all([fetchRates(), fetchCustomers()]);
      setLoading(false);
    };
    fetchData();
  }, []);

  const handleCreateOrUpdate = async (values: any) => {
    try {
      const sanitized = cleanFirestoreData(values);

      const rateData = {
        ...sanitized,
        lastUpdated: new Date().toISOString()
      };

      if (editingRate) {
        try {
          await updateDoc(doc(db, 'flight-rates', editingRate.id), rateData);
          message.success(t('common.success'));
        } catch (e: any) {
          handleFirestoreError(e, OperationType.WRITE, `flight-rates/${editingRate.id}`);
        }
      } else {
        try {
          await addDoc(collection(db, 'flight-rates'), rateData);
          message.success(t('common.success'));
        } catch (e: any) {
          handleFirestoreError(e, OperationType.WRITE, 'flight-rates');
        }
      }
      setModalOpen(false);
      fetchRates();
    } catch (e: any) {
      console.error('Error saving rate:', e);
      let displayError = e.message;
      try {
        if (e.message.startsWith('{')) {
          const parsed = JSON.parse(e.message);
          displayError = `Permission denied at ${parsed.path}`;
        }
      } catch(jsErr) {}
      message.error(t('common.error') + `: ${displayError}`);
    }
  };


  const handleFinalConfirm = async () => {
    if (!pendingQuotation) return;
    try {
      const customer = customers.find(c => c.id === pendingQuotation.customerId);
      
      // Use more robust recursive cleaning
      const sanitizedQuote = cleanFirestoreData(pendingQuotation);

      // 1. Generate PDF
      PDFService.generateProposal(sanitizedQuote, customer, profile);

      // 2. Save Log & Quote atomically
      try {
        const batch = writeBatch(db);
        const quoteRef = doc(collection(db, 'quotations'));
        const historyRef = doc(collection(db, 'quotation-history'));

        batch.set(quoteRef, sanitizedQuote);

        const historyData = cleanFirestoreData({
          quotationNo: sanitizedQuote.quotationNo,
          customerId: sanitizedQuote.customerId,
          customerName: sanitizedQuote.customerName,
          recipientInfo: sanitizedQuote.recipientInfo || '',
          routes: sanitizedQuote.routes.map((r: any) => `${r.origin}-${r.destination} @ ${r.finalPrice.toFixed(2)}`),
          summary: `Total ${sanitizedQuote.routes.length} routes, Amt: ${sanitizedQuote.routes[0]?.finalPrice.toFixed(2)} ${sanitizedQuote.currency}`,
          userId: profile?.uid || "",
          userName: profile?.displayName || "",
          timestamp: new Date().toISOString()
        });

        batch.set(historyRef, historyData);
        await batch.commit();
      } catch (e: any) {
        handleFirestoreError(e, OperationType.WRITE, 'quotations-batch');
      }

      message.success(t('common.success'));
      setPreviewModalOpen(false);
      setSelectedRateIds([]);
      quoteForm.resetFields();
      setCustomPrices({});
    } catch (e: any) {
      console.error('Quotation saving error:', e);
      let displayError = e.message;
      try {
        if (e.message.startsWith('{')) {
          const parsed = JSON.parse(e.message);
          displayError = `Error at ${parsed.path} during ${parsed.operationType}`;
        }
      } catch(jsErr) {}
      message.error(t('common.error') + ': ' + displayError);
    }
  };

  const isAdmin = profile?.role?.toLowerCase() === 'admin';
  const isSimulation = !!localStorage.getItem('simulation_user');
  const isAgent = profile?.role?.toLowerCase() === 'business';
  
  // Clear simulation if role is not admin but flag exists
  useEffect(() => {
    if (!isAdmin && isSimulation) {
      localStorage.removeItem('simulation_user');
    }
  }, [isAdmin, isSimulation]);

  const agentCustomer = (isAgent || (isAdmin && isSimulation)) 
    ? customers.find(c => c.name === (localStorage.getItem('simulation_user') || (isAgent ? profile?.companyName : ''))) 
    : null;

  const calculateFinalPrice = (rate: FlightRate, targetCustomer?: Customer) => {
    let freight = rate.baseFreight;
    
    // Determine the tier to apply
    let effectiveTier = 0;
    
    if (targetCustomer) {
        // 1. Specific quote for a customer
        effectiveTier = targetCustomer.tier || 0;
    } else if (isAdmin && isSimulation) {
        // 2. Admin browsing in simulation mode
        effectiveTier = agentCustomer?.tier || 0;
    } else {
        // 3. Logged in user browsing (Admin, Agent, etc)
        // Use their own tier, default to 0
        effectiveTier = profile?.tier || 0;
    }
    
    if (effectiveTier) {
        freight += (rate.currency === 'CNY' ? 0.5 : 0.2) * effectiveTier;
    }

    const adjustedFreight = adjustmentType === 'manual' 
      ? (customPrices[rate.id] || freight) 
      : (adjustmentType === 'percent' ? freight * (1 + adjustmentValue / 100) : freight + adjustmentValue);
    
    // Add surcharges
    const fuel = rate.fuelSurcharge || 0;
    const security = rate.securityScreening || 0;
    const terminal = rate.terminalHandling || 0;
    
    // For general display, we use 'formal' customs method as default or the legacy field
    const formalCustoms = rate.customsMethods?.['formal'] || rate.customsClearance;
    const customsAmount = formalCustoms?.unit === 'per_kg' ? (formalCustoms?.amount || 0) : 0;
    
    // Sum all per_kg miscFees
    const miscPerKgAmount = (rate.miscFees || []).reduce((sum, item) => 
      item.unit === 'per_kg' ? sum + item.amount : sum, 0);
    
    return adjustedFreight + fuel + security + terminal + customsAmount + miscPerKgAmount;
  };

  const getFlatFees = (rate: FlightRate) => {
    let total = 0;
    const formalCustoms = rate.customsMethods?.['formal'] || rate.customsClearance;
    if (formalCustoms?.unit === 'per_shipment') total += formalCustoms.amount;
    
    // Sum all per_shipment miscFees
    const miscFlatAmount = (rate.miscFees || []).reduce((sum, item) => 
      item.unit === 'per_shipment' ? sum + item.amount : sum, 0);
    
    total += miscFlatAmount;
    return total;
  };

  const handleOpenPreview = async (values: any) => {
    const selectedRates = rates.filter(r => selectedRateIds.includes(r.id));
    if (selectedRates.length === 0) return;

    let customer;
    let customerName = 'Walk-in Client';
    let recipientInfo = values.recipientInfo || '';

    if (isAgent) {
        customerName = values.manualCustomerName || 'Walk-in Client';
        recipientInfo = values.manualRecipientInfo || '';
    } else {
        customer = customers.find(c => c.id === values.customerId);
        customerName = customer?.name || 'Walk-in Client';
        recipientInfo = values.recipientInfo || '';
    }

    const quotationNo = `QT-${Date.now().toString().slice(-6)}`;
    
    // Validate manual prices
    if (adjustmentType === 'manual') {
      const invalid = selectedRates.some(r => (customPrices[r.id] || 0) < r.baseFreight);
      if (invalid) {
         message.error(t('pricing.errors.lowPrice'));
         return;
      }
    }

    const quotationData = {
      quotationNo,
      customerId: customer?.id || 'agent',
      customerName: customerName,
      recipientInfo: recipientInfo,
      routes: selectedRates.map(r => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        carrier: r.carrier,
        basePrice: r.baseFreight,
        finalPrice: calculateFinalPrice(r, customer || agentCustomer),
        adjustment: adjustmentType === 'percent' ? `+${adjustmentValue}%` : 
                   adjustmentType === 'fixed' ? `+${adjustmentValue}` : 'Manual',
        fuel: r.fuelSurcharge,
        security: r.securityScreening,
        terminal: r.terminalHandling,
        customs: r.customsMethods?.['formal'] || r.customsClearance,
        other: r.otherCharges,
        customsMethods: r.customsMethods,
        miscFees: r.miscFees,
        flatFees: getFlatFees(r)
      })),
      currency: selectedRates[0].currency,
      validUntil: values.validUntil,
      status: 'sent',
      createdAt: new Date().toISOString(),
      createdBy: profile?.uid,
      userName: profile?.displayName || 'System User',
      downloadCount: 1
    };

    setPendingQuotation(quotationData);
    setQuoteModalOpen(false);
    setPreviewModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {isAdmin && isSimulation && (
        <Alert
          message={
            <div className="flex justify-between items-center">
              <span>
                <strong>Simulation Mode:</strong> You are currently browsing as <strong>{localStorage.getItem('simulation_user')}</strong>. Prices reflect their specific tier.
              </span>
              <Button size="small" danger onClick={() => {
                localStorage.removeItem('simulation_user');
                window.location.reload();
              }}>
                Exit Simulation
              </Button>
            </div>
          }
          type="warning"
          showIcon
          className="mb-4 shadow-sm"
        />
      )}
      <div className="flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('pricing.title')}</Title>
          <Text type="secondary">{t('pricing.subtitle')}</Text>
        </div>
        <Space size="middle">
          {isAdmin && (
            <Button 
                type="primary" 
                size="large" 
                icon={<Plus size={18} />} 
                onClick={() => {
                    setEditingRate(null);
                    form.resetFields();
                    setModalOpen(true);
                }}
            >
                {t('common.create')}
            </Button>
          )}
          <Button 
            type={selectedRateIds.length > 0 ? "primary" : "default"}
            disabled={selectedRateIds.length === 0}
            size="large"
            icon={<FileText size={18} />}
            onClick={() => setQuoteModalOpen(true)}
            className={selectedRateIds.length > 0 ? "bg-orange-500 border-orange-500 hover:bg-orange-600" : ""}
          >
            {t('pricing.generateQuote')} ({selectedRateIds.length})
          </Button>
        </Space>
      </div>

      <Row gutter={16}>
        <Col span={24}>
           <Card className="shadow-sm border-slate-200">
             <div className="mb-4 flex items-center justify-between">
                <Space>
                   <Text strong>{t('pricing.selectedRoutes')}:</Text>
                   <Badge count={selectedRateIds.length} overflowCount={99} />
                   {selectedRateIds.length > 0 && (
                     <Button type="link" size="small" onClick={() => setSelectedRateIds([])}>{t('common.clear')}</Button>
                   )}
                </Space>
                {selectedRateIds.length > 0 && (
                    <div className="bg-slate-50 px-4 py-2 rounded-lg border border-dashed border-slate-300 flex items-center gap-4">
                        <Text style={{ fontSize: 13 }}>{t('pricing.adjustmentLogic')}:</Text>
                        <Select 
                            size="small" 
                            value={adjustmentType} 
                            onChange={setAdjustmentType}
                            options={[
                                { label: 'Percentage (+%)', value: 'percent' },
                                { label: 'Fixed Amount (+Value)', value: 'fixed' },
                                { label: 'Manual Adjustment', value: 'manual' }
                            ]}
                            style={{ width: 160 }}
                        />
                        {adjustmentType !== 'manual' && (
                            <InputNumber 
                                size="small" 
                                value={adjustmentValue} 
                                onChange={v => setAdjustmentValue(v || 0)} 
                                placeholder={adjustmentType === 'percent' ? 'Margin %' : 'Add Amt'}
                                style={{ width: 80 }}
                            />
                        )}
                    </div>
                )}
             </div>

             <Table 
                rowSelection={{
                  selectedRowKeys: selectedRateIds,
                  onChange: (keys) => setSelectedRateIds(keys)
                }}
                dataSource={rates} 
                loading={loading} 
                rowKey="id"
                pagination={{ pageSize: 15 }}
                className="custom-table"
                columns={[
                  { 
                    title: t('booking.route'), 
                    render: (_, r) => (
                        <div className="flex items-center gap-2">
                          <Tag color="blue" className="font-mono">{r.origin}</Tag>
                          <ChevronRight size={14} className="text-slate-300" />
                          <Tag color="indigo" className="font-mono">{r.destination}</Tag>
                        </div>
                    )
                  },
                  { 
                    title: t('booking.carrier'), 
                    render: (_, r) => (
                      <div>
                        <div className="flex items-center gap-2">
                           <span className="font-bold text-slate-700">{r.carrier}</span>
                           <span className="text-[10px] bg-slate-100 px-1 rounded text-slate-500">{r.aircraftType}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{t('pricing.schedule')}: {r.schedule || '-'}</p>
                      </div>
                    )
                  },
                  { 
                    title: t('pricing.baseFreight'), 
                    dataIndex: 'baseFreight',
                    render: (v, r) => <span className="font-mono font-bold text-slate-600">{r.currency} {v.toLocaleString()}</span>
                  },
                  { 
                    title: t('pricing.finalPrice'), 
                    render: (_, r) => {
                        const finalPrice = calculateFinalPrice(r);
                        const formalCustoms = r.customsMethods?.['formal'] || r.customsClearance;
                        const customsAmount = formalCustoms?.unit === 'per_kg' ? (formalCustoms?.amount || 0) : 0;
                        const miscPerKgAmount = (r.miscFees || []).reduce((sum, item) => item.unit === 'per_kg' ? sum + item.amount : sum, 0);
                        const isSim = isAdmin && isSimulation;

                        const breakdownContent = (
                            <div className="space-y-1 text-xs">
                                <div className="flex justify-between gap-8"><span>Base Freight:</span> <span className="font-mono">{r.baseFreight.toFixed(2)}</span></div>
                                <div className="flex justify-between gap-8 text-blue-600"><span>Tier Adj ({isSim ? `Sim: ${agentCustomer?.tier || 0}` : `Me: ${profile?.tier || 0}`}):</span> <span className="font-mono">+{((r.currency === 'CNY' ? 0.5 : 0.2) * (isSim ? (agentCustomer?.tier || 0) : (profile?.tier || 0))).toFixed(2)}</span></div>
                                <div className="flex justify-between gap-8 text-slate-500"><span>Fuel Surcharge:</span> <span className="font-mono">+{ (r.fuelSurcharge || 0).toFixed(2) }</span></div>
                                <div className="flex justify-between gap-8 text-slate-500"><span>Security:</span> <span className="font-mono">+{ (r.securityScreening || 0).toFixed(2) }</span></div>
                                <div className="flex justify-between gap-8 text-slate-500"><span>Terminal:</span> <span className="font-mono">+{ (r.terminalHandling || 0).toFixed(2) }</span></div>
                                <div className="flex justify-between gap-8 text-slate-500"><span>Customs (KG):</span> <span className="font-mono">+{ customsAmount.toFixed(2) }</span></div>
                                <div className="flex justify-between gap-8 text-slate-500"><span>Misc (KG):</span> <span className="font-mono">+{ miscPerKgAmount.toFixed(2) }</span></div>
                                <div className="border-t pt-1 flex justify-between gap-8 font-bold text-blue-600"><span>Total:</span> <span className="font-mono">{finalPrice.toFixed(2)}</span></div>
                            </div>
                        );

                        return (
                            <div className="flex flex-col">
                                {adjustmentType === 'manual' && selectedRateIds.includes(r.id) ? (
                                    <InputNumber 
                                        size="small" 
                                        min={r.baseFreight}
                                        status={(customPrices[r.id] || 0) < r.baseFreight ? 'error' : ''}
                                        value={customPrices[r.id] || r.baseFreight}
                                        onChange={(v) => v && setCustomPrices(prev => ({ ...prev, [r.id]: v }))}
                                        className="w-24"
                                        formatter={value => `${r.currency} ${value}`}
                                    />
                                ) : (
                                    <Popover content={breakdownContent} title="Price Breakdown">
                                        <span className="text-sm font-bold text-blue-600 cursor-help border-b border-dotted border-blue-300 w-fit">
                                            {r.currency} {finalPrice.toFixed(2)} / KG
                                        </span>
                                    </Popover>
                                )}
                                {getFlatFees(r) > 0 && (
                                  <span className="text-[10px] text-amber-600 font-bold">
                                    + {r.currency} {getFlatFees(r)} (Flat)
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-400">{t('pricing.allSurcharges')}</span>
                            </div>
                        );
                    }
                  },
                  {
                    title: t('common.actions'),
                    align: 'right',
                    render: (_, r) => isAdmin ? (
                        <Space>
                            <Button size="small" type="text" icon={<Edit2 size={14} />} onClick={() => {
                                setEditingRate(r);
                                form.setFieldsValue(r);
                                setModalOpen(true);
                            }} />
                            <Button size="small" type="text" danger icon={<Trash2 size={14} />} onClick={async () => {
                                await deleteDoc(doc(db, 'flight-rates', r.id));
                                fetchRates();
                            }} />
                        </Space>
                    ) : null
                  }
                ]}
             />
           </Card>
        </Col>
      </Row>

      {/* Admin Rate Modal */}
      <Modal
        title={editingRate ? t('common.edit') : t('common.create')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Title level={5} className="mb-4 border-b pb-2">{t('pricing.basicInfo')}</Title>
          <Row gutter={16}>
             <Col span={6}><Form.Item name="origin" label={t('booking.origin')} rules={[{ required: true }]}><Input placeholder="CAN" /></Form.Item></Col>
             <Col span={6}><Form.Item name="destination" label={t('booking.destination')} rules={[{ required: true }]}><Input placeholder="MIA" /></Form.Item></Col>
             <Col span={6}><Form.Item name="carrier" label={t('booking.carrier')} rules={[{ required: true }]}><Input placeholder="Atlas Air" /></Form.Item></Col>
             <Col span={6}><Form.Item name="region" label={t('pricing.region')} rules={[{ required: true }]}>
                <Select options={[
                  { label: 'AsiaPacific', value: 'AsiaPacific' },
                  { label: 'Americas', value: 'Americas' },
                  { label: 'Europe', value: 'Europe' },
                  { label: 'MESA', value: 'MESA' }
                ]} />
             </Form.Item></Col>
          </Row>

          <Row gutter={16}>
             <Col span={6}><Form.Item name="flightNo" label={t('pricing.flightNo')} initialValue=""><Input placeholder="5X123" /></Form.Item></Col>
             <Col span={6}><Form.Item name="aircraftType" label={t('pricing.aircraft')} initialValue=""><Input placeholder="B747-8F" /></Form.Item></Col>
             <Col span={6}><Form.Item name="schedule" label={t('pricing.schedule')} initialValue=""><Input placeholder="1,3,5,7" /></Form.Item></Col>
             <Col span={6}><Form.Item name="currency" label={t('booking.currency')} initialValue="CNY"><Select options={[{label:'CNY',value:'CNY'},{label:'USD',value:'USD'}]} /></Form.Item></Col>
          </Row>

          <Title level={5} className="mb-4 border-b pb-2 mt-4 text-blue-600">{t('pricing.costBreakdown')}</Title>
          <Row gutter={16}>
             <Col span={6}><Form.Item name="baseFreight" label={t('pricing.cost')} rules={[{ required: true }]}><InputNumber className="w-full" /></Form.Item></Col>
             <Col span={6}><Form.Item name="fuelSurcharge" label={t('pricing.fuel')} initialValue={0}><InputNumber className="w-full" /></Form.Item></Col>
             <Col span={6}><Form.Item name="securityScreening" label={t('pricing.security')} initialValue={0}><InputNumber className="w-full" /></Form.Item></Col>
             <Col span={6}><Form.Item name="terminalHandling" label={t('pricing.terminal')} initialValue={0}><InputNumber className="w-full" /></Form.Item></Col>
          </Row>

          <Title level={5} className="mb-2 mt-4 text-slate-700">{t('pricing.customs')} (Declaration Methods)</Title>
          <Row gutter={12}>
            {['formal', '9610', '9710', '9810'].map((method) => (
              <Col span={6} key={method}>
                <Card size="small" title={method.toUpperCase()} className="bg-slate-50">
                  <Form.Item label={t('common.amount')} name={['customsMethods', method, 'amount']} initialValue={0}><InputNumber className="w-full" /></Form.Item>
                  <Form.Item label={t('pricing.feeUnit')} name={['customsMethods', method, 'unit']} initialValue="per_shipment">
                    <Select options={[{label: t('pricing.perKg'), value:'per_kg'}, {label: t('pricing.perShipment'), value:'per_shipment'}]} />
                  </Form.Item>
                </Card>
              </Col>
            ))}
          </Row>

          <Title level={5} className="mb-2 mt-6 text-slate-700">{t('pricing.other')}</Title>
          <Form.List name="miscFees">
            {(fields, { add, remove }) => (
              <div className="space-y-4">
                {fields.map(({ key, name, ...restField }) => (
                  <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Fee Name required' }]}><Input placeholder="Internal Handling, etc." /></Form.Item>
                    <Form.Item {...restField} name={[name, 'amount']} rules={[{ required: true }]}><InputNumber placeholder="Amount" /></Form.Item>
                    <Form.Item {...restField} name={[name, 'unit']} initialValue="per_shipment">
                      <Select style={{ width: 120 }} options={[{label: t('pricing.perKg'), value:'per_kg'}, {label: t('pricing.perShipment'), value:'per_shipment'}]} />
                    </Form.Item>
                    <Trash2 size={16} className="text-red-500 cursor-pointer" onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>
                  Add Miscellaneous Charge
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      {/* Quotation Generation Modal */}
      <Modal
        title={t('pricing.generateQuote')}
        open={quoteModalOpen}
        onCancel={() => setQuoteModalOpen(false)}
        onOk={() => quoteForm.submit()}
        width={600}
      >
        <Form form={quoteForm} layout="vertical" onFinish={handleOpenPreview}>
          {isAgent ? (
            <>
              <Form.Item name="manualCustomerName" label={t('pricing.customerName')} rules={[{ required: true }]}>
                <Input placeholder="Enter Customer Name" />
              </Form.Item>
              <Form.Item name="manualRecipientInfo" label={t('pricing.recipient')} rules={[{ required: true }]}>
                  <Input.TextArea placeholder="Contact Person, Phone..." rows={3} />
              </Form.Item>
            </>
          ) : (
            <Form.Item name="customerId" label={t('pricing.customerName')} rules={[{ required: true }]}>
              <Select 
                  showSearch
                  placeholder={t('common.search')}
                  optionFilterProp="children"
                  options={customers.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id }))}
              />
            </Form.Item>
          )}
          <Form.Item name="recipientInfo" label={t('pricing.recipient')}>
             <Input.TextArea placeholder="Mr. Chen\nABC Logistics\n+86 139..." rows={3} />
          </Form.Item>
          <Form.Item name="validUntil" label={t('pricing.validUntil')} initialValue={new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}>
             <Input type="date" />
          </Form.Item>
          
          <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
             <Text strong className="text-orange-800">{t('pricing.summary')}</Text>
             <div className="mt-2 text-sm text-orange-700">
               <p>• {t('pricing.totalRoutes')}: {selectedRateIds.length}</p>
               <p>• {t('pricing.margin')}: {adjustmentType === 'percent' ? adjustmentValue + '%' : adjustmentType === 'fixed' ? adjustmentValue + ' fixed' : 'Manual Overrides'}</p>
               <p>• PDF will include your branding from Personal Center.</p>
             </div>
          </div>
        </Form>
      </Modal>

      {/* Quotation Preview Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            <span>{t('pricing.preview')}</span>
          </div>
        }
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        onOk={handleFinalConfirm}
        okText={t('pricing.confirmDownload')}
        width={750}
      >
        {pendingQuotation && (
          <div className="space-y-4">
             <div className="flex justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                   <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider">Proposal For</Text>
                   <Text strong className="text-lg">{pendingQuotation.customerName}</Text>
                   <div className="mt-1">
                      <Text type="secondary" className="block whitespace-pre-wrap">{pendingQuotation.recipientInfo}</Text>
                   </div>
                </div>
                <div className="text-right">
                   <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider">Quote No</Text>
                   <Text strong className="text-blue-600 font-mono italic">{pendingQuotation.quotationNo}</Text>
                   <div className="mt-2 text-[11px] text-slate-500">
                      {t('pricing.validUntil')}: {pendingQuotation.validUntil}
                   </div>
                </div>
             </div>

             <Table 
                dataSource={pendingQuotation.routes}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: t('booking.origin'), dataIndex: 'origin', className: 'font-mono' },
                  { title: t('booking.destination'), dataIndex: 'destination', className: 'font-mono' },
                  { title: t('booking.carrier'), dataIndex: 'carrier', className: 'font-bold' },
                  { title: t('pricing.baseFreight'), dataIndex: 'basePrice', render: (v) => `${pendingQuotation.currency} ${v}` },
                  { 
                    title: t('pricing.finalPrice'), 
                    render: (_, r: any) => (
                      <Text strong className="text-blue-600">
                        {pendingQuotation.currency} {r.finalPrice.toFixed(2)}
                      </Text>
                    )
                  }
                ]}
             />
             
             <div className="bg-blue-50 p-3 rounded border border-blue-100 flex items-start gap-2">
                <Settings size={16} className="text-blue-400 mt-1" />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Your company logo and contact details from "Personal Center" will be automatically embedded in the final PDF.
                </Text>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};