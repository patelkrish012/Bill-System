import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '3000' ? 'http://localhost:5000/api' : '/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('krish_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('krish_token');
      localStorage.removeItem('krish_user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data),
};

export const settingsAPI = {
  getSettings: () => api.get('/settings'),
  updateBusiness: (data) => api.put('/settings/business', data),
  addBank: (data) => api.post('/settings/bank', data),
  updateBank: (id, data) => api.put(`/settings/bank/${id}`, data),
  deleteBank: (id) => api.delete(`/settings/bank/${id}`),
  addTerm: (data) => api.post('/settings/terms', data),
  updateTerm: (id, data) => api.put(`/settings/terms/${id}`, data),
  deleteTerm: (id) => api.delete(`/settings/terms/${id}`),
};

export const customersAPI = {
  getAll: (params) => api.get('/customers', { params }),
  getById: (id) => api.get(`/customers/${id}`),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
};

export const itemsAPI = {
  getAll: (params) => api.get('/items', { params }),
  getById: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  duplicate: (id) => api.post(`/items/${id}/duplicate`),
  delete: (id) => api.delete(`/items/${id}`),
};

export const billsAPI = {
  getNextNumber: () => api.get('/bills/next-number'),
  getAll: (params) => api.get('/bills', { params }),
  getById: (id) => api.get(`/bills/${id}`),
  create: (data) => api.post('/bills', data),
  update: (id, data) => api.put(`/bills/${id}`, data),
  delete: (id) => api.delete(`/bills/${id}`),
};

export const paymentsAPI = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
  delete: (id) => api.delete(`/payments/${id}`),
};

export const reportsAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getMonthly: (params) => api.get('/reports/monthly', { params }),
  getYearly: (params) => api.get('/reports/yearly', { params }),
  getItems: (params) => api.get('/reports/items', { params }),
  getCustomers: (params) => api.get('/reports/customers', { params }),
};

export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const backupAPI = {
  getAuditLogs: (params) => api.get('/backup/audit-logs', { params }),
  exportJsonUrl: `${API_BASE_URL}/backup/export-json`,
  exportCsvUrl: (entity) => `${API_BASE_URL}/backup/export-csv/${entity}`,
};

export default api;
