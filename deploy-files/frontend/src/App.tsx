import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import zhCN from 'antd/locale/zh_CN';

// Placeholder components
const LoginPage = () => {
  const { demoLogin } = useAuth();
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 className="mb-6 text-2xl font-bold text-center text-slate-800">JCargo CMS</h1>
        <p className="mb-6 text-sm text-center text-slate-500">Log in to your cargo management system</p>
        <button 
          onClick={() => demoLogin()}
          className="w-full py-3 text-sm font-medium text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-100"
        >
          Quick Demo Login
        </button>
        <div className="mt-6 pt-6 border-t border-slate-100 text-xs text-center text-slate-400">
          Independent PostgreSQL + Drizzle deployment
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome, {user?.name} ({user?.role})</p>
      <button 
        onClick={logout}
        className="mt-4 px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
      >
        Logout
      </button>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN} theme={{ token: { primaryColor: '#1d4ed8' } }}>
      <AntdApp>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route 
                path="/*" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </Router>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

export default App;
