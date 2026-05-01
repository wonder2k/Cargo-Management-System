import React, { useState, useEffect } from 'react';
import { Tabs, Card, Typography, Badge, Row, Col, Statistic, Button, Table, Tag, Space, Modal, Form, Input, Select, InputNumber, DatePicker, App } from 'antd';
import { Coins, Globe, Briefcase, Plus, Search, Filter, TrendingUp, Users, FilePlus, Package, Plane, CheckCircle2, History, Trash2, Edit2 } from 'lucide-react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

export const BusinessModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState('rates');
  const location = useLocation();
  const { t } = useTranslation();
  const { message } = App.useApp();

  useEffect(() => {
    if (location.pathname.includes('/rates')) setActiveTab('rates');
    else if (location.pathname.includes('/quotes')) setActiveTab('quotes');
    else if (location.pathname.includes('/bookings')) setActiveTab('bookings');
    else if (location.pathname.includes('/customers')) setActiveTab('crm');
    else if (location.pathname.includes('/business')) setActiveTab('rates');
  }, [location]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>Sales & Business Center</Title>
          <Text type="secondary">Manage pricing, quotations and air cargo bookings</Text>
        </div>
      </div>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title="Total Revenue" value={245000} prefix={<TrendingUp size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-green-50">
            <Statistic title="Active Quotes" value={18} prefix={<Globe size={18} className="mr-2 text-green-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-purple-50">
            <Statistic title="Confirmed Bookings" value={12} prefix={<Briefcase size={18} className="mr-2 text-purple-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-indigo-50">
            <Statistic title="CRM Clients" value={45} prefix={<Users size={18} className="mr-2 text-indigo-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'rates',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Coins size={16} /> <span>Rates Cabinet</span>
                </div>
              ),
              children: <RatesTab />
            },
            {
              key: 'quotes',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Globe size={16} /> <span>Quote History</span>
                </div>
              ),
              children: <QuoteHistoryTab />
            },
            {
              key: 'bookings',
              label: (
                <div className="flex items-center gap-2 px-4 py-2">
                  <Briefcase size={16} /> <span>Air Bookings</span>
                </div>
              ),
              children: <BookingsTab />
            },
            {
               key: 'crm',
               label: (
                 <div className="flex items-center gap-2 px-4 py-2">
                   <Users size={16} /> <span>Customer CRM</span>
                 </div>
               ),
               children: <CustomerCRMTab />
            }
          ]}
        />
      </Card>
    </div>
  );
};

const BookingsTab = () => {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const { message } = App.useApp();

    const fetchBookings = async () => {
        setLoading(true);
        try {
            const res = await api.get('/business/bookings');
            setBookings(res.data);
        } catch (e) {
            setBookings([
                { id: 1, bookingNo: 'BK-10023', customerName: 'Huawei', origin: 'PVG', destination: 'FRA', status: 'pending', pieces: 10, weight: 120, createdAt: new Date().toISOString() },
                { id: 2, bookingNo: 'BK-10024', customerName: 'Xiaomi', origin: 'HKG', destination: 'LHR', status: 'confirmed', pieces: 5, weight: 45, createdAt: new Date().toISOString() },
            ]);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchBookings(); }, []);

    const handleCreate = async (v: any) => {
        try {
            await api.post('/business/bookings', { ...v, flightDate: v.flightDate.toISOString() });
            message.success(t('common.success'));
            setModalOpen(false);
            fetchBookings();
        } catch (e) { message.error(t('common.error')); }
    };

    const columns = [
        { title: 'Booking No', dataIndex: 'bookingNo', render: (t: string) => <Text className="font-mono font-bold text-blue-600">{t}</Text> },
        { title: 'Customer', dataIndex: 'customerName' },
        { title: 'Route', render: (_: any, r: any) => `${r.origin} → ${r.destination}` },
        { title: 'Cargo', render: (_: any, r: any) => `${r.pieces} pcs / ${r.weight} kg` },
        { title: 'Status', dataIndex: 'status', render: (s: string) => <Tag color={s === 'confirmed' ? 'green' : 'orange'}>{s.toUpperCase()}</Tag> },
        { title: 'Action', render: () => <Button size="small">Edit</Button> }
    ];

    return (
        <div className="space-y-4">
            <div className="flex justify-end"><Button type="primary" icon={<FilePlus size={16} />} onClick={() => setModalOpen(true)}>New Booking</Button></div>
            <Table dataSource={bookings} columns={columns} loading={loading} rowKey="id" />
            <Modal title="Create New Booking" open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={600}>
                <Form form={form} layout="vertical" onFinish={handleCreate}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="customerId" label="Customer" rules={[{ required: true }]}><Select placeholder="Select Customer" options={[{label:'Huawei (HW)', value: 1}]} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="rateId" label="Select Rate" rules={[{ required: true }]}><Select placeholder="Select Pre-negotiated Rate" options={[{label:'PVG-FRA (CA)', value: 1}]} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                         <Col span={8}><Form.Item name="pieces" label="Pieces" initialValue={1}><InputNumber className="w-full" /></Form.Item></Col>
                         <Col span={8}><Form.Item name="weight" label="Weight (KG)"><InputNumber className="w-full" /></Form.Item></Col>
                         <Col span={8}><Form.Item name="flightDate" label="Flight Date"><DatePicker className="w-full" /></Form.Item></Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    )
}

const RatesTab = () => {
    const [rates, setRates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRate, setEditingRate] = useState<any>(null);
    const [form] = Form.useForm();
    const { t } = useTranslation();
    const { message } = App.useApp();

    const fetchRates = async () => {
        setLoading(true);
        try {
            const res = await api.get('/business/rates');
            setRates(res.data);
        } catch (e) {
            setRates([
                { id: 1, origin: 'PVG', destination: 'FRA', carrier: 'CA', basePrice: 12.5, currency: 'CNY' },
                { id: 2, origin: 'SZX', destination: 'ORD', carrier: 'CX', basePrice: 18.4, currency: 'CNY' },
            ]);
        } finally { setLoading(false); }
    }

    useEffect(() => { fetchRates(); }, []);

    const handleSave = async (v: any) => {
        try {
            if (editingRate) await api.put(`/business/rates/${editingRate.id}`, v);
            else await api.post('/business/rates', v);
            message.success(t('common.success'));
            setModalOpen(false);
            fetchRates();
        } catch (e) { message.error(t('common.error')); }
    };

    const columns = [
        { title: 'Origin', dataIndex: 'origin', render: (t: string) => <Tag color="blue">{t}</Tag> },
        { title: 'Dest', dataIndex: 'destination', render: (t: string) => <Tag color="indigo">{t}</Tag> },
        { title: 'Carrier', dataIndex: 'carrier', render: (t: string) => <span className="font-bold">{t}</span> },
        { title: 'Base Price', dataIndex: 'basePrice', render: (v: number, r: any) => `${r.currency} ${v}/KG` },
        { title: 'Action', render: (_: any, r: any) => (
            <Space>
                <Button size="small" type="text" icon={<Edit2 size={14} />} onClick={() => { setEditingRate(r); form.setFieldsValue(r); setModalOpen(true); }} />
                <Button size="small" type="text" danger icon={<Trash2 size={14} />} />
            </Space>
        )}
    ];

    return (
        <div className="space-y-4">
             <div className="flex justify-end"><Button type="primary" icon={<Plus size={16} />} onClick={() => { setEditingRate(null); form.resetFields(); setModalOpen(true); }}>Add Rate</Button></div>
             <Table dataSource={rates} columns={columns} loading={loading} rowKey="id" />
             <Modal title={editingRate ? "Edit Rate" : "Add New Rate"} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={500}>
                 <Form form={form} layout="vertical" onFinish={handleSave}>
                     <Row gutter={12}>
                        <Col span={12}><Form.Item name="origin" label="Origin"><Input placeholder="PVG" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="destination" label="Destination"><Input placeholder="FRA" /></Form.Item></Col>
                     </Row>
                     <Row gutter={12}>
                        <Col span={12}><Form.Item name="carrier" label="Carrier"><Input placeholder="CA" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="basePrice" label="Base Price"><InputNumber className="w-full" /></Form.Item></Col>
                     </Row>
                 </Form>
             </Modal>
        </div>
    )
}

const QuoteHistoryTab = () => (
    <div className="py-10">
        <Input prefix={<Search size={16}/>} placeholder="Search Quotes..." className="mb-4 w-64" />
        <Table 
            dataSource={[
                { id: 1, quoteNo: 'QT-2025001', customer: 'Huawei', routes: 'PVG-FRA', amount: 8540, status: 'sent', date: '2025-05-01' },
            ]}
            columns={[
                { title: 'Quote No', dataIndex: 'quoteNo', render: (t: string) => <Text className="font-mono font-bold text-blue-600">{t}</Text> },
                { title: 'Customer', dataIndex: 'customer' },
                { title: 'Amount', dataIndex: 'amount' },
                { title: 'Status', dataIndex: 'status', render: (s) => <Tag color="blue">{s.toUpperCase()}</Tag> },
                { title: 'Date', dataIndex: 'date' }
            ]}
        />
    </div>
);

const CustomerCRMTab = () => {
    const [customers, setCustomers] = useState([]);
    useEffect(() => {
        api.get('/business/customers').then(res => setCustomers(res.data)).catch(() => {
            setCustomers([{ id: 1, name: 'Huawei Logistics', code: 'HW', contact: 'Mr. Zhang', phone: '138...' }]);
        });
    }, []);
    return (
        <Table 
            dataSource={customers}
            columns={[
                { title: 'Code', dataIndex: 'code', render: (t) => <Text strong>{t}</Text> },
                { title: 'Full Name', dataIndex: 'name' },
                { title: 'Contact', dataIndex: 'contact' },
                { title: 'Phone', dataIndex: 'phone' },
                { title: 'Action', render: () => <Button type="link">Details</Button> }
            ]}
        />
    )
}

