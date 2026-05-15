import React, { useState } from 'react';
import { Card, Form, Input, Button, App, Row, Col, Typography, Avatar, List, Space, Modal, Upload, Image } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { authApi, uploadApi } from '../../services/api';
import { useTranslation } from 'react-i18next';
import { User, Building2, Phone, Mail, Upload as UploadIcon, Plus, Trash2 } from 'lucide-react';
import { Warehouse } from '../../types';

const { Title, Text } = Typography;

export const PersonalCenter: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [form] = Form.useForm();
  const [warehouseForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [warehouseModalOpen, setWarehouseModalOpen] = useState(false);
  const { message } = App.useApp();
  const { t } = useTranslation();

  const profileUser = user as any;
  const warehouses: Warehouse[] = profileUser?.warehouses || [];
  const avatarUrl = profileUser?.avatarUrl || '';

  const handleUpdate = async (values: any) => {
    if (!user) return;
    setLoading(true);
    try {
      await authApi.updateUser(user.id, values);
      await refreshUser();
      message.success(t('common.success'));
    } catch { message.error(t('common.error')); }
    finally { setLoading(false); }
  };

  const handleAddWarehouse = async (values: any) => {
    if (!user) return;
    const newWarehouse: Warehouse = { id: Date.now().toString(), ...values };
    try {
      await authApi.updateUser(user.id, { warehouses: [...warehouses, newWarehouse] });
      await refreshUser();
      message.success(t('common.success'));
      setWarehouseModalOpen(false);
      warehouseForm.resetFields();
    } catch { message.error(t('common.error')); }
  };

  const deleteWarehouse = async (id: string) => {
    if (!user) return;
    try {
      await authApi.updateUser(user.id, { warehouses: warehouses.filter(w => w.id !== id) });
      await refreshUser();
      message.success(t('common.success'));
    } catch { message.error(t('common.error')); }
  };

  const handleLogoUpload = async (file: File) => {
    if (!user) return false;
    setUploadingLogo(true);
    try {
      const res = await uploadApi.uploadFile(file);
      await authApi.updateUser(user.id, { avatarUrl: res.data.fileUrl });
      await refreshUser();
      message.success('Logo uploaded');
      form.setFieldsValue({ avatarUrl: res.data.fileUrl });
    } catch { message.error('Upload failed'); }
    finally { setUploadingLogo(false); }
    return false;
  };

  const regions: string[] = profileUser?.regions || [];

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
              {avatarUrl ? (
                <div className="mb-4 flex justify-center">
                  <Image src={avatarUrl} preview={{ mask: null }}
                    style={{ maxWidth: '100%', maxHeight: 80, width: 'auto', height: 'auto', objectFit: 'contain' }} />
                </div>
              ) : (
                <Avatar size={80} className="bg-blue-100 text-blue-600 mb-4" icon={<User size={40} />} />
              )}
              <Title level={4} className="mb-0">{user?.name}</Title>
              <Text type="secondary">{user?.email}</Text>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase">{user?.role}</span>
                <span className="px-2 py-1 bg-green-50 text-green-600 rounded-full text-xs font-bold uppercase">{user?.status}</span>
              </div>
            </Card>

            <Card title={t('profile.regionalAccess')} className="shadow-sm border-slate-200">
              <div className="flex flex-wrap gap-2">
                {regions.length > 0 ? regions.map(r => (
                  <span key={r} className="px-2 py-1 bg-slate-100 text-slate-600 rounded border text-xs font-medium">{r}</span>
                )) : <Text type="secondary">{t('profile.noRegions')}</Text>}
              </div>
            </Card>

            <Card title={
              <div className="flex justify-between items-center">
                <span>{t('profile.warehousePresets')}</span>
                <Button type="link" size="small" icon={<Plus size={14} />} onClick={() => setWarehouseModalOpen(true)}>Add</Button>
              </div>
            } className="shadow-sm border-slate-200">
              <List size="small" dataSource={warehouses}
                renderItem={(item: Warehouse) => (
                  <List.Item actions={[<Button key="del" type="text" danger icon={<Trash2 size={12} />} onClick={() => deleteWarehouse(item.id)} />]}>
                    <List.Item.Meta title={<span className="text-sm font-semibold">{item.name}</span>}
                      description={<span className="text-xs text-slate-400">{item.address}</span>} />
                  </List.Item>
                )} />
            </Card>
          </Space>
        </Col>

        <Col xs={24} lg={16}>
          <Card title={<div><Title level={5} className="mb-0">{t('profile.settings')}</Title><Text type="secondary" style={{ fontSize: 12 }}>{t('profile.settingsDesc')}</Text></div>}
            className="shadow-sm border-slate-200">
            <Form form={form} layout="vertical"
              initialValues={{
                name: user?.name, email: user?.email,
                companyName: (user as any)?.companyName,
                contactPerson: (user as any)?.contactPerson,
                phone: user?.phone, avatarUrl: avatarUrl,
              }}
              onFinish={handleUpdate}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="name" label={t('profile.name')} rules={[{ required: true }]}>
                    <Input prefix={<User size={16} className="text-slate-400" />} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="email" label={t('profile.email')}>
                    <Input prefix={<Mail size={16} className="text-slate-400" />} disabled />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="companyName" label={t('profile.companyName')}>
                    <Input prefix={<Building2 size={16} className="text-slate-400" />} placeholder="ABC Global Logistics" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="contactPerson" label={t('profile.contactPerson')}>
                    <Input prefix={<User size={16} className="text-slate-400" />} placeholder="Contact Name" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="phone" label={t('profile.phoneNumber')}>
                <Input prefix={<Phone size={16} className="text-slate-400" />} placeholder="+86 138-0000-0000" />
              </Form.Item>

              {/* Logo upload */}
              <div className="mb-4">
                <Text strong className="block mb-2">{t('profile.logo')}</Text>
                <Space>
                  <Upload accept=".png,.jpg,.jpeg" showUploadList={false}
                    beforeUpload={handleLogoUpload}>
                    <Button loading={uploadingLogo} icon={<UploadIcon size={16} />}>{t('profile.logo')}</Button>
                  </Upload>
                  <Form.Item name="avatarUrl" className="mb-0 flex-1" style={{ minWidth: 250 }}>
                    <Input placeholder="https://example.com/logo.png" />
                  </Form.Item>
                </Space>
                <Text type="secondary" style={{ fontSize: 11 }} className="block mt-1">{t('profile.logoDesc')}</Text>
              </div>

              <div className="pt-4 border-t flex justify-end">
                <Button type="primary" htmlType="submit" loading={loading} size="large">{t('profile.save')}</Button>
              </div>
            </Form>
          </Card>
        </Col>
      </Row>

      <Modal title={t('profile.addWarehouse')} open={warehouseModalOpen}
        onCancel={() => setWarehouseModalOpen(false)} onOk={() => warehouseForm.submit()}>
        <Form form={warehouseForm} layout="vertical" onFinish={handleAddWarehouse}>
          <Form.Item name="name" label={t('profile.warehouseName')} rules={[{ required: true }]}>
            <Input placeholder="Guangzhou Baiyun Main Warehouse" />
          </Form.Item>
          <Form.Item name="address" label={t('profile.address')} rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Full address" />
          </Form.Item>
          <Form.Item name="contact" label={t('profile.contact')} rules={[{ required: true }]}>
            <Input placeholder="Name / Phone" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};
