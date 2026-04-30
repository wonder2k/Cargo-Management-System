import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import { AuthProvider, useAuth } from './context/AuthContext';
import zhCN from 'antd/locale/zh_CN';

// Placeholder components
const LoginPage = () => {
  const { login } = useAuth();
  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="p-8 bg-white rounded-lg shadow-md w-96">
        <h1 className="mb-6 text-2xl font-bold text-center">JCargo CMS</h1>
        <button 
          onClick={() => login({ email: 'admin@example.com', password: 'password' })}
          className="w-full py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
        >
          Demo Login
        </button>
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
