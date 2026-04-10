import client from './client';
import type {
  LoginPayload, LoginResponse, Order, OrdersResponse,
  Voucher, Customer, DashboardData, SystemUser,
} from '../types';

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

// ── Vouchers ──────────────────────────────────────────
export const vouchersApi = {
  list: (orderId: string, year: string) =>
    client.get<Voucher[]>('/vouchers', { params: { order_id: orderId, year } }).then(r => r.data),
  create: (data: Partial<Voucher>) =>
    client.post<Voucher>('/vouchers', data).then(r => r.data),
  delete: (rowId: number) =>
    client.delete(`/vouchers/${rowId}`),
};

// ── Cartons ───────────────────────────────────────────
export const cartonsApi = {
  list: (orderId: string, year: string) =>
    client.get<any[]>('/cartons', { params: { order_id: orderId, year } }).then(r => r.data),
  create: (data: any) =>
    client.post<any>('/cartons', data).then(r => r.data),
  update: (rowId: number, data: any) =>
    client.put<any>(`/cartons/${rowId}`, data).then(r => r.data),
  delete: (rowId: number) =>
    client.delete(`/cartons/${rowId}`),
};

// ── Problems ──────────────────────────────────────────
export const problemsApi = {
  list: (orderId: string, year: string) =>
    client.get<any[]>('/problems', { params: { order_id: orderId, year } }).then(r => r.data),
  create: (data: any) =>
    client.post<any>('/problems', data).then(r => r.data),
  update: (rowId: number, data: any) =>
    client.put<any>(`/problems/${rowId}`, data).then(r => r.data),
  delete: (rowId: number) =>
    client.delete(`/problems/${rowId}`),
};

// ── Operations (actions table) ────────────────────────
export const operationsApi = {
  list: (orderId: string, year: string) =>
    client.get<any[]>('/actions', { params: { order_id: orderId, year } }).then(r => r.data),
  create: (data: any) =>
    client.post<any>('/actions', data).then(r => r.data),
  update: (rowId: number, data: any) =>
    client.put<any>(`/actions/${rowId}`, data).then(r => r.data),
  delete: (rowId: number) =>
    client.delete(`/actions/${rowId}`),
};

// ── Customers ─────────────────────────────────────────
export const customersApi = {
  list: (q?: string) =>
    client.get<Customer[]>('/customers', { params: { q } }).then(r => r.data),
  create: (data: { Customer: string; Activety?: string }) =>
    client.post<Customer>('/customers', data).then(r => r.data),
};

// ── Users (admin) ─────────────────────────────────────
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
