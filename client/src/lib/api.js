import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem('sg_token');
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err?.config?.url || "";
    // The signup auto-fill probe and Google auth endpoints run while the user
    // is NOT yet logged in; a 401 there must NOT boot them to /login.
    const isPublic = /\/auth\/google|\/auth\/login|\/auth\/signup|\/auth\/send-otp/.test(url);
    const isAuthPage = typeof window !== 'undefined' && ['/login', '/register'].includes(window.location.pathname);
    if (err?.response?.status === 401 && !isPublic && !isAuthPage) {
      localStorage.removeItem('sg_token');
      localStorage.removeItem('sg_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
