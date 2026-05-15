/// <reference types="vite/client" />
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth-unauthorized'));
    }
    return Promise.reject(error);
  }
);

// ====== Auth API ======
export const authApi = {
  login: (data: { email: string; password: string }) => api.post('/auth/login', data),
  register: (data: { email: string; password: string; name?: string; companyName?: string; phone?: string }) =>
    api.post('/auth/register', data),
  demoLogin: () => api.post('/auth/demo-login'),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  getUsers: () => api.get('/auth/users'),
  updateUser: (id: number | string, data: any) => api.put(`/auth/users/${id}`, data),
};

// ====== Business API ======
export const businessApi = {
  getStats: () => api.get('/business/dashboard-stats'),
  getModuleStats: () => api.get('/business/module-stats'),

  // Customers
  getCustomers: () => api.get('/business/customers'),
  createCustomer: (data: any) => api.post('/business/customers', data),
  updateCustomer: (id: string | number, data: any) => api.put(`/business/customers/${id}`, data),
  deleteCustomer: (id: string | number) => api.delete(`/business/customers/${id}`),

  // Rates
  getRates: () => api.get('/business/rates'),
  createRate: (data: any) => api.post('/business/rates', data),
  updateRate: (id: string | number, data: any) => api.put(`/business/rates/${id}`, data),
  deleteRate: (id: string | number) => api.delete(`/business/rates/${id}`),

  // Quotes
  getQuotes: () => api.get('/business/quotes'),
  createQuote: (data: any) => api.post('/business/quotes', data),
  updateQuote: (id: string | number, data: any) => api.put(`/business/quotes/${id}`, data),

  // Bookings
  getBookings: () => api.get('/business/bookings'),
  createBooking: (data: any) => api.post('/business/bookings', data),
  updateBooking: (id: string | number, data: any) => api.put(`/business/bookings/${id}`, data),
  deleteBooking: (id: string | number) => api.delete(`/business/bookings/${id}`),
};

// ====== Operation API ======
export const operationApi = {
  getMawbs: (status?: string) => api.get(`/operation/mawbs${status ? `?status=${status}` : ''}`),
  createMawb: (data: any) => api.post('/operation/mawbs', data),
  updateMawb: (id: string | number, data: any) => api.post(`/operation/mawbs/${id}/status`, data),
  getTracking: (mawbNo: string) => api.get(`/operation/tracking/${mawbNo}`),
  getStats: () => api.get('/operation/stats'),
};

// ====== Finance API ======
export const financeApi = {
  // Invoices
  getInvoices: () => api.get('/finance/invoices'),
  createInvoice: (data: any) => api.post('/finance/invoices', data),
  updateInvoice: (id: string | number, data: any) => api.put(`/finance/invoices/${id}`, data),

  // AR
  getAR: () => api.get('/finance/ar'),
  createAR: (data: any) => api.post('/finance/ar', data),
  updateAR: (id: string | number, data: any) => api.put(`/finance/ar/${id}`, data),

  // AP
  getAP: () => api.get('/finance/ap'),
  createAP: (data: any) => api.post('/finance/ap', data),
  updateAP: (id: string | number, data: any) => api.put(`/finance/ap/${id}`, data),

  // Stats
  getStats: () => api.get('/finance/stats'),
};

export default api;
