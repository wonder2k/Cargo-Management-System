import React, { useState } from 'react';
import { Card, Form, Input, Button, Upload, App, Row, Col, Typography, Avatar, Divider, List, Space, Modal } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { User, Building2, Phone, Mail, Upload as UploadIcon, Shield, MapPin, Plus, Trash2 } from 'lucide-react';
import { Warehouse } from '../../types';

const { Title, Text } = Typography;

export const PersonalCenter: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const [form] = Form.useForm();
  const [warehouseForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const { message } = App.useApp();

  const { t } = useTranslation();

  const handleUpdate = async (values: any) => {
    if (!profile) return;
    setLoading(true);
    try {
      const sanitizedValues = { ...values };
      Object.keys(sanitizedValues).forEach(key => {
        if (sanitizedValues[key] === undefined) {
          sanitizedValues[key] = "";
        }
      });
      await updateDoc(doc(db, 'users', profile.uid), {
        ...sanitizedValues,
        updatedAt: new Date().toISOString()
      });
      await refreshProfile();
      message.success(t('common.success'));
    } catch (e: any) {
      message.error(t('common.error') + ': ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddWarehouse = async (values: any) => {
    if (!profile) return;
    const newWarehouse: Warehouse = {
      id: Date.now().toString(),
      ...values
    };
    
    const currentWarehouses = profile.warehouses || [];
    try {
      await updateDoc(doc(db, 'users', profile.uid), {
        warehouses: [...currentWarehouses, newWarehouse]
      });
      await refreshProfile();
      message.success(t('common.success'));
      setWarehouseModalOpen(false);
      warehouseForm.resetFields();
    } catch (e: any) {
      message.error(t('common.error'));
    }
  };

  const deleteWarehouse = async (id: string) => {
    if (!profile) return;
    const updated = (profile.warehouses || []).filter(w => w.id !== id);
    try {
      await updateDoc(doc(db, 'users', profile.uid), { warehouses: updated });
      await refreshProfile();
      message.success(t('common.success'));
    } catch (e: any) {
      message.error(t('common.error'));
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      <div className="mb-8">
        <Title level={2}>{t('profile.title')}</Title>
        <Text type="secondary">{t('profile.subtitle')}</Text>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={8}>
          <Space direction="vertical" className="w-full" size="middle">
            <Card className="text-center shadow-sm border-slate-200">
              <Avatar size={80} className="bg-blue-100 text-blue-600 mb-4" icon={<User size={40} />} />
              <Title level={4} className="mb-0">{profile?.displayName}</Title>
              <Text type="secondary">{profile?.email}</Text>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase ring-1 ring-blue-100">
                  {profile?.role}
                </span>
                <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase ring-1 ring-green-100">
                  {profile?.status}
                </span>
              </div>
            </Card>

            <Card title={t('profile.regionalAccess')} className="shadow-sm border-slate-200">
              <div className="flex flex-wrap gap-2 text-sm">
                  {profile?.regions?.map(region => (
                    <span key={region} className="px-2 py-1 bg-slate-100 text-slate-600 rounded border border-slate-200 text-xs font-medium">
                      {region}
                    </span>
                  )) || <Text type="secondary">{t('profile.noRegions')}</Text>}
              </div>
            </Card>

            <Card 
              title={
                <div className="flex justify-between items-center">
                  <span>{t('profile.warehousePresets')}</span>
                  <Button type="link" size="small" icon={<Plus size={14} />} onClick={() => setWarehouseModalOpen(true)}>{t('common.create')}</Button>
                </div>
              } 
              className="shadow-sm border-slate-200"
            >
              <List
                size="small"
                dataSource={profile?.warehouses || []}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                      <Button key="del" type="text" danger icon={<Trash2 size={12} />} onClick={() => deleteWarehouse(item.id)} />
                    ]}
                  >
                    <List.Item.Meta
                      title={<span className="text-sm font-semibold">{item.name}</span>}
                      description={<span className="text-xs text-slate-400">{item.address}</span>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={16}>
          <Card 
            title={
                <div className="py-2">
                    <Title level={5} className="mb-0">{t('profile.settings')}</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>{t('profile.settingsDesc')}</Text>
                </div>
            }
            className="shadow-sm border-slate-200"
          >
            <Form 
              form={form} 
              layout="vertical" 
              initialValues={profile || {}}
              onFinish={handleUpdate}
            >
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="displayName" label={t('profile.name')} rules={[{ required: true }]}>
                    <Input prefix={<User size={16} className="text-slate-400" />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label={t('profile.email')} rules={[{ required: true, type: 'email' }]}>
                    <Input prefix={<Mail size={16} className="text-slate-400" />} disabled />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="companyName" label={t('profile.companyName')}>
                    <Input prefix={<Building2 size={16} className="text-slate-400" />} placeholder="e.g. ABC Global Logistics" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="contactPerson" label={t('profile.contactPerson')}>
                    <Input prefix={<User size={16} className="text-slate-400" />} placeholder="e.g. Mr. John Doe" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="contactPhone" label={t('profile.phoneNumber')}>
                <Input prefix={<Phone size={16} className="text-slate-400" />} placeholder="+86 138-0000-0000" />
              </Form.Item>

              <Form.Item name="logoUrl" label={t('profile.logo')}>
                <Input 
                    prefix={<UploadIcon size={16} className="text-slate-400" />} 
                    placeholder="https://example.com/logo.png (1:1 Ratio recommended)" 
                />
                <Text type="secondary" style={{ fontSize: 11 }}>
                    {t('profile.logoDesc')}
                </Text>
              </Form.Item>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button type="primary" htmlType="submit" loading={loading} size="large" className="px-8 shadow-md shadow-blue-200">
                  {t('profile.save')}
                </Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal
        title={t('profile.addWarehouse')}
        open={warehouseModalOpen}
        onCancel={() => setWarehouseModalOpen(false)}
        onOk={() => warehouseForm.submit()}
      >
        <Form form={warehouseForm} layout="vertical" onFinish={handleAddWarehouse}>
          <Form.Item name="name" label={t('profile.warehouseName')} rules={[{ required: true }]}>
            <Input placeholder="e.g. Guangzhou Baiyun Main Warehouse" />
          </Form.Item>
          <Form.Item name="address" label={t('profile.address')} rules={[{ required: true }]}>
             <Input.TextArea placeholder="Full address for booking order" rows={3} />
          </Form.Item>
          <Form.Item name="contact" label={t('profile.contact')} rules={[{ required: true }]}>
             <Input placeholder="Name / Phone" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
