import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Card, Tag, Input, Typography, Tabs, Badge, Row, Col, Statistic, Modal, Form, Select, DatePicker, InputNumber, App } from 'antd';
import { Plane, Search, Filter, Info, Clock, Package, FileText, Play, ShieldCheck } from 'lucide-react';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

export const OperationModule: React.FC = () => {
  const [mawbs, setMawbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');
  const { t } = useTranslation();
  const { message, modal } = App.useApp();

  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const [customsModalOpen, setCustomsModalOpen] = useState(false);
  const [terminalModalOpen, setTerminalModalOpen] = useState(false);
  const [selectedMawb, setSelectedMawb] = useState<any>(null);
  const [form] = Form.useForm();

  const fetchMawbs = async () => {
    setLoading(true);
    try {
      const response = await api.get('/operation/mawbs');
      setMawbs(response.data);
    } catch (e) {
      setMawbs([
        { id: 1, mawbNo: '999-12345678', origin: 'PVG', destination: 'FRA', status: 'warehouse_in', weight: 540, pieces: 12, lastUpdated: '2025-05-01' },
        { id: 2, mawbNo: '160-87654321', origin: 'HKG', destination: 'LHR', status: 'booked', weight: 1200, pieces: 45, lastUpdated: '2025-05-02' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMawbs();
  }, []);

  const handleUpdateStatus = async (mawb: any, nextStatus: string, values: any = {}) => {
    try {
      await api.post(`/operation/mawbs/${mawb.id}/status`, {
        status: nextStatus,
        ...values
      });
      message.success(t('common.success'));
      setWarehouseModalOpen(false);
      setCustomsModalOpen(false);
      setTerminalModalOpen(false);
      fetchMawbs();
    } catch (e) {
      message.error(t('common.error'));
    }
  };

  const handleNextStep = (record: any) => {
    setSelectedMawb(record);
    form.resetFields();
    if (record.status === 'booked' || record.status === 'confirmed') {
      setWarehouseModalOpen(true);
    } else if (record.status === 'warehouse_in') {
      setCustomsModalOpen(true);
    } else if (record.status === 'customs') {
      setTerminalModalOpen(true);
    } else if (record.status === 'terminal_in') {
      modal.confirm({
        title: 'Confirm Departure',
        content: `Confirm actual departure for ${record.mawbNo}?`,
        onOk: () => handleUpdateStatus(record, 'departed')
      });
    } else if (record.status === 'departed') {
       modal.confirm({
        title: 'Confirm Arrival',
        content: `Confirm actual arrival for ${record.mawbNo}?`,
        onOk: () => handleUpdateStatus(record, 'arrived')
      });
    } else if (record.status === 'arrived') {
       modal.confirm({
        title: t('operation.financeSettlement'),
        content: 'Close this operation and transfer to Finance?',
        onOk: () => handleUpdateStatus(record, 'closed')
      });
    }
  };

  const statusMap: Record<string, { color: string; label: string }> = {
    booked: { color: 'gold', label: 'Booked' },
    warehouse_in: { color: 'cyan', label: 'Warehouse In' },
    customs: { color: 'geekblue', label: 'Customs Clear' },
    terminal_in: { color: 'purple', label: 'Terminal In' },
    departed: { color: 'blue', label: 'Departed' },
    arrived: { color: 'green', label: 'Arrived' },
    closed: { color: 'default', label: 'Closed' },
  };

  const columns = [
    { 
      title: t('operation.mawbRef'), 
      dataIndex: 'mawbNo', 
      key: 'mawbNo',
      render: (text: string) => (
        <div className="flex flex-col">
          <Text className="font-mono font-bold text-blue-600">{text}</Text>
          <Text type="secondary" className="text-[10px]">Updated: {dayjs().format('MM-DD')}</Text>
        </div>
      )
    },
    { 
      title: t('operation.route'), 
      key: 'route',
      render: (_: any, r: any) => <Tag className="bg-slate-50 border-slate-200">{r.origin} → {r.destination}</Tag>
    },
    { 
      title: t('operation.status'), 
      dataIndex: 'status', 
      key: 'status',
      render: (status: string) => (
        <Tag color={statusMap[status]?.color} className="capitalize px-3 rounded-full">
          {statusMap[status]?.label || status}
        </Tag>
      )
    },
    { 
      title: 'Cargo Info', 
      key: 'cargo',
      render: (_: any, r: any) => (
        <div className="text-xs">
          <Text className="block font-medium">{r.weight} kg</Text>
          <Text type="secondary">{r.pieces} pcs</Text>
        </div>
      )
    },
    {
      title: t('operation.nextStep'),
      key: 'action',
      render: (_: any, record: any) => {
        if (record.status === 'closed') return <Badge status="default" text="Operation Finished" />;
        return (
          <Button 
            type="primary" 
            size="small" 
            className="bg-blue-600 text-[10px] h-7 flex items-center gap-1"
            onClick={() => handleNextStep(record)}
          >
            Process <Play size={10} fill="currentColor" />
          </Button>
        );
      }
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Title level={3}>{t('operation.title')}</Title>
          <Text type="secondary">{t('operation.subtitle')}</Text>
        </div>
        <Space>
           <Input 
            prefix={<Search size={16} className="text-slate-400" />} 
            placeholder={t('operation.searchPlaceholder')} 
            className="w-64"
          />
          <Button icon={<Filter size={16} />}>Filter</Button>
        </Space>
      </div>

      <Row gutter={20}>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-blue-50">
            <Statistic title="Active Flights" value={mawbs.filter(m => m.status !== 'closed').length} prefix={<Plane size={18} className="mr-2 text-blue-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-purple-50">
            <Statistic title="In Customs" value={mawbs.filter(m => m.status === 'customs').length} prefix={<ShieldCheck size={18} className="mr-2 text-purple-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-cyan-50">
            <Statistic title="In Warehouse" value={mawbs.filter(m => m.status === 'warehouse_in').length} prefix={<Package size={18} className="mr-2 text-cyan-600" />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card className="shadow-sm border-none bg-amber-50">
            <Statistic title="Booked (Pending)" value={mawbs.filter(m => m.status === 'booked').length} prefix={<Clock size={18} className="mr-2 text-amber-600" />} />
          </Card>
        </Col>
      </Row>

      <Card className="shadow-sm">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            { 
              key: 'active', 
              label: <Badge count={mawbs.filter(m => m.status !== 'closed').length} offset={[10, 0]}><span>{t('operation.activeShipments')}</span></Badge>,
              children: <Table dataSource={mawbs.filter(m => m.status !== 'closed')} columns={columns} pagination={{ pageSize: 10 }} loading={loading} rowKey="id" />
            },
            { 
              key: 'closed', 
              label: t('operation.finishedRequests'),
              children: <Table dataSource={mawbs.filter(m => m.status === 'closed')} columns={columns} pagination={{ pageSize: 10 }} loading={loading} rowKey="id" />
            }
          ]}
        />
      </Card>

      <Modal 
        title="Step 1: Warehouse Entry Verification" 
        open={warehouseModalOpen} 
        onCancel={() => setWarehouseModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(v) => handleUpdateStatus(selectedMawb, 'warehouse_in', v)}>
           <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="grossWeight" label="Actual Gross Weight (KG)" rules={[{ required: true }]}><InputNumber className="w-full" /></Form.Item>
              </Col>
              <Col span={12}>
                 <Form.Item name="chargeableWeight" label="Chargeable Weight (KG)" rules={[{ required: true }]}><InputNumber className="w-full" /></Form.Item>
              </Col>
           </Row>
           <Form.Item name="warehouseId" label="Assign Warehouse"><Select options={[{ label: 'Main Hub PVG', value: 'PVG-01' }]} /></Form.Item>
           <Form.Item name="remark" label="Warehouse Remark"><Input.TextArea /></Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="Step 2: Customs Clearance" 
        open={customsModalOpen} 
        onCancel={() => setCustomsModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(v) => handleUpdateStatus(selectedMawb, 'customs', v)}>
           <Form.Item name="customsNo" label="Customs Declaration No."><Input /></Form.Item>
           <Form.Item name="status" label="Customs Status" initialValue="cleared"><Select options={[{label:'Cleared', value:'cleared'}, {label:'Inspecting', value:'inspecting'}]} /></Form.Item>
           <Form.Item label="Upload Released Docs"><Button icon={<FileText size={14}/>}>Select Files</Button></Form.Item>
        </Form>
      </Modal>

      <Modal 
        title="Step 3: Cargo Terminal (T1)" 
        open={terminalModalOpen} 
        onCancel={() => setTerminalModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(v) => handleUpdateStatus(selectedMawb, 'terminal_in', v)}>
           <Form.Item name="terminalEntryTime" label="Terminal Entry Time" initialValue={dayjs()}><DatePicker showTime className="w-full" /></Form.Item>
           <Form.Item name="remark" label="Terminal Remark"><Input.TextArea /></Form.Item>
           <div className="p-3 bg-blue-50 rounded border border-blue-100 flex gap-2">
              <Info size={16} className="text-blue-500 mt-1" />
              <Text type="secondary" className="text-xs">Cargo is moved to the flight terminal after customs clearance. Carrier will take over from here.</Text>
           </div>
        </Form>
      </Modal>
    </div>
  );
};
