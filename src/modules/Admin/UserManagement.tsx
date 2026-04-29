import React, { useEffect, useState } from 'react';
import { Table, Button, Tag, App, Select, Space, Card, Typography } from 'antd';
import { collection, query, getDocs, updateDoc, doc, orderBy, deleteDoc, writeBatch } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../../lib/firebase';
import { UserProfile, Role, UserStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { UserCheck, UserX, Shield } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const { Title, Text } = Typography;

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();
  const { t } = useTranslation();
  const { message, modal } = App.useApp();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setUsers(snap.docs.map(d => ({ ...d.data() } as UserProfile)));
    } catch (error: any) {
      message.error('Failed to fetch users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (profile?.role === 'admin') {
      fetchUsers();
    }
  }, [profile]);

  const handleUpdateStatus = async (uid: string, status: UserStatus) => {
    try {
       await updateDoc(doc(db, 'users', uid), { status });
       message.success(`User status updated to ${status}`);
       fetchUsers();
    } catch (error: any) {
       message.error('Update failed: ' + error.message);
    }
  };

  const handleUpdateRole = async (uid: string, role: Role) => {
    try {
       await updateDoc(doc(db, 'users', uid), { role });
       message.success(`User role updated to ${role}`);
       fetchUsers();
    } catch (error: any) {
       message.error('Update failed: ' + error.message);
    }
  };

  const handleResetSystem = async () => {
    modal.confirm({
      title: 'Reset System Data',
      content: 'Are you sure you want to delete ALL operational data (Rates, Bookings, MAWBs, Finance)? This cannot be undone.',
      okText: 'Yes, Clear All',
      cancelText: 'Cancel',
      okType: 'danger',
      onOk: async () => {
        setLoading(true);
        const collectionsToPurge = [
          'quotation-history',
          'flight-rates',
          'quotations',
          'bookings',
          'mawbs',
          'accountsReceivable',
          'accountsPayable',
          'invoices'
        ];

        try {
          const collectionsToPurge = [
            'quotation-history',
            'flight-rates',
            'quotations',
            'bookings',
            'mawbs',
            'accountsReceivable',
            'accountsPayable',
            'invoices',
            'invoice-history'
          ];

          for (const collName of collectionsToPurge) {
            let snap;
            try {
              snap = await getDocs(collection(db, collName));
            } catch (err: any) {
              if (err.code === 'permission-denied') {
                handleFirestoreError(err, OperationType.LIST, collName);
              }
              console.warn(`Skipping ${collName} due to error:`, err.message);
              continue;
            }

            if (snap && !snap.empty) {
              // Handle potentially large collections by chunking batch deletes
              const docs = snap.docs;
              for (let i = 0; i < docs.length; i += 500) {
                const batch = writeBatch(db);
                const chunk = docs.slice(i, i + 500);
                chunk.forEach(d => batch.delete(d.ref));
                try {
                  await batch.commit();
                } catch (err: any) {
                  handleFirestoreError(err, OperationType.WRITE, collName);
                }
              }
            }
          }
          message.success('System data successfully cleared. Users and Customers were preserved.');
        } catch (error: any) {
          console.error('Reset failed details:', error.message);
          let displayError = error.message;
          try {
            if (error.message.startsWith('{')) {
              const parsed = JSON.parse(error.message);
              displayError = `Permission denied at ${parsed.path} during ${parsed.operationType}`;
            }
          } catch(e) {}
          message.error('Reset failed: ' + displayError);
        } finally {
          setLoading(false);
        }
      }
    });
  };

  if (profile?.role !== 'admin') {
    return <div className="p-8 text-center text-slate-500 font-medium">{t('common.accessDenied')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <Title level={2} className="mb-0">{t('users.title')}</Title>
          <Text type="secondary">{t('users.subtitle')}</Text>
        </div>
        <Button danger type="primary" onClick={handleResetSystem} loading={loading}>
          Format System (Clear All Cargo Data)
        </Button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <Table 
          dataSource={users} 
          loading={loading} 
          rowKey="uid"
          pagination={{ pageSize: 10 }}
          className="professional-table"
          columns={[
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('users.nameEmail')}</span>, 
              render: (_, r) => (
                <div className="py-1">
                  <p className="text-sm font-semibold text-slate-700 m-0">{r.displayName}</p>
                  <p className="text-xs text-slate-400 m-0">{r.email}</p>
                </div>
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('users.role')}</span>, 
              dataIndex: 'role',
              render: (role: Role, record) => (
                <Select 
                  value={role} 
                  onChange={(v) => handleUpdateRole(record.uid, v)}
                  size="small"
                  className="w-32"
                  disabled={record.email === 'wonder2k@gmail.com'}
                  options={[
                    { label: t('users.roles.admin'), value: 'admin' },
                    { label: t('users.roles.business'), value: 'business' },
                    { label: t('users.roles.operation'), value: 'operation' },
                    { label: t('users.roles.finance'), value: 'finance' }
                  ]}
                />
              )
            },
            {
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('users.rights')}</span>,
              dataIndex: 'regions',
              render: (regions: string[], record) => (
                <Select 
                  mode="multiple"
                  className="min-w-[120px]"
                  maxTagCount="responsive"
                  placeholder={t('users.noAccess')}
                  value={regions}
                  onChange={async (v) => {
                    await updateDoc(doc(db, 'users', record.uid), { regions: v });
                    message.success(t('users.rightsUpdated'));
                    fetchUsers();
                  }}
                  size="small"
                  options={[
                    { label: t('users.regions.AsiaPacific'), value: 'AsiaPacific' },
                    { label: t('users.regions.Americas'), value: 'Americas' },
                    { label: t('users.regions.Europe'), value: 'Europe' },
                    { label: t('users.regions.MESA'), value: 'MESA' },
                    { label: t('users.regions.Africa'), value: 'Africa' }
                  ]}
                />
              )
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('users.status')}</span>, 
              dataIndex: 'status',
              render: (status: UserStatus) => {
                const styles = {
                  approved: 'bg-green-100 text-green-700',
                  pending: 'bg-amber-100 text-amber-700',
                  rejected: 'bg-red-100 text-red-700'
                };
                return (
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${styles[status]}`}>
                    {t(`users.statuses.${status}`)}
                  </span>
                );
              }
            },
            { 
              title: <span className="text-xs font-bold uppercase tracking-wider text-slate-500 text-right block">{t('users.actions')}</span>, 
              align: 'right',
              render: (_, record) => (
                <Space>
                  {record.status === 'pending' && (
                    <>
                      <Button 
                        size="small" 
                        type="primary" 
                        icon={<UserCheck size={14} />}
                        onClick={() => handleUpdateStatus(record.uid, 'approved')}
                      >
                        {t('common.confirm')}
                      </Button>
                      <Button 
                        size="small" 
                        danger 
                        icon={<UserX size={14} />}
                        onClick={() => handleUpdateStatus(record.uid, 'rejected')}
                      >
                        {t('common.cancel')}
                      </Button>
                    </>
                  )}
                  {record.status === 'approved' && record.email !== 'wonder2k@gmail.com' && (
                     <Button 
                      size="small" 
                      onClick={() => handleUpdateStatus(record.uid, 'pending')}
                    >
                      {t('users.suspend')}
                    </Button>
                  )}
                </Space>
              )
            }
          ]}
        />
      </div>
    </div>
  );
};
