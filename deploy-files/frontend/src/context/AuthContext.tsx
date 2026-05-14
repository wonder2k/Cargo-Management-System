import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../services/api';

export interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  status?: string;
  tier: number;
  companyName?: string;
  phone?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (credentials: { email: string; password: string }) => Promise<void>;
  register: (data: { email: string; password: string; name?: string; companyName?: string; phone?: string }) => Promise<any>;
  demoLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const response = await authApi.getProfile();
      setUser(response.data);
    } catch (_err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();

    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (credentials: { email: string; password: string }) => {
    const response = await authApi.login(credentials);
    setUser(response.data.user);
  };

  const register = async (data: { email: string; password: string; name?: string; companyName?: string; phone?: string }) => {
    const response = await authApi.register(data);
    if (response.data.user) {
      setUser(response.data.user);
    }
    return response.data;
  };

  const demoLogin = async () => {
    const response = await authApi.demoLogin();
    setUser(response.data.user);
  };

  const logout = async () => {
    await authApi.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    await fetchProfile();
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      register,
      demoLogin,
      logout,
      refreshUser,
      isAdmin: user?.role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
