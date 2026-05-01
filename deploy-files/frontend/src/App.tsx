import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

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
              window.location.href = '/'; // 强制跳转
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

const Dashboard = () => {
  const { user, logout } = useAuth();
  return (
    <div className="p-10">
      <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-2xl font-bold mb-4">Welcome back, {user?.name}!</h2>
        <div className="space-y-2 text-slate-600">
          <p>Email: {user?.email}</p>
          <p>Role: <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs uppercase font-bold">{user?.role}</span></p>
        </div>
        <button 
          onClick={logout}
          className="mt-8 px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 transition"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex h-screen items-center justify-center">Loading Application...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/*" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;