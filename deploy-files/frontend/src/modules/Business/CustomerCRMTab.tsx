import React, { useState, useEffect } from 'react';
import { Table, Button, Typography, Tag, App } from 'antd';
import { Users } from 'lucide-react';
import api from '../../services/api';

const { Text } = Typography;

export const CustomerCRMTab: React.FC = () => {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(false);
    const { message } = App.useApp();

    const fetchCustomers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/business/customers');
            setCustomers(res.data);
        } catch (e) {
            message.error('Failed to load customers');
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { fetchCustomers(); }, []);

    return (
        <Table 
            dataSource={customers}
            loading={loading}
            rowKey="id"
            columns={[
                { title: 'Full Name', dataIndex: 'name', render: (t) => <Text strong>{t}</Text> },
                { title: 'Contact', dataIndex: 'contactPerson' },
                { title: 'Email', dataIndex: 'email' },
                { title: 'Phone', dataIndex: 'phone' },
                { title: 'Credit Limit', dataIndex: 'creditLimit', render: (v) => v ? `¥${v.toLocaleString()}` : '--' },
                { title: 'Action', render: () => <Button type="link">Details</Button> }
            ]}
        />
    )
}
