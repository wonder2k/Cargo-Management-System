import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, Link } from 'react-router-dom';
import { ConfigProvider, App as AntdApp } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { useTranslation } from 'react-i18next';
import { AuthProvider, useAuth } from './context/AuthContext';
import { MainLayout } from './layouts/MainLayout';

// Module Imports
import { Dashboard } from './modules/Dashboard';
import { BusinessModule } from './modules/Business';
import { OperationModule } from './modules/Operation';
import { FinanceModule } from './modules/Finance';
import { UserManagement } from './modules/Admin/UserManagement';

// Language toggle button used on login/register pages
const LangToggle = () => {
  const { i18n } = useTranslation();
  const next = i18n.language?.startsWith('zh') ? 'en' : 'zh';
  return (
    <button
      onClick={() => i18n.changeLanguage(next)}
      className="absolute top-3 right-3 z-10 text-xs text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-full border border-slate-200 transition"
    >
      {next === 'zh' ? '中文' : 'English'}
    </button>
  );
};

const LoginPage = () => {
  const { t } = useTranslation();
  const { login, demoLogin, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login({ email, password });
      navigate('/');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await demoLogin();
      navigate('/');
    } catch (_e) {
      setError('Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative">
        <LangToggle />
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="JCargo" className="h-10 w-auto" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-2">JCargo CMS</h2>
          <p className="text-slate-500 text-center mb-8 text-sm">{t('dashboard.overviewSubtitle')}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
              {error}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.email') || 'Email Address'}</label>
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
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.password') || 'Password'}</label>
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
              {loading ? t('common.process_login') || 'Authenticating...' : t('common.login') || 'Sign In'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/register" className="text-blue-600 text-sm hover:text-blue-800">
              {t('common.register') || "Don't have an account? Register here"}
            </Link>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            <button
              onClick={handleDemoLogin}
              className="w-full border border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              {t('common.demo') || 'Enter with Demo Account'}
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

const RegisterPage = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = React.useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    companyName: '',
    phone: '',
  });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const result = await register({
        email: formData.email,
        password: formData.password,
        name: formData.name || undefined,
        companyName: formData.companyName || undefined,
        phone: formData.phone || undefined,
      });
      setSuccess(result.message || 'Registration successful!');
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden relative">
        <LangToggle />
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <img src="/logo.png" alt="JCargo" className="h-10 w-auto" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 text-center mb-2">{t('common.register_title') || 'Create Account'}</h2>
          <p className="text-slate-500 text-center mb-8 text-sm">{t('common.register_subtitle') || 'Join JCargo Cargo Management System'}</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">{error}</div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-xs">{success}</div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.name') || 'Full Name'}</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Your Name"
                value={formData.name}
                onChange={handleChange('name')}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.email') || 'Email'} *</label>
              <input
                type="email"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="email@example.com"
                value={formData.email}
                onChange={handleChange('email')}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.company') || 'Company'}</label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="Company Name (Optional)"
                value={formData.companyName}
                onChange={handleChange('companyName')}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.password') || 'Password'} *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange('password')}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.confirmPassword') || 'Confirm'} *</label>
                <input
                  type="password"
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange('confirmPassword')}
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('common.phone') || 'Phone'}</label>
              <input
                type="tel"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                placeholder="+86 138-0000-0000"
                value={formData.phone}
                onChange={handleChange('phone')}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-200 disabled:opacity-50"
            >
              {loading ? t('common.process_register') || 'Creating Account...' : t('common.register') || 'Create Account'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/login" className="text-blue-600 text-sm hover:text-blue-800">
              {t('common.login_link') || 'Already have an account? Sign in'}
            </Link>
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
  const { i18n } = useTranslation();
  const lang = i18n.language || 'zh';
  const locale = lang.startsWith('zh') ? zhCN : enUS;

  return (
    <ConfigProvider
      locale={locale}
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
              <Route path="/register" element={<RegisterPage />} />
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
                <Route path="rates" element={<BusinessModule />} />
                <Route path="quotes" element={<BusinessModule />} />
                <Route path="bookings" element={<BusinessModule />} />
                <Route path="customers" element={<BusinessModule />} />
                <Route path="operation" element={<OperationModule />} />
                <Route path="finance" element={<FinanceModule />} />
                <Route path="users" element={<UserManagement />} />
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
