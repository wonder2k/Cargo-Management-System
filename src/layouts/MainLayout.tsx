import React from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme, Space } from 'antd';
import { 
  BarChart2, 
  Users, 
  DollarSign, 
  Package, 
  Map, 
  LogOut, 
  Settings,
  Menu as MenuIcon,
  ChevronRight,
  Search,
  Bell as HeaderIcon,
  ShieldAlert,
  History as LucideHistory,
  Languages
} from 'lucide-react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';

const { Header, Content, Sider } = Layout;

export const MainLayout: React.FC = () => {
  const { profile, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = React.useState(false);
  const { token } = theme.useToken();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const menuItems = [
    { key: '/', icon: <BarChart2 size={18} />, label: t('menu.dashboard'), roles: ['admin', 'business', 'operation', 'finance'] },
    { key: '/business', icon: <Map size={18} />, label: t('menu.business'), roles: ['admin', 'business'] },
    { key: '/quotes', icon: <LucideHistory size={18} />, label: t('menu.quotes'), roles: ['admin', 'business'] },
    { key: '/bookings', icon: <Package size={18} />, label: t('menu.bookings'), roles: ['admin', 'business'] },
    { key: '/operation', icon: <ChevronRight size={18} />, label: t('menu.operation'), roles: ['admin', 'operation'] },
    { key: '/finance', icon: <DollarSign size={18} />, label: t('menu.finance'), roles: ['admin', 'finance'] },
    { key: '/customers', icon: <Users size={18} />, label: t('menu.customers'), roles: ['admin', 'business', 'finance'] },
    { key: '/users', icon: <ShieldAlert size={18} />, label: t('menu.users'), roles: ['admin'] },
  ];

  const filteredItems = menuItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  const userMenuItems: any[] = [
    { 
      key: 'profile', 
      label: t('app.profile'), 
      icon: <Users size={14} />,
      onClick: () => navigate('/profile')
    },
    {
      key: 'simulate_yuntong',
      label: 'Simulate: 广州运通',
      icon: <Users size={14} />,
      onClick: () => {
        localStorage.setItem('simulation_user', '广州运通');
        window.location.reload();
      }
    },
    { 
      type: 'divider',
      key: 'd1'
    },
    { 
      key: 'logout', 
      label: t('app.logout'), 
      icon: <LogOut size={14} />,
      onClick: logout 
    },
  ];

  const langugeMenuItems = [
    { key: 'zh', label: '简体中文', onClick: () => changeLanguage('zh') },
    { key: 'en', label: 'English', onClick: () => changeLanguage('en') },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        collapsible 
        collapsed={collapsed} 
        onCollapse={(value) => setCollapsed(value)}
        breakpoint="lg"
        theme="dark"
        style={{
          transition: 'all 0.2s',
          borderRight: 'none',
        }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            style={{ 
              width: 32, 
              height: 32, 
              background: '#3b82f6', 
              borderRadius: 6, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontWeight: 'bold',
              color: 'white',
              fontSize: 14
            }}
          >
            CMS
          </motion.div>
          {!collapsed && (
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontWeight: 600, fontSize: 16, color: 'white', letterSpacing: '0.025em' }}
            >
              CargoSystem
            </motion.span>
          )}
        </div>
        <Menu 
          mode="inline" 
          theme="dark"
          selectedKeys={[location.pathname]} 
          items={filteredItems.map(item => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
            onClick: () => navigate(item.key)
          }))}
          style={{ borderRight: 0, marginTop: 16 }}
        />
        {!collapsed && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: 12, borderRadius: 8 }}>
              <p style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>System Health</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4ade80', fontWeight: 500 }}>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                All Regions Online
              </div>
            </div>
          </div>
        )}
      </Sider>
      <Layout>
        <Header style={{ 
          background: token.colorBgContainer, 
          padding: '0 32px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          borderBottom: `1px solid #e2e8f0`,
          height: 64,
          boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)'
        }}>
          <div className="flex items-center bg-slate-100 rounded-full px-4 py-1.5 w-96">
            <Search size={16} className="text-slate-400 mr-2" />
            <input type="text" placeholder="Search AWB, Flight, or Cargo ID..." className="bg-transparent border-none text-sm focus:outline-none w-full text-slate-600" />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <Dropdown menu={{ items: langugeMenuItems }} trigger={['click']}>
              <Button type="text" icon={<Languages size={20} className="text-slate-500" />}>
                <span className="ml-1 text-slate-500">{i18n.language === 'en' ? 'EN' : 'CN'}</span>
              </Button>
            </Dropdown>
            <div className="relative cursor-pointer">
              <HeaderIcon size={24} className="text-slate-500" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingLeft: 24, borderLeft: '1px solid #e2e8f0' }}>
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-800 leading-tight">{profile?.displayName}</p>
                <p className="text-xs text-slate-500 capitalize">{profile?.role} Manager</p>
              </div>
              <Dropdown menu={{ items: userMenuItems }}>
                <div style={{ cursor: 'pointer' }}>
                  <Avatar 
                    size={40}
                    style={{ border: '2px solid white', boxShadow: '0 0 0 1px #e2e8f0' }}
                    src={profile?.email ? `https://ui-avatars.com/api/?name=${profile.displayName}&background=e2e8f0&color=475569` : undefined} 
                  />
                </div>
              </Dropdown>
            </div>
          </div>
        </Header>
        <Content style={{ padding: '32px', background: '#f8fafc', overflowY: 'auto' }}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Outlet />
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  );
};
