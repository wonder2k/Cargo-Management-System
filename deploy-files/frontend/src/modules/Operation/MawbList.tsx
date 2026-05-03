import React, { useEffect, useState } from 'react';
import { Table, Button, Card, Tag, Drawer, Steps, Form, Input, Select, App, Space, Typography, Row, Col, Modal, Tabs, Statistic, Badge, InputNumber, Divider } from 'antd';
import { MAWB, MawbStatus, Booking } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { Plus, Search, FileText, Package, ChevronRight, ExternalLink, Play } from 'lucide-react';
import dayjs from 'dayjs';
import { useTranslation } from 'react-i18next';
import { operationApi, businessApi } from '../../services/api';

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
];

export const MawbList: React.FC = () => {
  const [mawbs, setMawbs] = useState<MAWB[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedMawb, setSelectedMawb] = useState<MAWB | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  
  const { user: profile } = useAuth();
  const { t } = useTranslation();
  const { message } = App.useApp();
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await operationApi.getMawbs();
      setMawbs(response.data);
    } catch (e) {
      message.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateStatus = async (values: any) => {
    if (!selectedMawb) return;
    try {
      await operationApi.updateMawb(selectedMawb.id, values);
      message.success(t('common.success'));
      setStatusModalOpen(false);
      fetchData();
    } catch (e) {
      message.error(t('common.error'));
    }
  };

  const filteredMawbs = mawbs.filter(m => 
    String(m.mawbNo).toLowerCase().includes(searchText.toLowerCase()) ||
    String(m.origin).toLowerCase().includes(searchText.toLowerCase()) ||
    String(m.destination).toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('operation.title')}</Title>
          <Text type="secondary">Monitor and control air shipments</Text>
        </div>
        <Input 
          prefix={<Search size={16} className="text-slate-400" />}
          placeholder="Search MAWB..."
          className="w-64"
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <Card className="shadow-sm border-slate-200">
        <Table 
          dataSource={filteredMawbs} 
          loading={loading} 
          rowKey="id"
          columns={[
            { 
              title: 'MAWB No.', 
              render: (r: MAWB) => (
                <div className="flex flex-col cursor-pointer" onClick={() => { setSelectedMawb(r); setDrawerOpen(true); }}>
                  <span className="text-sm font-mono font-bold text-blue-600">{r.mawbNo}</span>
                  <p className="text-[10px] text-slate-400">{r.carrier || '--'}</p>
                </div>
              )
            },
            { 
              title: 'Route', 
              render: (r: MAWB) => (
                <Tag color="blue">{r.origin} → {r.destination}</Tag>
              )
            },
            { 
              title: 'Status', 
              dataIndex: 'status',
              render: (status: MawbStatus) => {
                const s = MAWB_STATUSES.find(x => x.value === status);
                return <Tag color={s?.color}>{t(s?.labelKey || status)}</Tag>;
              }
            },
            {
              title: 'Cargo',
              render: (r: MAWB) => (
                <div className="text-xs">
                   {r.pieces || 0} PCS / {r.weight || 0} KG
                </div>
              )
            },
            { 
              title: 'Actions', 
              align: 'right',
              render: (r: MAWB) => (
                <Space>
                  <Button 
                    type="primary" 
                    size="small" 
                    icon={<Play size={10} />} 
                    className="flex items-center gap-1"
                    onClick={() => {
                        setSelectedMawb(r);
                        form.setFieldsValue({ status: r.status });
                        setStatusModalOpen(true);
                    }}
                  >
                    Update
                  </Button>
                </Space>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="Update MAWB Status"
        open={statusModalOpen}
        onCancel={() => setStatusModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleUpdateStatus}>
          <Form.Item name="status" label="New Status" rules={[{ required: true }]}>
            <Select options={MAWB_STATUSES.map(s => ({ label: t(s.labelKey), value: s.value }))} />
          </Form.Item>
          <Form.Item name="remarks" label="Remarks">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Row gutter={16}>
             <Col span={12}>
                <Form.Item name="weight" label="Actual Weight (KG)">
                   <InputNumber className="w-full" />
                </Form.Item>
             </Col>
             <Col span={12}>
                <Form.Item name="chargeableWeight" label="Chargeable Weight (KG)">
                   <InputNumber className="w-full" />
                </Form.Item>
             </Col>
          </Row>
        </Form>
      </Modal>

      <Drawer
         title={<span className="font-mono">{selectedMawb?.mawbNo}</span>}
         open={drawerOpen}
         onClose={() => setDrawerOpen(false)}
         width={500}
       >
         {selectedMawb && (
            <div className="space-y-6">
               <Card size="small" className="bg-slate-50">
                  <Row gutter={[16, 16]}>
                     <Col span={12}><Text type="secondary">Origin:</Text> <div className="font-bold">{selectedMawb.origin}</div></Col>
                     <Col span={12}><Text type="secondary">Destination:</Text> <div className="font-bold">{selectedMawb.destination}</div></Col>
                     <Col span={12}><Text type="secondary">Carrier:</Text> <div className="font-bold">{selectedMawb.carrier}</div></Col>
                     <Col span={12}><Text type="secondary">Status:</Text> <div>{t(MAWB_STATUSES.find(s => s.value === selectedMawb.status)?.labelKey || selectedMawb.status)}</div></Col>
                  </Row>
               </Card>
               
               <Divider>Shipment Details</Divider>
               <Row gutter={[16, 16]}>
                  <Col span={12}><Statistic title="Actual Weight" value={selectedMawb.weight || 0} suffix="KG" /></Col>
                  <Col span={12}><Statistic title="Chargeable Weight" value={selectedMawb.chargeableWeight || 0} suffix="KG" /></Col>
               </Row>
               
               {selectedMawb.remarks && (
                 <div className="mt-4 p-3 border rounded bg-slate-50">
                    <Text type="secondary" className="text-xs block mb-1">Remarks</Text>
                    <div>{selectedMawb.remarks}</div>
                 </div>
               )}
            </div>
         )}
      </Drawer>
    </div>
  );
};

export default MawbList;
