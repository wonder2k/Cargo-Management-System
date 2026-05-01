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
  const { login, demoLogin } = useAuth();
  const [email, setEmail] = React.useState('demo@jcargo.com');
  const [password, setPassword] = React.useState('password123');
  const [loading, setLoading] = React.useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ email, password });
    } catch (e) {
      alert('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">JC</div>
          </div>
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-2">JCargo CMS</h2>
          <p className="text-slate-500 text-center mb-8 text-sm">Professional Air Cargo Management System</p>
          
          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Email Address</label>
              <input 
                type="email" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Password</label>
              <input 
                type="password" 
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 flex flex-col gap-3">
             <button 
              onClick={demoLogin}
              className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Enter with Demo Account
            </button>
             <button 
              className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
              onClick={() => alert('Google login registration required in production environment.')}
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              Sign in with Google
            </button>
          </div>
        </div>
        <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-center">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">© 2025 JCargo Logistics Solutions</p>
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
                <Route path="rates" element={<BusinessModule />} />
                <Route path="quotes" element={<BusinessModule />} />
                <Route path="bookings" element={<BusinessModule />} />
                <Route path="business" element={<BusinessModule />} />
                <Route path="operation" element={<OperationModule />} />
                <Route path="finance" element={<FinanceModule />} />
                <Route path="users" element={<Dashboard />} />
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
