import client from './client';
import type {
  LoginPayload, LoginResponse, Order, OrdersResponse,
  Voucher, Customer, DashboardData, SystemUser,
} from '../types/index';

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  login:  (data: LoginPayload) =>
    client.post<LoginResponse>('/login', data).then(r => r.data),
  logout: () => client.post('/logout'),
  me:     () => client.get('/me').then(r => r.data),
};

// ── Dashboard ─────────────────────────────────────────
export const dashboardApi = {
  get: (year: string) =>
    client.get<DashboardData>(`/dashboard?year=${year}`).then(r => r.data),
};

// ── Orders ────────────────────────────────────────────
export const ordersApi = {
  list: (params: { year: string; q?: string; page?: number; status?: string }) =>
    client.get<OrdersResponse>('/orders', { params }).then(r => r.data),
  get: (id: string, year: string) =>
    client.get<Order>(`/orders/${id}/${year}`).then(r => r.data),
  create: (data: Partial<Order>) =>
    client.post<Order>('/orders', data).then(r => r.data),
  update: (id: string, year: string, data: Partial<Order>) =>
    client.put<Order>(`/orders/${id}/${year}`, data).then(r => r.data),
  delete: (id: string, year: string) =>
    client.delete(`/orders/${id}/${year}`),
};

// ── Advanced Search ──────────────────────────────────
export const advancedSearchApi = {
  search: (filters: Record<string, any>) => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => 
        v !== undefined && 
        v !== '' && 
        v !== null && 
        v !== 'all'
      )
    );
    
    return client.post('/orders/search', cleanFilters).then(r => r.data);
  },
  
  export: (filters: Record<string, any>, format: 'csv' | 'excel' | 'pdf' = 'csv') => {
    const cleanFilters = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => 
        v !== undefined && 
        v !== '' && 
        v !== null
      )
    );
    
    return client.post('/orders/search/export', { ...cleanFilters, format }, { 
      responseType: 'blob' 
    }).then(r => r.data);
  },
};

// ── Vouchers ──────────────────────────────────────────
export const vouchersApi = {
  list: (order_id?: string, year?: string) =>
    client.get<Voucher[]>('/vouchers', { params: { order_id, year } }).then(r => r.data),
  create: (data: Partial<Voucher>) =>
    client.post<Voucher>('/vouchers', data).then(r => r.data),
  delete: (id: number) =>
    client.delete(`/vouchers/${id}`),
};

// ── Customers ─────────────────────────────────────────
export const customersApi = {
  list: (q?: string) =>
    client.get<Customer[]>('/customers', { params: { q } }).then(r => r.data),
  create: (data: { Customer: string; Activety?: string }) =>
    client.post<Customer>('/customers', data).then(r => r.data),
};

// ── Users ─────────────────────────────────────────────
export const usersApi = {
  list: () =>
    client.get<SystemUser[]>('/users').then(r => r.data),
  create: (data: { username: string; password: string; full_name: string; role: string }) =>
    client.post<SystemUser>('/users', data).then(r => r.data),
  update: (id: number, data: Partial<SystemUser> & { password?: string }) =>
    client.put<SystemUser>(`/users/${id}`, data).then(r => r.data),
  delete: (id: number) =>
    client.delete(`/users/${id}`),
};

// ── Operations (Actions) ──────────────────────────────
export const operationsApi = {
  list: (order_id: string, year: string) =>
    client.get(`/actions?order_id=${order_id}&year=${year}`).then(r => r.data),
  create: (data: any) => client.post('/actions', data).then(r => r.data),
  update: (id: string, data: any) => client.put(`/actions/${id}`, data).then(r => r.data),
  delete: (id: string) => client.delete(`/actions/${id}`),
};

// ── Materials ─────────────────────────────────────────
export const materialsApi = {
  list: (order_id: string, year: string) =>
    client.get(`/materials?order_id=${order_id}&year=${year}`).then(r => r.data),
  create: (data: any) => client.post('/materials', data).then(r => r.data),
  update: (id: string, data: any) => client.put(`/materials/${id}`, data).then(r => r.data),
  delete: (id: string) => client.delete(`/materials/${id}`),
};

// ── Cartons ───────────────────────────────────────────
export const cartonsApi = {
  list: (order_id: string, year: string) =>
    client.get(`/cartons?order_id=${order_id}&year=${year}`).then(r => r.data),
  create: (data: any) => client.post('/cartons', data).then(r => r.data),
  update: (id: string, data: any) => client.put(`/cartons/${id}`, data).then(r => r.data),
  delete: (id: string) => client.delete(`/cartons/${id}`),
};

// ── Problems ──────────────────────────────────────────
export const problemsApi = {
  list: (order_id: string, year: string) =>
    client.get(`/problems?order_id=${order_id}&year=${year}`).then(r => r.data),
  create: (data: any) => client.post('/problems', data).then(r => r.data),
  update: (id: string, data: any) => client.put(`/problems/${id}`, data).then(r => r.data),
  delete: (id: string) => client.delete(`/problems/${id}`),
};
