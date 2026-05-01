import React, { useState } from 'react';
import { Layout, Menu, Button, theme, Space, Avatar, Dropdown } from 'antd';
import {
  LayoutDashboard,
  Briefcase,
  Plane,
  Coins,
  User,
  LogOut,
  Menu as MenuIcon,
  ChevronLeft,
  ChevronRight,
  Globe
} from 'lucide-react';
import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const { Header, Sider, Content } = Layout;

export const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  const menuItems = [
    {
      key: '/',
      icon: <LayoutDashboard size={18} />,
      label: <Link to="/">{t('common.dashboard') || 'Dashboard'}</Link>,
    },
    {
      key: '/rates',
      icon: <Coins size={18} />,
      label: <Link to="/rates">{t('common.rates') || 'Rates Cabinet'}</Link>,
    },
    {
      key: '/quotes',
      icon: <Globe size={18} />,
      label: <Link to="/quotes">{t('common.quotes') || 'Quote History'}</Link>,
    },
    {
      key: '/bookings',
      icon: <Briefcase size={18} />,
      label: <Link to="/bookings">{t('common.bookings') || 'Air Bookings'}</Link>,
    },
    {
      key: '/operation',
      icon: <Plane size={18} />,
      label: <Link to="/operation">{t('common.operations') || 'Operation (MAWB)'}</Link>,
    },
    {
      key: '/finance',
      icon: <Coins size={18} />,
      label: <Link to="/finance">{t('common.finance') || 'Finance (AR/AP)'}</Link>,
    },
    {
      key: '/business',
      icon: <User size={18} />,
      label: <Link to="/business">{t('common.business') || 'Customer CRM'}</Link>,
    },
    {
      key: '/users',
      icon: <User size={18} />,
      label: <Link to="/users">{t('common.users') || 'Team Access'}</Link>,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const toggleLanguage = () => {
    const nextLng = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(nextLng);
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        theme="dark"
        width={240}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          background: '#0f172a'
        }}
      >
        <div style={{ 
          height: 64, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: collapsed ? 'center' : 'flex-start',
          padding: '0 24px',
          color: 'white',
          fontWeight: 'bold',
          fontSize: 20
        }}>
          {collapsed ? 'JC' : 'JCargo CMS'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          style={{ background: '#0f172a' }}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'all 0.2s' }}>
        <Header style={{ 
          padding: '0 24px', 
          background: colorBgContainer, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1,
          width: '100%',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <Button
            type="text"
            icon={collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', width: 64, height: 64 }}
          />
          
          <Space size="large">
            <Button 
              type="text" 
              icon={<Globe size={18} />} 
              onClick={toggleLanguage}
            >
              {i18n.language === 'zh' ? 'English' : '中文'}
            </Button>
            
            <Dropdown menu={{
              items: [
                {
                  key: 'logout',
                  label: 'Logout',
                  icon: <LogOut size={16} />,
                  onClick: handleLogout
                }
              ]
            }}>
              <Space style={{ cursor: 'pointer' }}>
                <Avatar icon={<User size={18} />} />
                <span className="font-medium text-slate-700">{user?.name || 'User'}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};
