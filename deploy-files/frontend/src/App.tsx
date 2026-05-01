import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';

// Module Imports
import { Dashboard } from './modules/Dashboard';
import { BusinessModule } from './modules/Business';
import { OperationModule } from './modules/Operation';
import { FinanceModule } from './modules/Finance';

const LoginPage = () => {
  const { demoLogin } = useAuth();
  
  return (
    <div className="flex items-center justify-center h-screen bg-slate-100">
      <div className="p-10 bg-white shadow-xl rounded-2xl w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-2 text-slate-800">JCargo</h1>
        <p className="text-center text-slate-500 mb-8 text-sm">PostgreSQL + Drizzle Version</p>
        
        <button 
          onClick={async () => {
            try {
              await demoLogin();
              // After success, Navigate will take care of it if user state updates
            } catch (e) {
              alert('Login failed');
            }
          }}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition duration-200 shadow-md"
        >
          Quick Demo Login
        </button>
        
        <div className="mt-8 text-center text-xs text-slate-400">
          Backend: Express / DB: PostgreSQL
        </div>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-slate-500 animate-pulse font-medium">Initializing JCargo CMS...</div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider 
      locale={zhCN} 
      theme={{ 
        token: { 
          colorPrimary: '#2563eb',
          borderRadius: 8,
        } 
      }}
    >
      <AntdApp>
        <AuthProvider>
          <Router>
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
                <Route path="business" element={<BusinessModule />} />
                <Route path="operation" element={<OperationModule />} />
                <Route path="finance" element={<FinanceModule />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </Router>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
