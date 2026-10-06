import axios from 'axios';

const getDefaultApiUrl = () => {
  const configured = import.meta.env.VITE_API_URL;
  if (configured) return configured;

  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return 'http://localhost:5000/api';
  }

  // Fallback to deployed Railway API if VITE_API_URL was not set during build
  if (hostname.endsWith('.vercel.app')) {
    return 'https://studentattendencemanagement-production.up.railway.app/api';
  }

  return `http://${hostname}:5000/api`;
};

const api = axios.create({
  baseURL: getDefaultApiUrl(),
});

api.interceptors.request.use((config) => {
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
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
