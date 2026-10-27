import axios from 'axios';
import { getApiUrl } from './apiUrl';

const api = axios.create({
  // Frontend and API ship together in the same Vercel project.
  baseURL: import.meta.env.PROD ? '/api' : getApiUrl(import.meta.env.VITE_API_URL),
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (config.url?.includes('/import') || config.url?.includes('/run-notifications')) {
    config.timeout = 300000;
  }
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
