import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ordersApi, vouchersApi, customersApi, dashboardApi, usersApi, operationsApi, cartonsApi, problemsApi } from '../api/services';
import toast from 'react-hot-toast';

// ── Dashboard ─────────────────────────────────────────
export function useDashboard(Year: string) {
  return useQuery({
    queryKey: ['dashboard', Year],
    queryFn:  () => dashboardApi.get(Year),
  });
}

// ── Orders ────────────────────────────────────────────
export function useOrders(params: { Year: string; q?: string; page?: number; status?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn:  () => ordersApi.list(params),
    placeholderData: (prev) => prev,
  });
}

export function useOrder(id: string, Year: string) {
  return useQuery({
    queryKey: ['order', id, Year],
    queryFn:  () => ordersApi.get(id, Year),
    enabled:  !!id && !!Year,
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

export function useUpdateOrder(id: string, Year: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => ordersApi.update(id, Year, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      qc.invalidateQueries({ queryKey: ['order', id, Year] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('✅ تم تحديث الطلب');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ في التحديث'),
  });
}

export function useDeleteOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, Year }: { id: string; Year: string }) => ordersApi.delete(id, Year),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
      toast.success('تم الحذف');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'خطأ في الحذف'),
  });
}

// ── Vouchers ──────────────────────────────────────────
export function useVouchers(orderId: string, Year: string) {
  return useQuery({
    queryKey: ['vouchers', orderId, Year],
    queryFn:  () => vouchersApi.list(orderId, Year),
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

// ── Cartons ───────────────────────────────────────────
export function useCartons(orderId: string, Year: string) {
  return useQuery({
    queryKey: ['cartons', orderId, Year],
    queryFn:  () => cartonsApi.list(orderId, Year),
    enabled:  !!orderId && !!Year,
  });
}

export function useCreateCarton() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cartonsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cartons'] }); },
    onError: () => toast.error('خطأ في حفظ الكرتون'),
  });
}

export function useUpdateCarton() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, data }: { rowId: number; data: any }) => cartonsApi.update(rowId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cartons'] }); },
    onError: () => toast.error('خطأ في تحديث الكرتون'),
  });
}

export function useDeleteCarton() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cartonsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['cartons'] }); },
    onError: () => toast.error('خطأ في الحذف'),
  });
}

// ── Problems ──────────────────────────────────────────
export function useProblems(orderId: string, Year: string) {
  return useQuery({
    queryKey: ['problems', orderId, Year],
    queryFn:  () => problemsApi.list(orderId, Year),
    enabled:  !!orderId && !!Year,
  });
}

export function useCreateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: problemsApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); },
    onError: () => toast.error('خطأ في حفظ المشكلة'),
  });
}

export function useUpdateProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, data }: { rowId: number; data: any }) => problemsApi.update(rowId, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); },
    onError: () => toast.error('خطأ في تحديث المشكلة'),
  });
}

export function useDeleteProblem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: problemsApi.delete,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['problems'] }); },
    onError: () => toast.error('خطأ في الحذف'),
  });
}

// ── Operations ────────────────────────────────────────
export function useOperations(orderId: string, Year: string) {
  return useQuery({
    queryKey: ['operations', orderId, Year],
    queryFn:  () => operationsApi.list(orderId, Year),
    enabled:  !!orderId && !!Year,
  });
}

export function useCreateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: operationsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      toast.success('✅ تم حفظ العملية');
    },
    onError: () => toast.error('خطأ في حفظ العملية'),
  });
}

export function useUpdateOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ rowId, data }: { rowId: number; data: any }) =>
      operationsApi.update(rowId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
    },
    onError: () => toast.error('خطأ في تحديث العملية'),
  });
}

export function useDeleteOperation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: operationsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['operations'] });
      toast.success('تم حذف العملية');
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
