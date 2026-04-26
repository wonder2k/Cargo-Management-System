import React, { useState } from 'react';
import { Button, Card, Typography, theme, Tabs, Form, Input, App, Divider } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldCheck, Mail, Lock, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';

const { Title, Text } = Typography;

export const LoginPage: React.FC = () => {
  const { user, profile, loginWithGoogle, loginWithEmail, register, logout, loading } = useAuth();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  if (!loading && user && profile?.status === 'approved') {
    return <Navigate to="/" />;
  }

  const handleEmailLogin = async (values: any) => {
    try {
      await loginWithEmail(values.email, values.password);
      message.success(t('auth.success'));
    } catch (error: any) {
      message.error(error.message || t('common.error'));
    }
  };

  const handleRegister = async (values: any) => {
    try {
      await register(values.email, values.password, values.name);
      message.success(t('auth.registerSuccess'));
    } catch (error: any) {
      message.error(error.message || t('common.error'));
    }
  };

  if (user && profile?.status === 'pending') {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="w-96 text-center shadow-xl border-amber-100 bg-white" variant="outlined">
            <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck color="white" size={32} />
            </div>
            <Title level={3}>{t('auth.pendingTitle')}</Title>
            <p className="text-slate-500 mb-6 px-4">
              {t('auth.pendingDesc')}
            </p>
            <Button block onClick={logout}>{t('auth.backToLogin')}</Button>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${token.colorPrimaryBg} 0%, ${token.colorBgContainer} 100%)`
    }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <Card style={{ width: 450, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }} className="rounded-2xl border-none" variant="borderless">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <LogIn color="white" size={24} />
            </div>
            <Title level={2} className="m-0">CargoSystem</Title>
            <Text type="secondary">Operational Control Console</Text>
          </div>

          <Tabs 
            activeKey={authMode} 
            onChange={(v) => setAuthMode(v as any)}
            centered
            className="mb-6"
            items={[
              {
                key: 'login',
                label: <div className="flex items-center gap-2"><LogIn size={14} /> {t('auth.login')}</div>,
                children: (
                  <Form layout="vertical" onFinish={handleEmailLogin} requiredMark={false}>
                    <Form.Item name="email" label={t('auth.workEmail')} rules={[{ required: true, type: 'email' }]}>
                      <Input prefix={<Mail size={16} className="text-slate-400" />} placeholder="name@company.com" size="large" />
                    </Form.Item>
                    <Form.Item name="password" label={t('auth.password')} rules={[{ required: true }]}>
                      <Input.Password prefix={<Lock size={16} className="text-slate-400" />} placeholder="••••••••" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block className="h-12 font-bold shadow-md shadow-blue-100">
                      {t('auth.signIn')}
                    </Button>
                  </Form>
                )
              },
              {
                key: 'register',
                label: <div className="flex items-center gap-2"><UserPlus size={14} /> {t('auth.register')}</div>,
                children: (
                  <Form layout="vertical" onFinish={handleRegister} requiredMark={false}>
                    <Form.Item name="name" label={t('auth.fullName')} rules={[{ required: true }]}>
                      <Input prefix={<UserIcon size={16} className="text-slate-400" />} placeholder="Robert Chen" size="large" />
                    </Form.Item>
                    <Form.Item name="email" label={t('auth.workEmail')} rules={[{ required: true, type: 'email' }]}>
                      <Input prefix={<Mail size={16} className="text-slate-400" />} placeholder="name@company.com" size="large" />
                    </Form.Item>
                    <Form.Item name="password" label={t('auth.password')} rules={[{ required: true, min: 6 }]}>
                      <Input.Password prefix={<Lock size={16} className="text-slate-400" />} placeholder="Min. 6 characters" size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block className="h-12 font-bold shadow-md shadow-blue-100">
                      {t('auth.createAccount')}
                    </Button>
                  </Form>
                )
              }
            ]}
          />

          <Divider plain><Text type="secondary">{t('auth.orLine')}</Text></Divider>

          <Button 
            size="large" 
            block 
            className="h-12 border-slate-200 flex items-center justify-center gap-2 hover:bg-slate-50"
            onClick={loginWithGoogle}
            loading={loading}
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            {t('auth.google')}
          </Button>

          <div className="mt-8 text-center">
             <Text className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">{t('auth.authAccessOnly')}</Text>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
