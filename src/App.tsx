import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, Spin, App as AntdApp } from 'antd';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './modules/Auth/LoginPage';
import { Dashboard } from './modules/Dashboard/Dashboard';
import { CustomerList } from './modules/Business/CustomerList';
import { PricingList } from './modules/Business/PricingList';
import { BookingList } from './modules/Business/BookingList';
import { MawbList } from './modules/Operation/MawbList';
import { InvoiceList } from './modules/Finance/InvoiceList';
import { UserManagement } from './modules/Admin/UserManagement';
import { PersonalCenter } from './modules/Auth/PersonalCenter';
import { QuotationHistory } from './modules/Business/QuotationHistory';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <Spin size="large" tip="Loading CMS..." fullscreen />
    );
  }

  if (!user || profile?.status !== 'approved') {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#2563eb', // blue-600
          borderRadius: 8,
          colorBgLayout: '#f8fafc', // slate-50
          fontFamily: '"Inter", system-ui, sans-serif',
        },
        components: {
          Card: {
            boxShadowSecondary: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
          },
          Layout: {
            siderBg: '#0f172a', // slate-950
          },
          Menu: {
            darkItemBg: '#0f172a',
            darkItemColor: '#94a3b8', // slate-400
            darkItemSelectedBg: '#2563eb',
            darkItemSelectedColor: '#ffffff',
          }
        }
      }}
    >
      <AntdApp>
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <MainLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Dashboard />} />
                <Route path="customers" element={<CustomerList />} />
                <Route path="business" element={<PricingList />} />
                <Route path="quotes" element={<QuotationHistory />} />
                <Route path="bookings" element={<BookingList />} />
                <Route path="operation" element={<MawbList />} />
                <Route path="finance" element={<InvoiceList />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="profile" element={<PersonalCenter />} />
                <Route path="*" element={<Navigate to="/" />} />
              </Route>
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
