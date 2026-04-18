import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  useOrder, useCreateOrder, useUpdateOrder, useCustomers, useVouchers,
  useCreateVoucher, useOrders, useOperations,
  useCreateOperation, useUpdateOperation, useDeleteOperation,
  useCartons, useCreateCarton, useUpdateCarton, useDeleteCarton,
  useProblems, useCreateProblem, useUpdateProblem, useDeleteProblem
} from '../hooks/useApi';
import { FormGroup, SectionDiv, CheckItem, Btn } from '../components/ui';
import type { Order } from '../types';

function G({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <FormGroup label={label} required={req}>{children}</FormGroup>;
}

function AccordionCard({
  title,
  children,
  isOpen,
  onToggle
}: {
  title: string;
  children: React.ReactNode;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="border border-slate-200 rounded-xl mb-4 bg-white overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className={`w-full px-5 py-3.5 flex items-center justify-between text-right text-sm font-bold transition-all duration-200 ${
          isOpen ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-800 hover:bg-slate-100'
        }`}
        dir="rtl"
      >
        <span>{title}</span>
        <span className={`transform transition-transform duration-200 ${isOpen ? 'rotate-180' : 'rotate-0'}`}>
          ▼
        </span>
      </button>

      <div className={`transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[3000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

const InlineTable = React.memo(function InlineTable({
  cols,
  rows,
  onRowsChange,
  syncDraftRows = false,
}: {
  cols: { key: string; label: string; type?: string; width?: number }[];
  rows: Record<string, string>[];
  onRowsChange: (rows: Record<string, string>[]) => void | Promise<void>;
  syncDraftRows?: boolean;
}) {
  const [localRows, setLocalRows] = React.useState<Record<string, string>[]>([]);
  const [saving, setSaving] = React.useState<Record<number, boolean>>({});
  const [dirtyRows, setDirtyRows] = React.useState<Set<number>>(new Set());

  const rowsRef = React.useRef(rows);

  React.useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  React.useEffect(() => {
    setLocalRows(rows);
    setDirtyRows(new Set());
  }, [rows]);

  const isNumericCol = React.useCallback(
    (key: string) => cols.some((c) => c.key === key && c.type === 'number'),
    [cols]
  );

  const cleanNumber = React.useCallback((value: string) => {
    if (value === '') return '';
    let v = value.replace(/[^0-9.\-]/g, '');
    const minusCount = (v.match(/-/g) || []).length;
    if (minusCount > 1) v = v.replace(/-/g, '');
    if (v.includes('-') && v.indexOf('-') !== 0) v = v.replace(/-/g, '');
    const parts = v.split('.');
    if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
    return v;
  }, []);

  const pushDraftRows = React.useCallback(
    (nextRows: Record<string, string>[]) => {
      if (!syncDraftRows) return;
      void onRowsChange(nextRows.map(({ _isNew, ID, ...row }) => row));
    },
    [onRowsChange, syncDraftRows]
  );

  const addRow = React.useCallback(() => {
    const empty = Object.fromEntries(cols.map((c) => [c.key, '']));
    setLocalRows((prev) => {
      const nextRows = [...prev, { ...empty, ID: '', _isNew: 'true' }];
      pushDraftRows(nextRows);
      return nextRows;
    });
  }, [cols, pushDraftRows]);

  const setCell = React.useCallback((i: number, key: string, value: string) => {
    const finalValue = isNumericCol(key) ? cleanNumber(value) : value;
    setLocalRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, [key]: finalValue } : r)));
    setDirtyRows((prev) => {
      const next = new Set(prev);
      next.add(i);
      return next;
    });
  }, [isNumericCol, cleanNumber]);

  const saveRow = React.useCallback(async (i: number) => {
    const row = localRows[i];
    if (!row) return;

    setSaving((s) => ({ ...s, [i]: true }));
    try {
      const { _isNew, ID, ...fields } = row;
      if (_isNew === 'true') {
        const allRows = [...rowsRef.current, { ...fields }];
        await onRowsChange(allRows);
      } else if (ID) {
        const updated = rowsRef.current.map((r) => (r.ID === ID ? row : r));
        await onRowsChange(updated);
      }
      setDirtyRows((prev) => {
        const next = new Set(prev);
        next.delete(i);
        return next;
      });
    } finally {
      setSaving((s) => ({ ...s, [i]: false }));
    }
  }, [localRows, onRowsChange]);

  const delRow = React.useCallback(async (i: number) => {
    const row = localRows[i];
    if (!row) return;

    if (row._isNew === 'true') {
      setLocalRows((prev) => {
        const nextRows = prev.filter((_, idx) => idx !== i);
        pushDraftRows(nextRows);
        return nextRows;
      });
    } else {
      setLocalRows((prev) => prev.filter((_, idx) => idx !== i));
      const remaining = rowsRef.current.filter((r) => r.ID !== row.ID);
      await onRowsChange(remaining);
    }
  }, [localRows, pushDraftRows, onRowsChange]);

  return (
    <div className="overflow-x-auto mt-2 border border-slate-200 rounded-lg">
      <table className="w-full border-collapse text-xs text-right">
        <thead>
          <tr className="bg-slate-700 text-white font-bold">
            {cols.map((c) => (
              <th key={c.key} className="p-2.5 whitespace-nowrap" style={{ width: c.width }}>{c.label}</th>
            ))}
            <th className="p-2.5 w-12"></th>
          </tr>
        </thead>
        <tbody>
          {localRows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} className="text-center text-slate-400 py-6 font-semibold">
                ✦ لا توجد سجلات — اضغط ➕ لإضافة سطر
              </td>
            </tr>
          )}

          {localRows.map((row, i) => (
            <tr key={row.ID || `new-${i}`} className={`border-b border-slate-100 ${row._isNew === 'true' ? 'bg-amber-50' : i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}`}>
              {cols.map((c) => {
                const isNumber = c.type === 'number';
                const value = isNumber ? cleanNumber(String(row[c.key] ?? '')) : (row[c.key] ?? '');

                return (
                  <td key={`${c.key}-${i}`} className="p-1.5 border-r border-slate-100">
                    <input
                      value={value}
                      type={c.type === 'date' ? 'date' : 'text'}
                      inputMode={isNumber ? 'decimal' : undefined}
                      onChange={(e) => setCell(i, c.key, e.target.value)}
                      className="w-full bg-transparent text-xs font-semibold px-2 py-1 outline-none text-slate-800 text-right focus:bg-white focus:shadow-sm focus:rounded"
                    />
                  </td>
                );
              })}

              <td className="p-1.5 text-center flex justify-center items-center gap-1">
                {saving[i] ? (
                  <span className="text-slate-400">⏳</span>
                ) : (
                  <>
                    {(row._isNew === 'true' || dirtyRows.has(i)) && (
                      <button type="button" onClick={() => saveRow(i)} className="text-green-600 hover:scale-110 text-base" title="حفظ">💾</button>
                    )}
                    <button type="button" onClick={() => delRow(i)} className="text-red-500 hover:scale-110 text-base" title="حذف">🗑</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={cols.length + 1} className="p-2">
              <button
                type="button"
                onClick={addRow}
                className="w-full text-slate-400 hover:text-slate-600 py-2 font-semibold text-center border-2 border-dashed border-slate-200 hover:border-slate-300 rounded-lg transition-all"
              >
                ➕ إضافة سطر
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
});

function VoucherModal({ open, onClose, orderId, orderYear }: {
  open: boolean; onClose: () => void; orderId: string; orderYear: string;
}) {
  const create = useCreateVoucher();
  const [form, setForm] = useState({
    Voucher_num: '', V_date: '', V_Qunt: '', Bill_Num: '',
    Contean: '', Paking_q: '', Box_tp: '', Box_L: '', Box_W: '', Box_H: '',
  });

  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(f => ({ ...f, [k]: e.target.value }));
  };

  if (!open) return null;

  return (
    <div onClick={onClose} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-right" dir="rtl">
      <div onClick={e => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-lg shadow-xl border border-slate-200">
        <h3 className="text-sm font-black text-slate-900 border-b border-slate-100 pb-3 mb-4">➕ إضافة إيصال جديد</h3>
        <div className="grid grid-cols-2 gap-3">
          <FormGroup label="رقم الإيصال"><input className="fc" value={form.Voucher_num} onChange={F('Voucher_num')} /></FormGroup>
          <FormGroup label="تاريخ الإيصال"><input className="fc" type="date" value={form.V_date} onChange={F('V_date')} /></FormGroup>
          <FormGroup label="الحد (الكمية)"><input className="fc" type="number" value={form.V_Qunt} onChange={F('V_Qunt')} /></FormGroup>
          <FormGroup label="رقم الفاتورة"><input className="fc" value={form.Bill_Num} onChange={F('Bill_Num')} /></FormGroup>
          <FormGroup label="النوع"><input className="fc" value={form.Contean} onChange={F('Contean')} /></FormGroup>
          <FormGroup label="عدد العلب"><input className="fc" type="number" value={form.Paking_q} onChange={F('Paking_q')} /></FormGroup>
        </div>
        <SectionDiv label="أبعاد الكرتون (ط × ع × ا)" />
        <div className="grid grid-cols-4 gap-2 mt-2">
          <FormGroup label="النوع"><input className="fc" value={form.Box_tp} onChange={F('Box_tp')} /></FormGroup>
          <FormGroup label="ط"><input className="fc" type="number" value={form.Box_L} onChange={F('Box_L')} /></FormGroup>
          <FormGroup label="ع"><input className="fc" type="number" value={form.Box_W} onChange={F('Box_W')} /></FormGroup>
          <FormGroup label="ا"><input className="fc" type="number" value={form.Box_H} onChange={F('Box_H')} /></FormGroup>
        </div>
        <div className="flex gap-2 justify-end mt-6 border-t pt-4">
          <Btn variant="outline" type="button" onClick={onClose}>إلغاء</Btn>
          <Btn variant="primary" type="button" disabled={create.isPending}
            onClick={async () => {
              await create.mutateAsync({ ...form, ID: orderId, Year: orderYear });
              onClose();
            }}>
            {create.isPending ? '⏳...' : '✅ حفظ الإيصال'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

const MATERIALS_COLS = [
  { key: 'Type1', label: 'النوع' },
  { key: 'Id_carton', label: 'رقم الكرتون' },
  { key: 'Source1', label: 'المصدر' },
  { key: 'Supplier1', label: 'المورد' },
  { key: 'Long1', label: 'الطول', type: 'number' },
  { key: 'Width1', label: 'العرض', type: 'number' },
  { key: 'Gramage1', label: 'غراماج', type: 'number' },
  { key: 'Sheet_count1', label: 'عدد الأطباق', type: 'number' },
  { key: 'Price', label: 'السعر' },
  { key: 'Out_Date', label: 'تاريخ الإخراج', type: 'date' },
  { key: 'Out_ord_num', label: 'رقم أمر الإخراج' },
  { key: 'note_crt', label: 'ملاحظات' },
];

const PROBLEMS_COLS = [
  { key: 'print_num', label: 'رقم الطبع' },
  { key: 'prod_date', label: 'تاريخ الإنتاج', type: 'date' },
  { key: 'exp_date', label: 'تاريخ الانتهاء', type: 'date' },
  { key: 'print_count', label: 'عدد الطبع', type: 'number' },
];

const OPERATIONS_COLS = [
  { key: 'Action', label: 'العملية' },
  { key: 'Color', label: 'اللون' },
  { key: 'Qunt_Ac', label: 'الكمية', type: 'number' },
  { key: 'On', label: 'على', type: 'number' },
  { key: 'Machin', label: 'الآلة' },
  { key: 'Hours', label: 'الساعات', type: 'number' },
  { key: 'Kelo', label: 'كيلو', type: 'number' },
  { key: 'Actual', label: 'الفعلي', type: 'number' },
  { key: 'Tarkeb', label: 'تركيب', type: 'number' },
  { key: 'Wash', label: 'غسيل', type: 'number' },
  { key: 'Electricity', label: 'كهرباء', type: 'number' },
  { key: 'Taghez', label: 'تجهيز', type: 'number' },
  { key: 'StopVar', label: 'توقف', type: 'number' },
  { key: 'Date', label: 'التاريخ', type: 'date' },
  { key: 'NotesA', label: 'ملاحظات' },
  { key: 'Tabrer', label: 'تبرير' },
];

const MFG_MAP: Record<string, string> = {
  'برنيش': 'varnich',
  'تلميع بقعي': 'uv_Spot',
  'تلميع كامل': 'uv',
  'سلفان لميع': 'seluvan_lum',
  'سلفان مات': 'seluvan_mat',
  'طُبعت؟': 'Printed',
};

const CUST_MAP: Record<string, string> = {
  'مع طبخة': 'tabkha',
  'مع تطوية': 'Tay',
  'تدعيم زكزاك': 'Tad3em',
  'حراري': 'harary',
  'بلص': 'bals',
};

const toBit = (val: any): number =>
  val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true' ? 1 : 0;

const fromBit = (val: any): boolean =>
  val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true';

const BOOL_FIELDS = [
  'varnich', 'uv', 'uv_Spot', 'seluvan_lum', 'seluvan_mat',
  'Tad3em', 'Tay', 'harary', 'rolling', 'Printed', 'Billed', 'Reseved'
];

export default function OrderFormPage() {
  const { id, year } = useParams<{ id?: string; year?: string }>();
  const isEdit = !!(id && year && String(id).trim() && String(year).trim());
  const navigate = useNavigate();

  const { data: existing } = useOrder(id ?? '', year ?? '');

  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder(id ?? '', year ?? '');
  
  const { data: customers = [] } = useCustomers();

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [mfgChecks, setMfgChecks] = useState<Record<string, boolean>>({});
  const [custChecks, setCustChecks] = useState<Record<string, boolean>>({});
  const [voucherOpen, setVoucherOpen] = useState(false);

  const [idInitialized, setIdInitialized] = useState(false);
  const [hasLoadedEdit, setHasLoadedEdit] = useState(false);

  const [currentYear] = useState(String(new Date().getFullYear()));

  const { register, handleSubmit, reset, setValue } = useForm<Order>({
    defaultValues: {
      Year: year || currentYear,
      ID: '',
      Ser: ''
    }
  });

  const syncRows = useCallback(async (
    oldRows: Record<string, string>[],
    newRows: Record<string, string>[],
    onCreate: (fields: any) => Promise<any>,
    onUpdate: (rowId: number, fields: any) => Promise<any>,
    onDelete: (rowId: number) => Promise<any>,
  ) => {
    const oldIds = new Set(oldRows.map(r => r.ID).filter(v => !!v));
    const newIds = new Set(newRows.map(r => r.ID).filter(v => !!v));

    try {
      for (const old of oldRows) {
        if (old.ID && !newIds.has(old.ID)) {
          await onDelete(Number(old.ID)).catch(console.error);
        }
      }
      for (const row of newRows) {
        const { ID, _isNew, ...fields } = row;
        if (ID && oldIds.has(ID)) {
          await onUpdate(Number(ID), fields).catch(console.error);
        } else if (!ID) {
          await onCreate(fields).catch(console.error);
        }
      }
    } catch (error) {
      console.error('syncRows error:', error);
    }
  }, []);

  // ── الكرتون ──
  const { data: cartonsData = [] } = useCartons(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
  const createCarton = useCreateCarton();
  const updateCarton = useUpdateCarton();
  const deleteCarton = useDeleteCarton();

  const [materialsRows, setMaterialsRows] = useState<Record<string, string>[]>([]);
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, string>[]>([]);

  useEffect(() => {
    setMaterialsRows(cartonsData.map((c: any) => ({
      ID: String(c.ID1 ?? c.ID ?? ''),
      Type1: c.Type1 ?? '', Id_carton: c.Id_carton ?? '', Source1: c.Source1 ?? '', Supplier1: c.Supplier1 ?? '',
      Long1: String(c.Long1 ?? ''), Width1: String(c.Width1 ?? ''), Gramage1: String(c.Gramage1 ?? ''),
      Sheet_count1: String(c.Sheet_count1 ?? ''), Price: String(c.Price ?? ''), Out_Date: c.Out_Date ?? '',
      Out_ord_num: c.Out_ord_num ?? '', note_crt: c.note_crt ?? '',
    })));
  }, [cartonsData]);

  const handleMaterialsChange = useCallback(async (newRows: Record<string, string>[]) => {
    if (!isEdit) { setPendingMaterials(newRows); return; }
    await syncRows(materialsRows, newRows,
      (f) => createCarton.mutateAsync({ ...f, ID: id!, year: year! }),
      (rowId, f) => updateCarton.mutateAsync({ rowId, data: f }),
      (rowId) => deleteCarton.mutateAsync(rowId),
    );
  }, [isEdit, materialsRows, syncRows, createCarton, updateCarton, deleteCarton, id, year]);

  // ── سجل المشاكل ──
  const { data: problemsData = [] } = useProblems(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
  const createProblem = useCreateProblem();
  const updateProblem = useUpdateProblem();
  const deleteProblem = useDeleteProblem();

  const [pendingProblems, setPendingProblems] = useState<Record<string, string>[]>([]);
  const problemsRows = useMemo(() => problemsData.map((p: any) => ({
    ID: String(p.ID1 ?? ''), print_num: p.print_num ?? '', prod_date: p.prod_date ?? '', exp_date: p.exp_date ?? '', print_count: String(p.print_count ?? ''),
  })), [problemsData]);

  const handleProblemsChange = useCallback(async (newRows: Record<string, string>[]) => {
    if (!isEdit) { setPendingProblems(newRows); return; }
    await syncRows(problemsRows, newRows,
      (f) => createProblem.mutateAsync({ ...f, ID: id!, Year: year! }),
      (rowId, f) => updateProblem.mutateAsync({ rowId, data: f }),
      (rowId) => deleteProblem.mutateAsync(rowId),
    );
  }, [isEdit, problemsRows, syncRows, createProblem, updateProblem, deleteProblem, id, year]);

  // ── العمليات ──
  const { data: operationsData = [] } = useOperations(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
  const createOperation = useCreateOperation();
  const updateOperation = useUpdateOperation();
  const deleteOperation = useDeleteOperation();

  const [pendingOps, setPendingOps] = useState<Record<string, string>[]>([]);
  const operationsRows = useMemo(() => operationsData.map((op: any) => ({
    ID: String(op.ID1 ?? op.ID ?? ''), Action: op.Action ?? '', Color: op.Color ?? '', Qunt_Ac: String(op.Qunt_Ac ?? ''), On: String(op.On ?? ''),
    Machin: op.Machin ?? '', Hours: String(op.Hours ?? ''), Kelo: String(op.Kelo ?? ''), Actual: String(op.Actual ?? ''), Tarkeb: String(op.Tarkeb ?? ''),
    Wash: String(op.Wash ?? ''), Electricity: String(op.Electricity ?? ''), Taghez: String(op.Taghez ?? ''), StopVar: String(op.StopVar ?? ''),
    Date: op.Date ?? '', NotesA: op.NotesA ?? '', Tabrer: op.Tabrer ?? '',
  })), [operationsData]);

  const handleOperationsChange = useCallback(async (newRows: Record<string, string>[]) => {
    if (!isEdit) { setPendingOps(newRows); return; }
    await syncRows(operationsRows, newRows,
      (f) => createOperation.mutateAsync({ ...f, ID: id!, year: year! }),
      (rowId, f) => updateOperation.mutateAsync({ rowId, data: f }),
      (rowId) => deleteOperation.mutateAsync(rowId),
    );
  }, [isEdit, operationsRows, syncRows, createOperation, updateOperation, deleteOperation, id, year]);

  const [openSections, setOpenSections] = useState({ basic: true, specs: true, printing: true, quality: true, delivery: true });

  const { data: ordersResponse } = useOrders({ year: year || currentYear });
  const orders = useMemo(() => ordersResponse?.data ?? [], [ordersResponse]);

  const { data: vouchers = [] } = useVouchers(isEdit ? (id ?? '') : '', isEdit ? (year ?? currentYear) : currentYear);

  useEffect(() => {
    if (!isEdit || !existing || hasLoadedEdit) return;
    reset(existing);

    const loadedMfg: Record<string, boolean> = {};
    Object.entries(MFG_MAP).forEach(([label, field]) => { loadedMfg[label] = fromBit((existing as any)[field]); });
    setMfgChecks(loadedMfg);

    const loadedCust: Record<string, boolean> = {};
    Object.entries(CUST_MAP).forEach(([label, field]) => { loadedCust[label] = fromBit((existing as any)[field]); });
    setCustChecks(loadedCust);

    setChecks({
      varnich: fromBit(existing.varnich), uv: fromBit(existing.uv), uv_Spot: fromBit(existing.uv_Spot),
      seluvan_lum: fromBit(existing.seluvan_lum), seluvan_mat: fromBit(existing.seluvan_mat),
      Tad3em: fromBit(existing.Tad3em), Tay: fromBit(existing.Tay), harary: fromBit(existing.harary),
      rolling: fromBit(existing.rolling), Printed: fromBit(existing.Printed),
      Billed: fromBit(existing.Billed), Reseved: fromBit(existing.Reseved),
      CTB: fromBit(existing.DubelM), varn: fromBit(existing.varnich),
    });
    setHasLoadedEdit(true);
  }, [isEdit, existing, hasLoadedEdit, reset]);

  useEffect(() => {
    if (!orders || orders.length === 0 || isEdit || idInitialized) return;
    const latestOrder = orders[orders.length - 1];
    const lastSer = parseInt(latestOrder?.Ser || '0') || 0;
    const newId = String((Number(latestOrder?.ID) || 0) + 1);

    setValue('Ser', String(lastSer + 1));
    setValue('ID', newId);
    setValue('Year', year || currentYear);
    setIdInitialized(true);
  }, [orders, isEdit, idInitialized, year, currentYear, setValue]);

  const onSubmit = useCallback(async (data: Order) => {
    try {
      BOOL_FIELDS.forEach(f => { (data as any)[f] = toBit(checks[f]); });
      Object.entries(MFG_MAP).forEach(([label, field]) => { (data as any)[field] = toBit(mfgChecks[label]); });
      Object.entries(CUST_MAP).forEach(([label, field]) => { (data as any)[field] = toBit(custChecks[label]); });
      (data as any).DubelM = toBit(checks.CTB);

      if (isEdit) {
        await updateOrder.mutateAsync(data);
      } else {
        const created = await createOrder.mutateAsync(data);
        const newId = String(created?.ID ?? data.ID);
        const yr = String(data.Year ?? currentYear);

        await Promise.all([
          ...pendingMaterials.map(f => createCarton.mutateAsync({ ...f, ID: newId, year: yr })),
          ...pendingProblems.map(f => createProblem.mutateAsync({ ...f, ID: newId, Year: yr })),
          ...pendingOps.map(f => createOperation.mutateAsync({ ...f, ID: newId, year: yr })),
        ]);
      }
      navigate('/orders');
    } catch (error: any) {
      alert(error.message || 'حدث خطأ أثناء الحفظ');
    }
  }, [checks, mfgChecks, custChecks, isEdit, currentYear, pendingMaterials, pendingProblems, pendingOps, updateOrder, createOrder, createCarton, createProblem, createOperation, navigate]);

  const chk = useCallback((k: string) => (v: boolean) => setChecks(c => ({ ...c, [k]: v })), []);

  return (
    <div className="p-6 max-w-7xl mx-auto font-sans" dir="rtl">
      <div className="flex items-center justify-between border-b pb-4 mb-6">
        <h1 className="text-xl font-black text-slate-800">
          {isEdit ? `✏️ تعديل الطلب: ${id} لعام ${year}` : '➕ إضافة طلب جديد'}
        </h1>
        <Btn variant="outline" onClick={() => navigate('/orders')}>رجوع للقائمة</Btn>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 font-sans">
        
        {/* بيانات الطلب */}
        <AccordionCard title="📋 بيانات الطلب الأساسية" isOpen={openSections.basic} onToggle={() => setOpenSections(p => ({ ...p, basic: !p.basic }))}>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <G label="تسلسل"><input className="fc bg-slate-50 font-bold" {...register('Ser')} readOnly /></G>
            <G label="اسم الزبون" req><input className="fc" {...register('Customer', { required: true })} list="cust-list" /></G>
            <G label="رقمنا"><input className="fc bg-slate-50 font-bold text-indigo-600" {...register('ID')} readOnly /></G>
            <G label="سنة العمل" req><input className="fc" {...register('Year', { required: true })} readOnly={isEdit} /></G>
            <G label="المرجع" req><input className="fc" {...register('marji3', { required: true })} /></G>
          </div>
          <datalist id="cust-list">
            {customers.map((c: any) => <option key={c.ID1} value={c.Customer} />)}
          </datalist>
        </AccordionCard>

        {/* مواصفات المطبوعة */}
        <AccordionCard title="🎨 مواصفات المطبوعة" isOpen={openSections.specs} onToggle={() => setOpenSections(p => ({ ...p, specs: !p.specs }))}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <G label="نوع المطبوعة">
              <select className="fc" {...register('unit')}>
                <option value="">—</option>
                {['علبة', 'كرتون', 'بروشور', 'استيكر'].map(v => <option key={v}>{v}</option>)}
              </select>
            </G>
            <G label="الاسم"><input className="fc" {...register('Pattern')} /></G>
            <G label="العيار"><input className="fc" {...register('ear')} /></G>
            <G label="السعر"><input className="fc" type="number" step="0.01" {...register('Price')} /></G>
          </div>

          <SectionDiv label="مواد الكرتون والمستودع" />
          <InlineTable
            cols={MATERIALS_COLS}
            rows={isEdit ? materialsRows : pendingMaterials}
            onRowsChange={handleMaterialsChange}
            syncDraftRows={!isEdit}
          />
        </AccordionCard>

        {/* العمليات */}
        <AccordionCard title="⚙️ العمليات وسير الإنتاج" isOpen={openSections.printing} onToggle={() => setOpenSections(p => ({ ...p, printing: !p.printing }))}>
          <InlineTable
            cols={OPERATIONS_COLS}
            rows={isEdit ? operationsRows : pendingOps}
            onRowsChange={handleOperationsChange}
            syncDraftRows={!isEdit}
          />
        </AccordionCard>

        {/* المشاكل */}
        <AccordionCard title="🔍 مراقبة الجودة" isOpen={openSections.quality} onToggle={() => setOpenSections(p => ({ ...p, quality: !p.quality }))}>
          <InlineTable
            cols={PROBLEMS_COLS}
            rows={isEdit ? problemsRows : pendingProblems}
            onRowsChange={handleProblemsChange}
            syncDraftRows={!isEdit}
          />
        </AccordionCard>

        {/* التسليم */}
        <AccordionCard title="🚚 التسليم والفوترة" isOpen={openSections.delivery} onToggle={() => setOpenSections(p => ({ ...p, delivery: !p.delivery }))}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <G label="الكمية المسلمة"><input className="fc" type="number" {...register('Qunt_Ac')} /></G>
            <div className="flex items-center gap-4 pt-6">
              <CheckItem label="سُلِّمت" checked={!!checks.Reseved} onChange={chk('Reseved')} />
              <CheckItem label="فوترة" checked={!!checks.Billed} onChange={chk('Billed')} />
            </div>
            <div className="pt-5">
              <Btn variant="outline" type="button" onClick={() => setVoucherOpen(true)}>➕ إضافة إيصال</Btn>
            </div>
          </div>
          
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-xs text-right border border-slate-100">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="p-2 border">رقم الإيصال</th>
                  <th className="p-2 border">تاريخه</th>
                  <th className="p-2 border">الكمية</th>
                  <th className="p-2 border">النوع</th>
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-4 text-center text-slate-400 font-semibold">لا توجد إيصالات</td>
                  </tr>
                ) : (
                  vouchers.map((v: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="p-2 border font-bold">{v.Voucher_num}</td>
                      <td className="p-2 border">{v.V_date}</td>
                      <td className="p-2 border">{v.V_Qunt}</td>
                      <td className="p-2 border">{v.Contean}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </AccordionCard>

        {/* أزرار الإجراءات */}
        <div className="flex justify-end gap-3 p-4 bg-slate-50 border rounded-xl">
          <Btn variant="outline" type="button" onClick={() => navigate('/orders')}>إلغاء</Btn>
          <Btn variant="primary" type="submit">
            {createOrder.isPending || updateOrder.isPending ? '⏳ جاري المعالجة...' : '✅ تأكيد الحفظ'}
          </Btn>
        </div>

      </form>
      <VoucherModal open={voucherOpen} onClose={() => setVoucherOpen(false)} orderId={id || ''} orderYear={year || currentYear} />
    </div>
  );
}
