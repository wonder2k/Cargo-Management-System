import React, { useEffect, useState } from 'react';
import { Table, Card, Typography, Tag, Select, App, Space } from 'antd';
import { authApi } from '../../services/api';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

interface UserItem {
  id: number;
  email: string;
  name: string;
  role: string;
  status: string;
  tier: number;
  companyName?: string;
  createdAt: string;
}

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const { message } = App.useApp();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authApi.getUsers();
      setUsers(res.data);
    } catch {
      message.error(t('common.failedToFetch'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleUpdateUser = async (id: number, data: { role?: string; status?: string }) => {
    try {
      await authApi.updateUser(id, data);
      message.success(t('common.success'));
      fetchUsers();
    } catch {
      message.error(t('common.error'));
    }
  };

  const roleOptions = [
    { label: 'Admin', value: 'admin' },
    { label: 'Business', value: 'business' },
    { label: 'Operation', value: 'operation' },
    { label: 'Finance', value: 'finance' },
    { label: 'Viewer', value: 'viewer' },
  ];

  const statusColors: Record<string, string> = {
    pending: 'orange',
    approved: 'green',
    rejected: 'red',
  };

  const roleColors: Record<string, string> = {
    admin: 'red',
    business: 'blue',
    operation: 'purple',
    finance: 'cyan',
    viewer: 'default',
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Title level={2} className="mb-0">{t('common.users')}</Title>
        <Text type="secondary">{t('common.manageClients')}</Text>
      </div>

      <Card className="shadow-sm">
        <Table
          dataSource={users}
          loading={loading}
          rowKey="id"
          pagination={{ pageSize: 15 }}
          columns={[
            {
              title: t('common.name') || 'Name',
              render: (_, r) => (
                <div>
                  <div className="font-semibold">{r.name || '--'}</div>
                  <div className="text-xs text-slate-400">{r.email}</div>
                </div>
              )
            },
            {
              title: t('common.code') || 'Company',
              dataIndex: 'companyName',
              render: (v: string) => v || '--',
            },
            {
              title: t('common.type') || 'Role',
              render: (_, r) => (
                <Select
                  size="small"
                  value={r.role}
                  style={{ width: 120 }}
                  onChange={(val) => handleUpdateUser(r.id, { role: val })}
                  options={roleOptions}
                />
              )
            },
            {
              title: t('common.status') || 'Status',
              render: (_, r) => (
                <Space>
                  <Select
                    size="small"
                    value={r.status}
                    style={{ width: 110 }}
                    onChange={(val) => handleUpdateUser(r.id, { status: val })}
                    options={[
                      { label: 'Pending', value: 'pending' },
                      { label: 'Approved', value: 'approved' },
                      { label: 'Rejected', value: 'rejected' },
                    ]}
                  />
                  <Tag color={statusColors[r.status]}>{r.status}</Tag>
                </Space>
              )
            },
            {
              title: 'Tier',
              render: (_, r) => (
                <Select
                  size="small"
                  value={r.tier}
                  style={{ width: 80 }}
                  onChange={(val) => handleUpdateUser(r.id, { status: r.status, role: r.role, tier: val })}
                  options={Array.from({ length: 11 }, (_, i) => ({ label: String(i), value: i }))}
                />
              )
            },
          ]}
        />
      </Card>
    </div>
  );
};
