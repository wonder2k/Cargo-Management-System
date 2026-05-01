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

export default api;