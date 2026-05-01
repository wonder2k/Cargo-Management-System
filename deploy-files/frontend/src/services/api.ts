import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // 必须开启，否则无法跨域携带 Cookie
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

export const businessApi = {
  getStats: () => api.get('/business/dashboard-stats'),
  getCustomers: () => api.get('/business/customers'),
  createCustomer: (data: any) => api.post('/business/customers', data),
  updateCustomer: (id: string | number, data: any) => api.put(`/business/customers/${id}`, data),
  
  getRates: () => api.get('/business/rates'),
  createRate: (data: any) => api.post('/business/rates', data),
  updateRate: (id: string | number, data: any) => api.put(`/business/rates/${id}`, data),
  deleteRate: (id: string | number) => api.delete(`/business/rates/${id}`),

  getQuotes: () => api.get('/business/quotes'),
  createQuote: (data: any) => api.post('/business/quotes', data),
  
  getBookings: () => api.get('/business/bookings'),
  createBooking: (data: any) => api.post('/business/bookings', data),
  updateBooking: (id: string | number, data: any) => api.put(`/business/bookings/${id}`, data),
};

export const operationApi = {
  getMawbs: (status?: string) => api.get(`/operation/mawbs${status ? `?status=${status}` : ''}`),
  updateMawb: (id: string | number, data: any) => api.post(`/operation/mawbs/${id}/status`, data),
  getTracking: (mawbNo: string) => api.get(`/operation/tracking/${mawbNo}`),
};

export const financeApi = {
  getInvoices: () => api.get('/finance/invoices'),
  createInvoice: (data: any) => api.post('/finance/invoices', data),
  updateInvoice: (id: string | number, data: any) => api.put(`/finance/invoices/${id}`, data),
  getAR: () => api.get('/finance/ar'),
  updateAR: (id: string | number, data: any) => api.put(`/finance/ar/${id}`, data),
  getAP: () => api.get('/finance/ap'),
  updateAP: (id: string | number, data: any) => api.put(`/finance/ap/${id}`, data),
};

export default api;