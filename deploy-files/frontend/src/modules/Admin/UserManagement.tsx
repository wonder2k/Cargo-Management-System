import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Select, App, Space, Button, InputNumber, Modal } from 'antd';
import { authApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { Shield, UserCheck, UserX, AlertTriangle } from 'lucide-react';

const { Title, Text } = Typography;

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  tier: number;
  companyName?: string;
  regions?: string[];
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { user: currentUser, isAdmin } = useAuth();
  const { t } = useTranslation();
  const { message, modal } = App.useApp();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch { message.error(t('common.failedToFetch')); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isAdmin) fetchUsers(); }, [isAdmin]);

  const handleUpdateUser = async (id: number, data: any) => {
    try {
      await authApi.updateUser(id, data);
      message.success(t('common.success'));
      fetchUsers();
    } catch { message.error(t('common.error')); }
  };

  const roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Business', value: 'business' },
    { label: 'Operation', value: 'operation' },
    { label: 'Finance', value: 'finance' },
    { label: 'Viewer', value: 'viewer' },
  ];

  const regionOptions = [
    { label: 'AsiaPacific', value: 'AsiaPacific' },
    { label: 'Americas', value: 'Americas' },
    { label: 'Europe', value: 'Europe' },
    { label: 'MESA', value: 'MESA' },
    { label: 'Africa', value: 'Africa' },
  ];

  const statusColors: Record<string, string> = { pending: 'orange', approved: 'green', rejected: 'red' };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <Shield size={48} className="text-slate-300 mx-auto mb-4" />
        <Text type="secondary" className="text-lg">{t('common.accessDenied') || 'Access denied. Admin only.'}</Text>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Title level={2} className="mb-0">{t('common.users')}</Title>
          <Text type="secondary">{t('common.manageClients')}</Text>
        </div>
      </div>

      <Card className="shadow-sm">
        <Table dataSource={users} loading={loading} rowKey="id" pagination={{ pageSize: 15 }}
          columns={[
            {
              title: t('common.name'),
              render: (_, r) => (
                <div>
                  <div className="font-semibold">{r.name || '--'}</div>
                  <div className="text-xs text-slate-400">{r.email}</div>
                </div>
              ),
            },
            { title: t('common.company') || 'Company', dataIndex: 'companyName', render: (v: string) => v || '--' },
            {
              title: t('common.type') || 'Role',
              render: (_, r) => (
                <Select size="small" value={r.role} style={{ width: 120 }}
                  onChange={(val) => handleUpdateUser(r.id, { role: val })} options={roleOptions} />
              ),
            },
            {
              title: 'Tier',
              render: (_, r) => (
                <Select size="small" value={r.tier} style={{ width: 70 }}
                  onChange={(val) => handleUpdateUser(r.id, { tier: val })}
                  options={Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i }))} />
              ),
            },
            {
              title: 'Regions',
              render: (_, r) => (
                <Select mode="multiple" size="small" style={{ minWidth: 130 }} maxTagCount="responsive"
                  value={r.regions || []} placeholder="None"
                  onChange={(val) => handleUpdateUser(r.id, { regions: val })} options={regionOptions} />
              ),
            },
            {
              title: t('common.status'),
              render: (_, r) => (
                <Space>
                  <Select size="small" value={r.status} style={{ width: 100 }}
                    onChange={(val) => handleUpdateUser(r.id, { status: val })}
                    options={[{ label: 'Pending', value: 'pending' }, { label: 'Approved', value: 'approved' }, { label: 'Rejected', value: 'rejected' }]} />
                  <Tag color={statusColors[r.status]}>{r.status}</Tag>
                </Space>
              ),
            },
          ]} />
      </Card>
    </div>
  );
};
