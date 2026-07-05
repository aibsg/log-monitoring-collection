import axios from 'axios';

// Vite env vars must be prefixed with VITE_
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://lablabnet.ru/api'; //Костыль

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`Making ${config.method?.toUpperCase()} request to ${config.url}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export const invoiceAPI = {
  // Get all invoices with pagination and filters
  getInvoices: (params = {}) => {
    return api.get("/invoices", { params });
  },

  // Get single invoice
  getInvoice: (id) => {
    return api.get(`/invoices/${id}`);
  },

  createInvoice: (data) => {
    if (data.status) data.status = data.status.toUpperCase();
    return api.post("/invoices", data);
  },

  // Update invoice
  updateInvoice: (id, data) => {
    if (data.status) data.status = data.status.toUpperCase();
    return api.put(`/invoices/${id}`, data);
  },

  // Delete invoice
  deleteInvoice: (id) => {
    return api.delete(`/invoices/${id}`);
  },

  // Get statistics
  getStats: () => {
    return api.get("/stats");
  },
};

export default api;

