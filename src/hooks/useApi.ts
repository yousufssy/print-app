import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, vouchersApi, customersApi, dashboardApi, usersApi } from '../api/services';
import toast from 'react-hot-toast';

// ── Dashboard ─────────────────────────────────────────
export function useDashboard(year: string) {
  return useQuery({
    queryKey: ['dashboard', year],
    queryFn:  () => dashboardApi.get(year),
  });
}

// ── Orders ────────────────────────────────────────────
export function useOrders(params: { year: string; q?: string; page?: number; status?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn:  () => ordersApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string, year: string) {
  return useQuery({
    queryKey: ['order', id, year],
    queryFn:  () => ordersApi.get(id, year),
    enabled:  !!id && !!year,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ordersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('✅ تم حفظ الطلب بنجاح');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ في الحفظ'),
  });
}

export function useUpdateOrder(id: string, year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => ordersApi.update(id, year, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', id, year] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('✅ تم تحديث الطلب');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ في التحديث'),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, year }: { id: string; year: string }) => ordersApi.delete(id, year),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('تم الحذف');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ في الحذف'),
  });
}

// ── Vouchers ──────────────────────────────────────────
export function useVouchers(orderId: string, year: string) {
  return useQuery({
    queryKey: ['vouchers', orderId, year],
    queryFn:  () => vouchersApi.list(orderId, year),
    enabled:  !!orderId,
  });
}

export function useCreateVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vouchersApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('✅ تم حفظ الإيصال');
    },
    onError: () => toast.error('خطأ في حفظ الإيصال'),
  });
}

export function useDeleteVoucher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: vouchersApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      toast.success('تم حذف الإيصال');
    },
    onError: () => toast.error('خطأ في الحذف'),
  });
}

// ── Customers ─────────────────────────────────────────
export function useCustomers(q?: string) {
  return useQuery({
    queryKey: ['customers', q],
    queryFn:  () => customersApi.list(q),
  });
}

// ── Users ─────────────────────────────────────────────
export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: usersApi.list });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('✅ تم إضافة المستخدم'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ'),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => usersApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('✅ تم التحديث'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ'),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('تم الحذف'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ'),
  });
}
