import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Modal, Form, Input, Select, InputNumber, App, Space, Typography, Row, Col, Badge, Alert, Popover, Checkbox } from 'antd';
import { FlightRate, Customer } from '../../types';
import { Plus, ChevronRight, FileText, Settings, Trash2, Edit2, TrendingUp } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PDFService } from '../../services/PDFService';
import { useTranslation } from 'react-i18next';
import { businessApi } from '../../services/api';

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
  
  const { user: profile } = useAuth();
  const { t, i18n } = useTranslation();
  const [form] = Form.useForm();
  const [quoteForm] = Form.useForm();
  const { message } = App.useApp();

  const fetchRates = async () => {
    try {
      const response = await businessApi.getRates();
      setRates(response.data);
    } catch (e) {
      message.error(t('common.error') + ': Failed to load rates');
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await businessApi.getCustomers();
      setCustomers(response.data);
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
      if (editingRate) {
        await businessApi.updateRate(editingRate.id, values);
        message.success(t('common.success'));
      } else {
        await businessApi.createRate(values);
        message.success(t('common.success'));
      }
      setModalOpen(false);
      fetchRates();
    } catch (e: any) {
      message.error(t('common.error') + ': Operation failed');
    }
  };

  const handleFinalConfirm = async () => {
    if (!pendingQuotation) return;
    try {
      // Save Quotation to DB (do this first)
      await businessApi.createQuote(pendingQuotation);
      message.success(t('common.success'));
      setPreviewModalOpen(false);
      setSelectedRateIds([]);
      quoteForm.resetFields();
      setCustomPrices({});
    } catch (e: any) {
      message.error(t('common.error'));
    }

    // Generate printable quote (HTML-based, handles Chinese text correctly)
    try {
      const customer = customers.find(c => String(c.id) === String(pendingQuotation.customerId));
      const currentLang = i18n.language?.startsWith('zh') ? 'zh' : 'en';
      PDFService.printQuote(pendingQuotation, customer, profile, currentLang);
    } catch (e) {
      console.error('Print generation error:', e);
    }
  };

  const isAdmin = profile?.role?.toLowerCase() === 'admin';
  const isSimulation = !!localStorage.getItem('simulation_user');
  const isAgent = profile?.role?.toLowerCase() === 'business';
  
  const agentCustomer = (isAgent || (isAdmin && isSimulation)) 
    ? customers.find(c => c.name === (localStorage.getItem('simulation_user') || (isAgent ? (profile as any)?.companyName : ''))) 
    : null;

  // Tier-adjusted base price (logged-in user's tier × 0.5 CNY / 0.2 USD)
  const getTierAdjustedBase = (rate: FlightRate) => {
    const tier = profile?.tier || 0;
    const adj = (rate.currency === 'CNY' ? 0.5 : 0.2) * tier;
    return rate.baseFreight + adj;
  };

  const calculateFinalPrice = (rate: FlightRate) => {
    const tieredBase = getTierAdjustedBase(rate);
    const adjustedBase = adjustmentType === 'manual'
      ? (customPrices[rate.id] || tieredBase)
      : (adjustmentType === 'percent' ? tieredBase * (1 + adjustmentValue / 100) : tieredBase + adjustmentValue);

    const fuel = rate.fuelSurcharge || 0;
    const security = rate.securityScreening || 0;
    const terminal = rate.terminalHandling || 0;
    const formalCustoms = rate.customsMethods?.['formal'] || rate.customsClearance;
    const customsAmount = formalCustoms?.unit === 'per_kg' ? (formalCustoms?.amount || 0) : 0;
    const miscPerKgAmount = (rate.miscFees || []).reduce((sum, item) => item.unit === 'per_kg' ? sum + item.amount : sum, 0);

    return adjustedBase + fuel + security + terminal + customsAmount + miscPerKgAmount;
  };

  const getFlatFees = (rate: FlightRate) => {
    // Flat fees = per-shipment misc charges only (customs excluded — selected per booking)
    return (rate.miscFees || []).reduce((sum, item) => item.unit === 'per_shipment' ? sum + item.amount : sum, 0);
  };

  const handleOpenPreview = async (values: any) => {
    const selectedRates = rates.filter(r => selectedRateIds.includes(r.id));
    if (selectedRates.length === 0) return;

    let customer: Customer | undefined;
    let customerName = 'Walk-in Client';
    let recipientInfo = values.recipientInfo || '';

    if (isAgent) {
        customerName = values.manualCustomerName || 'Walk-in Client';
        recipientInfo = values.manualRecipientInfo || '';
    } else {
        customer = customers.find((c: Customer) => String(c.id) === String(values.customerId));
        customerName = customer?.name || 'Walk-in Client';
        recipientInfo = values.recipientInfo || '';
    }

    const quotationNo = `QT-${Date.now().toString().slice(-6)}`;
    
    const quotationData = {
      quotationNo,
      customerId: customer?.id || 0,
      customerName: customerName,
      recipientInfo: recipientInfo,
      routes: selectedRates.map(r => ({
        id: r.id,
        origin: r.origin,
        destination: r.destination,
        carrier: r.carrier,
        basePrice: getTierAdjustedBase(r),
        finalPrice: calculateFinalPrice(r),
        adjustment: adjustmentType === 'percent' ? `+${adjustmentValue}%` : 
                   adjustmentType === 'fixed' ? `+${adjustmentValue}` : 'Manual',
        fuel: r.fuelSurcharge,
        security: r.securityScreening,
        terminal: r.terminalHandling,
        customsMethods: r.customsMethods,
        miscFees: r.miscFees,
        flatFees: getFlatFees(r)
      })),
      currency: selectedRates[0].currency,
      validUntil: values.validUntil,
      status: 'sent',
      creatorId: profile?.id,
      userName: profile?.name || 'System User',
    };

    setPendingQuotation(quotationData);
    setQuoteModalOpen(false);
    setPreviewModalOpen(true);
  };

  return (
    <div className="p-6">
      {isAdmin && isSimulation && (
        <Alert
          message={
            <div className="flex justify-between items-center">
              <span>
                <strong>Simulation Mode:</strong> You are currently browsing as <strong>{localStorage.getItem('simulation_user')}</strong>.
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
      <div className="flex items-center justify-between mb-6">
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
                {t('common.add')}
            </Button>
          )}
          <Button 
            type={selectedRateIds.length > 0 ? "primary" : "default"}
            disabled={selectedRateIds.length === 0}
            size="large"
            icon={<FileText size={18} />}
            onClick={async () => { try { const res = await businessApi.getCustomers(); setCustomers(res.data); } catch {} setQuoteModalOpen(true); }}
            className={selectedRateIds.length > 0 ? "bg-orange-500 border-orange-500 hover:bg-orange-600" : ""}
          >
            {t('pricing.quote')} ({selectedRateIds.length})
          </Button>
        </Space>
      </div>

      <Card className="shadow-sm border-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <Space>
             <Text strong>{t('pricing.batchQuote')}:</Text>
             <Badge count={selectedRateIds.length} overflowCount={99} />
          </Space>
          {selectedRateIds.length > 0 && (
              <div className="bg-slate-50 px-4 py-2 rounded-lg border border-dashed border-slate-300 flex items-center gap-4">
                  <Text style={{ fontSize: 13 }}>{t('pricing.adjustment') || 'Adjustment'}:</Text>
                  <Select
                      size="small"
                      value={adjustmentType}
                      onChange={(v: any) => setAdjustmentType(v)}
                      options={[
                          { label: t('common.adjustPercent') || 'Percentage (+%)', value: 'percent' },
                          { label: t('common.adjustFixed') || 'Fixed Amount (+Value)', value: 'fixed' },
                          { label: t('common.adjustManual') || 'Manual Adjustment', value: 'manual' }
                      ]}
                      style={{ width: 160 }}
                  />
                  {adjustmentType !== 'manual' && (
                      <InputNumber 
                          size="small" 
                          value={adjustmentValue} 
                          onChange={(v: any) => setAdjustmentValue(v || 0)} 
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
          columns={[
            { 
              title: t('common.origin'), 
              render: (_, r) => (
                  <div className="flex items-center gap-2">
                    <Tag color="blue">{r.origin}</Tag>
                    <ChevronRight size={14} className="text-slate-300" />
                    <Tag color="indigo">{r.destination}</Tag>
                  </div>
              )
            },
            { 
              title: t('common.carrier'), 
              render: (_, r) => (
                <div>
                  <div className="font-bold text-slate-700">{r.carrier}</div>
                  <div className="text-[10px] text-slate-400">{r.flightNo} - {r.aircraftType}</div>
                </div>
              )
            },
            {
              title: t('pricing.baseFreight') || 'Base Price',
              render: (_, r) => {
                const tieredBase = getTierAdjustedBase(r);
                return <span className="font-mono font-bold text-slate-700">{r.currency} {tieredBase.toFixed(2)}</span>;
              }
            },
            {
              title: t('pricing.finalPrice') || 'Final Price',
              render: (_, r) => {
                  const finalPrice = calculateFinalPrice(r);
                  const formalCustoms = r.customsMethods?.['formal'] || r.customsClearance;
                  const customsAmount = formalCustoms?.unit === 'per_kg' ? (formalCustoms?.amount || 0) : 0;
                  const miscPerKgAmount = (r.miscFees || []).reduce((sum, item) =>
                    item.unit === 'per_kg' ? sum + item.amount : sum, 0);
                  const tieredBase = getTierAdjustedBase(r);
                  const adjustedBase = adjustmentType === 'manual'
                    ? (customPrices[r.id] || tieredBase)
                    : (adjustmentType === 'percent' ? tieredBase * (1 + adjustmentValue / 100) : tieredBase + adjustmentValue);
                  const adjDiff = adjustedBase - tieredBase;

                  const breakdown = (
                    <div className="text-xs space-y-1" style={{ minWidth: 200 }}>
                      <div className="flex justify-between gap-4"><span>Base:</span><span className="font-mono">{tieredBase.toFixed(2)}</span></div>
                      {adjDiff !== 0 && <div className="flex justify-between gap-4 text-orange-600"><span>Adjust ({adjustmentType}):</span><span className="font-mono">{adjDiff > 0 ? '+' : ''}{adjDiff.toFixed(2)}</span></div>}
                      <div className="flex justify-between gap-4 font-bold text-blue-700 border-b pb-1 mb-1"><span>Adj. Base:</span><span className="font-mono">{adjustedBase.toFixed(2)}</span></div>
                      {r.fuelSurcharge > 0 && <div className="flex justify-between gap-4 text-slate-500"><span>Fuel:</span><span className="font-mono">+{r.fuelSurcharge.toFixed(2)}</span></div>}
                      {r.securityScreening > 0 && <div className="flex justify-between gap-4 text-slate-500"><span>Security:</span><span className="font-mono">+{r.securityScreening.toFixed(2)}</span></div>}
                      {r.terminalHandling > 0 && <div className="flex justify-between gap-4 text-slate-500"><span>Terminal:</span><span className="font-mono">+{r.terminalHandling.toFixed(2)}</span></div>}
                      {customsAmount > 0 && <div className="flex justify-between gap-4 text-slate-500"><span>Customs (KG):</span><span className="font-mono">+{customsAmount.toFixed(2)}</span></div>}
                      {miscPerKgAmount > 0 && <div className="flex justify-between gap-4 text-slate-500"><span>Misc (KG):</span><span className="font-mono">+{miscPerKgAmount.toFixed(2)}</span></div>}
                      <div className="border-t pt-1 flex justify-between font-bold text-blue-600"><span>Total / KG:</span><span className="font-mono">{finalPrice.toFixed(2)}</span></div>
                    </div>
                  );

                  const flatFees = getFlatFees(r);
                  const flatBreakdown = flatFees > 0 ? (
                    <div className="text-xs space-y-1" style={{ minWidth: 180 }}>
                      <div className="font-bold text-amber-700 mb-1">Per-Shipment Charges</div>
                      {(r.miscFees || []).filter((m: any) => m.unit === 'per_shipment').map((m: any, i: number) => (
                        <div key={i} className="flex justify-between gap-4"><span>{m.name}:</span><span className="font-mono">{r.currency} {Number(m.amount).toFixed(2)}</span></div>
                      ))}
                      <div className="border-t pt-1 flex justify-between font-bold text-amber-700"><span>Total Flat:</span><span className="font-mono">{r.currency} {flatFees.toFixed(2)}</span></div>
                    </div>
                  ) : null;

                  return (
                      <div className="flex flex-col">
                        {adjustmentType === 'manual' && selectedRateIds.includes(r.id) ? (
                          <InputNumber size="small" min={tieredBase} style={{ width: 120 }}
                            value={customPrices[r.id] || tieredBase}
                            status={(customPrices[r.id] || 0) < tieredBase ? 'error' : undefined}
                            onChange={(v) => v !== null && setCustomPrices(prev => ({ ...prev, [r.id]: v || 0 }))}
                            formatter={value => `${r.currency} ${value}`} />
                        ) : (
                          <Popover content={breakdown} title="Price Breakdown" trigger="hover">
                            <span className="text-sm font-bold text-blue-600 cursor-help border-b border-dotted border-blue-300">
                              {r.currency} {finalPrice.toFixed(2)} / KG
                            </span>
                          </Popover>
                        )}
                          {flatFees > 0 && flatBreakdown && (
                            <Popover content={flatBreakdown} title="Flat Fee Breakdown" trigger="hover">
                              <span className="text-[10px] text-amber-600 font-bold cursor-help border-b border-dotted border-amber-300">
                                + {r.currency} {flatFees.toFixed(2)} (Flat)
                              </span>
                            </Popover>
                          )}
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
                          await businessApi.deleteRate(r.id);
                          fetchRates();
                      }} />
                  </Space>
              ) : null
            }
          ]}
        />
      </Card>

      <Modal
        title={editingRate ? t('common.edit') : t('common.add')}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateOrUpdate}>
          <Row gutter={16}>
             <Col span={6}><Form.Item name="origin" label={t('common.origin')||'Origin'} rules={[{ required: true }]}><Input /></Form.Item></Col>
             <Col span={6}><Form.Item name="destination" label={t('common.destination')||'Destination'} rules={[{ required: true }]}><Input /></Form.Item></Col>
             <Col span={6}><Form.Item name="carrier" label={t('common.carrier')||'Carrier'} rules={[{ required: true }]}><Input /></Form.Item></Col>
             <Col span={6}><Form.Item name="region" label={t('common.region')||'Region'} initialValue="AsiaPacific"><Select options={[{label:'AsiaPacific',value:'AsiaPacific'},{label:'Americas',value:'Americas'},{label:'Europe',value:'Europe'},{label:'MESA',value:'MESA'},{label:'Africa',value:'Africa'}]} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
             <Col span={6}><Form.Item name="flightNo" label={t('pricing.flightNo')||'Flight No'}><Input /></Form.Item></Col>
             <Col span={6}><Form.Item name="aircraftType" label={t('pricing.aircraft')||'Aircraft'}><Input /></Form.Item></Col>
             <Col span={6}>
               <style>{`.sched-wrap .ant-checkbox-group-item:nth-child(7){flex:0 0 100%}`}</style>
               <Form.Item name="schedule"
                 label={<div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',width:'100%',gap:8}}>
                   <span>{t('pricing.schedule')||'Schedule'}</span>
                   <span style={{fontSize:10,color:'#94a3b8',whiteSpace:'nowrap',lineHeight:'22px'}}>1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat 7=Sun</span>
                 </div>}
                 getValueFromEvent={(val) => (val||[]).sort().join(',')}
                 getValueProps={(v) => ({ value: v ? v.split(',').filter(Boolean).map(Number) : [] })}>
                 <div className="sched-wrap">
                   <Checkbox.Group style={{display:'flex',flexWrap:'wrap',gap:'2px 6px',maxWidth:400}}
                     options={[
                       { label: '1', value: 1 }, { label: '2', value: 2 },
                       { label: '3', value: 3 }, { label: '4', value: 4 },
                       { label: '5', value: 5 }, { label: '6', value: 6 },
                       { label: '7', value: 7 },
                     ]} />
                 </div>
               </Form.Item>
             </Col><Col span={6}><Form.Item name="currency" label={t('common.currency')||'Currency'} initialValue="CNY"><Select options={[{label:'CNY',value:'CNY'},{label:'USD',value:'USD'}]} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
             <Col span={6}><Form.Item name="baseFreight" label="Base Price (/KG)" rules={[{ required: true }]}><InputNumber className="w-full" min={0} precision={2} /></Form.Item></Col>
             <Col span={6}><Form.Item name="fuelSurcharge" label="Fuel (/KG)" initialValue={0}><InputNumber className="w-full" min={0} precision={2} /></Form.Item></Col>
             <Col span={6}><Form.Item name="securityScreening" label="Security (/KG)" initialValue={0}><InputNumber className="w-full" min={0} precision={2} /></Form.Item></Col>
             <Col span={6}><Form.Item name="terminalHandling" label="Terminal (/KG)" initialValue={0}><InputNumber className="w-full" min={0} precision={2} /></Form.Item></Col>
          </Row>

          <Title level={5} className="mb-2 mt-6 text-slate-700">{t('pricing.customs')}</Title>
          <Row gutter={12}>
            {['formal', '9610', '9710', '9810'].map((method) => (
              <Col span={6} key={method}>
                <Card size="small" title={method.toUpperCase()} className="bg-slate-50">
                  <Form.Item label={t('common.amount')} name={['customsMethods', method, 'amount']} initialValue={0}>
                    <InputNumber className="w-full" />
                  </Form.Item>
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
                    <Form.Item {...restField} name={[name, 'name']} rules={[{ required: true, message: 'Fee Name required' }]}>
                      <Input placeholder="Internal Handling, etc." />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'amount']} rules={[{ required: true }]}>
                      <InputNumber placeholder="Amount" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'unit']} initialValue="per_shipment">
                      <Select style={{ width: 120 }} options={[{label: t('pricing.perKg'), value:'per_kg'}, {label: t('pricing.perShipment'), value:'per_shipment'}]} />
                    </Form.Item>
                    <Trash2 size={16} className="text-red-500 cursor-pointer" onClick={() => remove(name)} />
                  </Space>
                ))}
                <Button type="dashed" onClick={() => add()} block icon={<Plus size={14} />}>
                  {t('common.add')} Misc Charge
                </Button>
              </div>
            )}
          </Form.List>
        </Form>
      </Modal>

      <Modal
        title={t('pricing.quote')}
        open={quoteModalOpen}
        onCancel={() => setQuoteModalOpen(false)}
        onOk={() => quoteForm.submit()}
      >
        <Form form={quoteForm} layout="vertical" onFinish={handleOpenPreview}>
          {isAgent ? (
            <Form.Item name="manualCustomerName" label="Customer Name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          ) : (
            <Form.Item name="customerId" label={t('common.customer')||'Select Customer'} rules={[{ required: true }]}>
              <Select
                showSearch
                placeholder={t('common.search') + '...'}
                optionFilterProp="label"
                options={customers.map(c => ({ label: `${c.code} - ${c.name}`, value: c.id }))}
              />
            </Form.Item>
          )}
          <Form.Item name="recipientInfo" label={t('pricing.recipient')||'Recipient Info'}>
             <Input.TextArea rows={3} placeholder={t('common.name')+', '+t('common.phone')+'...'} />
          </Form.Item>
          <Form.Item name="validUntil" label={t('pricing.validUntil')||'Valid Until'} initialValue={new Date(Date.now() + 7*24*60*60*1000).toISOString().split('T')[0]}>
             <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title={
          <div className="flex items-center gap-2">
            <TrendingUp size={20} className="text-blue-500" />
            <span>{t('pricing.preview') || 'Quotation Preview'}</span>
          </div>
        }
        open={previewModalOpen}
        onCancel={() => setPreviewModalOpen(false)}
        onOk={handleFinalConfirm}
        okText={t('pricing.confirmDownload') || 'Confirm & Download'}
        width={750}
      >
        {pendingQuotation && (
          <div className="space-y-4">
             <div className="flex justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                   <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider">{t('pricing.proposalFor') || 'Proposal For'}</Text>
                   <Text strong className="text-lg">{pendingQuotation.customerName}</Text>
                   <div className="mt-1">
                      <Text type="secondary" className="block whitespace-pre-wrap">{pendingQuotation.recipientInfo}</Text>
                   </div>
                </div>
                <div className="text-right">
                   <Text type="secondary" className="block text-[10px] uppercase font-bold tracking-wider">{t('quotes.quoteNo') || 'Quote No'}</Text>
                   <Text strong className="text-blue-600 font-mono italic">{pendingQuotation.quotationNo}</Text>
                   <div className="mt-2 text-[11px] text-slate-500">
                      {t('pricing.validUntil') || 'Valid Until'}: {pendingQuotation.validUntil}
                   </div>
                </div>
             </div>

             <Table
                dataSource={pendingQuotation.routes}
                rowKey="id"
                pagination={false}
                size="small"
                columns={[
                  { title: t('common.origin'), dataIndex: 'origin', className: 'font-mono' },
                  { title: t('common.destination'), dataIndex: 'destination', className: 'font-mono' },
                  { title: t('common.carrier'), dataIndex: 'carrier', className: 'font-bold' },
                  { title: t('pricing.baseFreight') || 'Base Price', dataIndex: 'basePrice', render: (v: number) => `${pendingQuotation.currency} ${v}` },
                  {
                    title: t('pricing.finalPrice') || 'Final Price',
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
                  {t('pricing.pdfNote') || 'Your company logo and contact details will be embedded in the final PDF.'}
                </Text>
             </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
