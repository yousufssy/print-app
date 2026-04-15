import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useOrder, useCreateOrder, useUpdateOrder, useCustomers, useVouchers, useCreateVoucher, useDeleteVoucher, useOrders, useOperations, useCreateOperation, useUpdateOperation, useDeleteOperation, useCartons, useCreateCarton, useUpdateCarton, useDeleteCarton, useProblems, useCreateProblem, useUpdateProblem, useDeleteProblem } from '../hooks/useApi';
import { Card, FormGroup, SectionDiv, CheckItem, Loading, Btn } from '../components/ui';
import type { Order } from '../types';

// ══════════════════════════════════════════════════════
//  🔽 Accordion Card Component
// ══════════════════════════════════════════════════════
function AccordionCard({ 
  title, 
  children, 
  defaultOpen = true,
  isOpen,
  onToggle 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onToggle?: () => void;
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = isOpen !== undefined;
  const open = isControlled ? isOpen : internalOpen;
  
  const toggle = () => {
    if (isControlled) onToggle?.();
    else setInternalOpen(!open);
  };

  return (
    <div style={{ 
      border: '1px solid var(--border)', 
      borderRadius: 12, 
      marginBottom: 16,
      background: '#fff',
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      {/* Header - قابل للنقر */}
      <button
        type="button"
        onClick={toggle}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: open ? 'var(--steel)' : 'var(--bg)',
          color: open ? '#fff' : 'var(--ink)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'Cairo, sans-serif',
          transition: 'background 0.2s',
          textAlign: 'right',
          direction: 'rtl'
        }}
      >
        <span>{title}</span>
        <span style={{ 
          fontSize: 14, 
          transition: 'transform 0.25s ease',
          transform: open ? 'rotate(180deg)' : 'rotate(0)',
          display: 'inline-flex',
          alignItems: 'center'
        }}>
          ▼
        </span>
      </button>
      
      {/* Content - مع تأثير انزلاق */}
      <div style={{
        maxHeight: open ? '3000px' : '0',
        overflow: 'hidden',
        transition: 'max-height 0.35s ease-in-out, opacity 0.25s ease',
        opacity: open ? 1 : 0
      }}>
        <div style={{ padding: '16px 20px 20px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Inline editable table ──────────────────────────────────────────────────────
function InlineTable({
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

  const rowsRef = React.useRef(rows);

  React.useEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  React.useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const isNumericCol = React.useCallback(
    (key: string) => cols.some((c) => c.key === key && c.type === 'number'),
    [cols]
  );

  const cleanNumber = (value: string) => {
      if (value === '') return '';
  
      let v = value.replace(/[^0-9.\-]/g, '');
  
      const minusCount = (v.match(/-/g) || []).length;
      if (minusCount > 1) {
        v = v.replace(/-/g, '');
      }
      // ✅ إذا كانت الإشارة في غير البداية، احذفها
      if (v.includes('-') && v.indexOf('-') !== 0) {
        v = v.replace(/-/g, '');
      }
  
      const parts = v.split('.');
      if (parts.length > 2) {
        v = parts[0] + '.' + parts.slice(1).join('');
      }
  
      // 🛡️ السطر الحاسم: منع القيم غير المكتملة التي تكسر React
      if (v === '-' || v === '.' || v === '-.' || v === '') return '';
  
      return v;
  };

  const pushDraftRows = React.useCallback(
    (nextRows: Record<string, string>[]) => {
      if (!syncDraftRows) return;
      void onRowsChange(nextRows.map(({ _isNew, ID, ...row }) => row));
    },
    [onRowsChange, syncDraftRows]
  );

  const addRow = () => {
    const empty = Object.fromEntries(cols.map((c) => [c.key, '']));
    setLocalRows((prev) => {
      const nextRows = [...prev, { ...empty, ID: '', _isNew: 'true' }];
      pushDraftRows(nextRows);
      return nextRows;
    });
  };

  const setCell = (i: number, key: string, value: string) => {
    const finalValue = isNumericCol(key) ? cleanNumber(value) : value;

    setLocalRows((prev) => {
      const nextRows = prev.map((r, idx) =>
        idx === i ? { ...r, [key]: finalValue } : r
      );
      pushDraftRows(nextRows);
      return nextRows;
    });
  };

  const saveRow = async (i: number) => {
    const row = localRows[i];
    if (!row) return;

    const isEmpty = cols.every((c) => !row[c.key]);
    if (isEmpty) return;

    setSaving((s) => ({ ...s, [i]: true }));

    try {
      const { _isNew, ID, ...fields } = row;

      if (_isNew === 'true') {
        const allRows = [...rowsRef.current, { ...fields }];
        await onRowsChange(allRows);
      } else if (ID) {
        const updated = localRows.map((r) => (r.ID === ID ? row : r));
        await onRowsChange(updated);
      }
    } finally {
      setSaving((s) => ({ ...s, [i]: false }));
    }
  };

  const delRow = async (i: number) => {
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
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--steel)', color: '#fff' }}>
            {cols.map((c) => (
              <th
                key={c.key}
                style={{
                  padding: '8px 10px',
                  textAlign: 'right',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                  width: c.width,
                }}
              >
                {c.label}
              </th>
            ))}
            <th style={{ padding: '8px 10px', width: 36 }}></th>
          </tr>
        </thead>

        <tbody>
          {localRows.length === 0 && (
            <tr>
              <td
                colSpan={cols.length + 1}
                style={{
                  textAlign: 'center',
                  color: 'var(--muted)',
                  padding: 16,
                }}
              >
                ✦ لا توجد سجلات — اضغط ➕ لإضافة سطر
              </td>
            </tr>
          )}

          {localRows.map((row, i) => (
            <tr
              key={row.ID || `new-${i}`}
              style={{
                borderBottom: '1px solid var(--border)',
                background:
                  row._isNew === 'true'
                    ? '#fffbe6'
                    : i % 2 === 0
                      ? '#fff'
                      : '#fdf8f0',
              }}
            >
              {cols.map((c, ci) => {
                const isNumber = c.type === 'number';
                const value = isNumber
                  ? cleanNumber(String(row[c.key] ?? ''))
                  : (row[c.key] ?? '');

                return (
                  <td key={c.key} style={{ padding: '3px 5px' }}>
                    <input
                      value={value}
                      type={c.type === 'date' ? 'date' : 'text'}
                      inputMode={isNumber ? 'decimal' : undefined}
                      onChange={(e) => {
                        let val = e.target.value;
                        if (isNumber) val = cleanNumber(val);
                        setCell(i, c.key, val);
                      }}
                      onBlur={() => {
                        if (ci === cols.length - 1) saveRow(i);
                      }}
                      style={{
                        width: '100%',
                        border: 'none',
                        background: 'transparent',
                        fontFamily: 'Cairo, sans-serif',
                        fontSize: 12,
                        outline: 'none',
                        padding: '4px 3px',
                        color: 'var(--ink)',
                        textAlign: 'right',
                      }}
                      onFocus={(e) => {
                        e.target.style.background = '#fff9f0';
                      }}
                    />
                  </td>
                );
              })}

              <td
                style={{
                  padding: '3px 6px',
                  textAlign: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {saving[i] ? (
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>⏳</span>
                ) : (
                  <>
                    {row._isNew === 'true' && (
                      <button
                        type="button"
                        onClick={() => saveRow(i)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#27ae60',
                          fontSize: 14,
                          marginLeft: 4,
                        }}
                        title="حفظ"
                      >
                        💾
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => delRow(i)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--red)',
                        fontSize: 14,
                      }}
                      title="حذف"
                    >
                      🗑
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>

        <tfoot>
          <tr>
            <td colSpan={cols.length + 1} style={{ padding: '8px 10px' }}>
              <button
                type="button"
                onClick={addRow}
                style={{
                  background: 'none',
                  border: '1.5px dashed var(--border)',
                  borderRadius: 6,
                  padding: '5px 14px',
                  cursor: 'pointer',
                  color: 'var(--muted)',
                  fontFamily: 'Cairo, sans-serif',
                  fontSize: 12,
                  width: '100%',
                }}
              >
                ➕ إضافة سطر
              </button>
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
// ── Voucher Modal ──────────────────────────────────────────────────────────────
function VoucherModal({ open, onClose, orderId, orderYear }: {
  open: boolean; onClose: () => void; orderId: string; orderYear: string;
}) {
  const create = useCreateVoucher();
  const [form, setForm] = useState({
    ID: orderId, Year: orderYear,
    Voucher_num: '', V_date: '', V_Qunt: '', Bill_Num: '',
    Contean: '', Paking_q: '', Box_tp: '', Box_L: '', Box_W: '', Box_H: '',
  });
  const F = (k: string, numeric = false) => (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = e.target.value;
      if (numeric) {
        val = val.replace(/[^0-9]/g, ''); // للأرقام الصحيحة فقط (بدون فاصلة عشرية)
      }
      setForm(f => ({ ...f, [k]: val }));
    };
  if (!open) return null;
  
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 540, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border)', textAlign: 'right' }}>➕ إضافة إيصال</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <FormGroup label="رقم الإيصال"><input className="fc" value={form.Voucher_num} onChange={F('Voucher_num')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="تاريخ الإيصال"><input className="fc" type="date" value={form.V_date} onChange={F('V_date')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="الحد (الكمية)"><input className="fc" type="number" value={form.V_Qunt} onChange={F('V_Qunt')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="رقم الفاتورة"><input className="fc" value={form.Bill_Num} onChange={F('Bill_Num')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="النوع"><input className="fc" value={form.Contean} onChange={F('Contean')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="عدد العلب"><input className="fc" type="number" value={form.Paking_q} onChange={F('Paking_q')} style={{ textAlign: 'right' }} /></FormGroup>
        </div>
        <SectionDiv label="أبعاد الكرتون (ط × ع × ا)" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 12 }}>
          <FormGroup label="النوع"><input className="fc" value={form.Box_tp} onChange={F('Box_tp')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="ط"><input className="fc" type="number" value={form.Box_L} onChange={F('Box_L')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="ع"><input className="fc" type="number" value={form.Box_W} onChange={F('Box_W')} style={{ textAlign: 'right' }} /></FormGroup>
          <FormGroup label="ا"><input className="fc" type="number" value={form.Box_H} onChange={F('Box_H')} style={{ textAlign: 'right' }} /></FormGroup>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
          <Btn variant="outline" type="button" onClick={onClose}>إلغاء</Btn>
          <Btn variant="primary" type="button" disabled={create.isPending}
            onClick={async () => { await create.mutateAsync({ ...form, ID: orderId, Year: orderYear }); onClose(); }}>
            {create.isPending ? '⏳...' : '✅ حفظ الإيصال'}
          </Btn>
        </div>
      </div>
    </div>
  );
}

// ── Table column definitions ───────────────────────────────────────────────────
const MATERIALS_COLS = [
  { key: 'Type1',        label: 'النوع' },
  { key: 'Id_carton',    label: 'رقم الكرتون' },
  { key: 'Source1',      label: 'المصدر' },
  { key: 'Supplier1',    label: 'المورد' },
  { key: 'Long1',        label: 'الطول',        type: 'number' },
  { key: 'Width1',       label: 'العرض',        type: 'number' },
  { key: 'Gramage1',     label: 'غراماج',       type: 'number' },
  { key: 'Sheet_count1', label: 'عدد الأطباق',  type: 'number' },
  { key: 'Price',        label: 'السعر',        type: 'number' },
  { key: 'Out_Date',     label: 'تاريخ الإخراج', type: 'date' },
  { key: 'Out_ord_num',  label: 'رقم أمر الإخراج' },
  { key: 'note_crt',     label: 'ملاحظات' },
];

const PROBLEMS_COLS = [
  { key: 'print_num',   label: 'رقم الطبع' },
  { key: 'prod_date',   label: 'تاريخ الإنتاج',  type: 'date' },
  { key: 'exp_date',    label: 'تاريخ الانتهاء', type: 'date' },
  { key: 'print_count', label: 'عدد الطبع',       type: 'number' },
];

const OPERATIONS_COLS = [
  { key: 'Action',      label: 'العملية' },
  { key: 'Color',       label: 'اللون' },
  { key: 'Qunt_Ac',    label: 'الكمية',        type: 'number' },
  { key: 'On',         label: 'على',           type: 'number' },
  { key: 'Machin',     label: 'الآلة' },
  { key: 'Hours',      label: 'الساعات',       type: 'number' },
  { key: 'Kelo',       label: 'كيلو',          type: 'number' },
  { key: 'Actual',     label: 'الفعلي',        type: 'number' },
  { key: 'Tarkeb',     label: 'تركيب',         type: 'number' },
  { key: 'Wash',       label: 'غسيل',          type: 'number' },
  { key: 'Electricity',label: 'كهرباء',        type: 'number' },
  { key: 'Taghez',     label: 'تجهيز',         type: 'number' },
  { key: 'StopVar',    label: 'توقف',          type: 'number' },
  { key: 'Date',       label: 'التاريخ',       type: 'date' },
  { key: 'NotesA',     label: 'ملاحظات' },
  { key: 'Tabrer',     label: 'تبرير' },
];

const CHK_MFG  = ['برنيش','تلميع بقعي','تلميع كامل','سلفان لميع','سلفان مات','طُبعت؟'];
const CHK_CUST = ['مع طبخة','مع تطوية','تدعيم زكزاك','حراري','بص','تلميع بقعي'];

// ── Helper: تحويل أي قيمة boolean لـ 1 أو 0 ──────────────────────────────────
const toBit = (val: any): number =>
  val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true' ? 1 : 0;

// ── Helper: قراءة boolean من الداتابيز بأي صيغة ──────────────────────────────
const fromBit = (val: any): boolean =>
  val === true || val === 1 || val === '1' || String(val).toLowerCase() === 'true';

// ── قائمة حقول الـ boolean ────────────────────────────────────────────────────
const BOOL_FIELDS = [
  'varnich','uv','uv_Spot','seluvan_lum','seluvan_mat',
  'Tad3em','Tay','harary','rolling','Printed','Billed','Reseved'
];

const CUST_LABELS = ['مع طبخة','مع تطوية','تدعيم زكزاك','حراري','بص','تلميع بقعي'];
const CUST_FIELDS = ['cust_with_baking','cust_with_folding','cust_tad3em_zkzk','cust_harary','cust_bp','cust_tlm3_bq3y'];

// ══════════════════════════════════════════════════════
//  🎯 MAIN COMPONENT - OrderFormPage
// ══════════════════════════════════════════════════════
export default function OrderFormPage() {
  const { id, year } = useParams<{ id?: string; year?: string }>();
  const isEdit = !!(id && year);
  const navigate = useNavigate();
  
  
  const { data: existing, isLoading } = useOrder(id ?? '', year ?? '');
  const createOrder = useCreateOrder();
  const updateOrder = useUpdateOrder(id ?? '', year ?? '');
  const { data: customers = [] } = useCustomers();

  const [checks,     setChecks]     = useState<Record<string, boolean>>({});
  const [mfgChecks,  setMfgChecks]  = useState<Record<string, boolean>>({});
  const [custChecks, setCustChecks] = useState<Record<string, boolean>>({});
  const [voucherOpen, setVoucherOpen] = useState(false);

  // ── helper مشترك لمزامنة أي InlineTable مع الداتابيز ────────────────────────
  const syncRows = async (
    oldRows: Record<string, string>[],
    newRows: Record<string, string>[],
    onCreate: (fields: any) => Promise<any>,
    onUpdate: (rowId: number, fields: any) => Promise<any>,
    onDelete: (rowId: number) => Promise<any>,
  ) => {
    const oldIds = new Set(oldRows.map(r => r.ID).filter(v => !!v));
    const newIds = new Set(newRows.map(r => r.ID).filter(v => !!v));

    // حذف الصفوف المحذوفة
    for (const old of oldRows)
      if (old.ID && !newIds.has(old.ID))
        await onDelete(Number(old.ID));

    // إضافة أو تحديث — ✅ استخرج _isNew و ID معاً
    for (const row of newRows) {
      const { ID, _isNew, ...fields } = row;
      if (ID && oldIds.has(ID))
        await onUpdate(Number(ID), fields);
      else if (!ID)
        await onCreate(fields);
    }
  };

  // ── الكرتون — مرتبط بالداتابيز ───────────────────────────────────────────────
const { data: cartonsData = [] } = useCartons(
  isEdit ? (id ?? '') : '',
  isEdit ? (year ?? '') : ''
);

const createCarton = useCreateCarton();
const updateCarton = useUpdateCarton();
const deleteCarton = useDeleteCarton();

const [materialsRows, setMaterialsRows] = useState<Record<string, string>[]>([]);

useEffect(() => {
  setMaterialsRows(
    cartonsData.map((c: any) => ({
      // ✅ أضف هذا السطر لضمان وجود المعرف الفريد
      ID: String(c.ID1 ?? c.ID ?? ''), 
      
      Type1: c.Type1 ?? '',
      Id_carton: c.Id_carton ?? '',
      Source1: c.Source1 ?? '',
      Supplier1: c.Supplier1 ?? '',
      Long1: String(c.Long1 ?? ''),
      Width1: String(c.Width1 ?? ''),
      Gramage1: String(c.Gramage1 ?? ''),
      Sheet_count1: String(c.Sheet_count1 ?? ''),
      Price: String(c.Price ?? ''),
      Out_Date: c.Out_Date ?? '',
      Out_ord_num: c.Out_ord_num ?? '',
      note_crt: c.note_crt ?? '',
    }))
  );
}, [cartonsData]);
  


  
  // buffer للحفظ عند إنشاء طلب جديد
  const [pendingMaterials, setPendingMaterials] = useState<Record<string, string>[]>([]);
  const [pendingProblems,  setPendingProblems]  = useState<Record<string, string>[]>([]);
  const [pendingOps,       setPendingOps]       = useState<Record<string, string>[]>([]);

  const handleMaterialsChange = async (newRows: Record<string, string>[]) => {
    if (!isEdit) { setPendingMaterials(newRows); return; }
    await syncRows(
      materialsRows, newRows,
      (f) => createCarton.mutateAsync({ ...f, ID: watchId, year: watchYear }),
      (rowId, f) => updateCarton.mutateAsync({ rowId, data: f }),
      (rowId) => deleteCarton.mutateAsync(rowId),
    );
  };

  // ── سجل المشاكل — مرتبط بالداتابيز ──────────────────────────────────────────
  const { data: problemsData = [] } = useProblems(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
  const createProblem = useCreateProblem();
  const updateProblem = useUpdateProblem();
  const deleteProblem = useDeleteProblem();

  const problemsRows: Record<string, string>[] = problemsData.map((p: any) => ({
    ID:      String(p.ID1 ?? ''),
    print_num:   p.print_num   ?? '',
    prod_date:   p.prod_date   ?? '',
    exp_date:    p.exp_date    ?? '',
    print_count: String(p.print_count ?? ''),
  }));

  const handleProblemsChange = async (newRows: Record<string, string>[]) => {
    if (!isEdit) { setPendingProblems(newRows); return; }
    await syncRows(
      problemsRows, newRows,
      (f) => createProblem.mutateAsync({ ...f, ID: watchId, Year: watchYear }),
      (rowId, f) => updateProblem.mutateAsync({ rowId, data: f }),
      (rowId) => deleteProblem.mutateAsync(rowId),
    );
  };

  // ── العمليات — مرتبطة بالداتابيز ─────────────────────────────────────────────
  const { data: operationsData = [] } = useOperations(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
  const createOperation = useCreateOperation();
  const updateOperation = useUpdateOperation();
  const deleteOperation = useDeleteOperation();

  const operationsRows: Record<string, string>[] = operationsData.map((op: any) => ({
    ID:      String(op.ID1 ?? op.ID ?? ''),
    Action:      op.Action      ?? '',
    Color:       op.Color       ?? '',
    Qunt_Ac:     String(op.Qunt_Ac    ?? ''),
    On:          String(op.On         ?? ''),
    Machin:      op.Machin      ?? '',
    Hours:       String(op.Hours      ?? ''),
    Kelo:        String(op.Kelo       ?? ''),
    Actual:      String(op.Actual     ?? ''),
    Tarkeb:      String(op.Tarkeb     ?? ''),
    Wash:        String(op.Wash       ?? ''),
    Electricity: String(op.Electricity ?? ''),
    Taghez:      String(op.Taghez     ?? ''),
    StopVar:     String(op.StopVar    ?? ''),
    Date:        op.Date        ?? '',
    NotesA:      op.NotesA      ?? '',
    Tabrer:      op.Tabrer      ?? '',
  }));

  const handleOperationsChange = async (newRows: Record<string, string>[]) => {
    if (!isEdit) { setPendingOps(newRows); return; }
    await syncRows(
      operationsRows, newRows,
      (f) => createOperation.mutateAsync({ ...f, ID: watchId, Year: watchYear }),
      (rowId, f) => updateOperation.mutateAsync({ rowId, data: f }),
      (rowId) => deleteOperation.mutateAsync(rowId),
    );
  };

  // ➕ State لإدارة فتح/إغلاق أقسام الأكورديون
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    specs: true,
    printing: true,
    quality: true,
    delivery: true
  });

  // حفظ/استعادة حالة الأقسام من localStorage
  useEffect(() => {
    const saved = localStorage.getItem('orderFormSections');
    if (saved) {
      try {
        setOpenSections(JSON.parse(saved));
      } catch (e) {
        console.warn('Failed to parse saved sections:', e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('orderFormSections', JSON.stringify(openSections));
  }, [openSections]);

  // ✅ أضف getValues إلى الاستيراد:
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<Order>();
  const location = useLocation();
  const duplicatedData = location.state;

  









  
  // ✅ الكود الجديد (انسخ هذا):
// ✅ انسخ هذا الكود وضعه مرة واحدة فقط في ملفك:
// ✅ دالة نسخ بسيطة تعتمد على البيانات الأصلية من السيرفر:
const handleDuplicate = () => {
    const sourceData = isEdit && existing ? { ...existing } : {};
    
    // 🚨 تشخيص: اعرض البيانات قبل النسخ
    console.log('📦 مصدر النسخ (existing):', existing);
    console.log('📦 البيانات بعد الاستبعاد:', sourceData);
    
    const excludeFields = ['ID', 'Ser', 'Year', 'AttachmentsOrders', 'marji3', 'date_come', 'Perioud', 'ID1'];
    const dataToCopy = { ...sourceData };
    excludeFields.forEach(field => delete dataToCopy[field]);
    
    navigate('/orders/new', {
      state: {
        duplicatedData: {
          ...dataToCopy,
          Ser: '',
          Year: String(new Date().getFullYear()),
          checks: { ...checks },
          mfgChecks: { ...mfgChecks },
          custChecks: { ...custChecks },
        }
      }
    });
  };
  
  const watchYear = watch('Year') || String(new Date().getFullYear());
  const watchId   = watch('ID') || '';

  const { data: ordersResponse } = useOrders({ year: watchYear });
  const orders = ordersResponse?.data || [];

  const { data: vouchers = [] } = useVouchers(isEdit ? watchId : '', watchYear);
  const deleteVoucher = useDeleteVoucher();

  // ✅ تحميل البيانات عند التعديل — مع قراءة صحيحة للـ boolean
// ✅ useEffect واحد فقط لاستقبال البيانات المنسوخة:
useEffect(() => {
    if (!duplicatedData) return;
  
    const { 
      checks: copiedChecks, 
      mfgChecks: copiedMfg, 
      custChecks: copiedCust, 
      ...orderData 
    } = duplicatedData;
    
    // 🟢 تعيين البيانات مباشرة (بدون تصفية 0)
    // نستخدم فقط لتجاهل undefined/null الحقيقية
    const validOrderData = Object.fromEntries(
      Object.entries(orderData).filter(([_, v]) => v !== undefined)
    );
    
    if (Object.keys(validOrderData).length > 0) {
      reset(validOrderData);
    }
  
    setChecks(copiedChecks ?? {});
    setMfgChecks(copiedMfg ?? {});
    setCustChecks(copiedCust ?? {});
    
    if (!isEdit) {
      setMaterialsRows([]);
      setPendingMaterials([]);
      setPendingOps([]);
      setPendingProblems([]);
    }
  
  }, [duplicatedData, reset, isEdit]);



  

  useEffect(() => {
    if (!isEdit && orders.length >= 0) {
      const latestOrder = orders.sort((a: any, b: any) => b.ID - a.ID)[0];
      const lastSer = latestOrder ? parseInt(latestOrder.Ser || '0') || 0 : 0;
      setValue('Ser', String(lastSer + 1));
    }
  }, [isEdit, orders, setValue]);

  // ✅ الحفظ — مع إرسال 1/0 بدل True/False
  const onSubmit = async (data: Order) => {
    // تحويل boolean fields لـ 1/0
    BOOL_FIELDS.forEach(f => {
      (data as any)[f] = toBit(checks[f]);
    });

    // حقول الزبون
    CUST_FIELDS.forEach((field, i) => {
      (data as any)[field] = toBit(custChecks[CUST_LABELS[i]]);
    });

    (data as any).DubelM = toBit(checks.CTB);
    (data as any).tabkha = 0;
    (data as any).bals   = 0;

    if (!isEdit) {
      const maxRowId = orders.length > 0
        ? Math.max(...orders.map((o: any) => o.ID)) + 1
        : 1;
      (data as any).ID = maxRowId;
    }

    if (isEdit) {
      await updateOrder.mutateAsync(data);
    } else {
      const created = await createOrder.mutateAsync(data);
      const newId   = String((created as any)?.ID ?? (data as any).ID);
      const yr      = String((data as any).Year ?? watchYear);

      // حفظ الصفوف المؤجلة بعد معرفة الـ ID الجديد
      await Promise.all([
        ...pendingMaterials.map(({ ID, _isNew, ...f }) =>
          createCarton.mutateAsync({ ...f, ID: newId, year: yr })),
        ...pendingProblems.map(({ ID, _isNew, ...f }) =>
          createProblem.mutateAsync({ ...f, ID: newId, Year: yr })),
        ...pendingOps.map(({ ID, _isNew, ...f }) =>
          createOperation.mutateAsync({ ...f, ID: newId, Year: yr })),
      ]);
    }
    navigate('/orders');
  };

  const chk  = (k: string) => (v: boolean) => setChecks(c => ({ ...c, [k]: v }));
  const mchk = (k: string) => (v: boolean) => setMfgChecks(c => ({ ...c, [k]: v }));
  const cchk = (k: string) => (v: boolean) => setCustChecks(c => ({ ...c, [k]: v }));
  
  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isSaving = createOrder.isPending || updateOrder.isPending;

  // ══════════════════════════════════════════════════════
  //  🖨️ طباعة بطاقة الإنتاج
  // ══════════════════════════════════════════════════════
  const printProductionCard = () => {
    const d = watch();
    const chkd = (val: any) => (val ? '✔' : '');
    const fmt  = (v: any) => v ?? '';

    const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
@page{margin:8mm;size:A4 portrait}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Arial',sans-serif;background:#fff;direction:rtl;margin:0;padding:0}
.page{width:100%;box-sizing:border-box}
@media print{body{margin:0;padding:0}.page{width:100%;margin:0;padding:0;border:none}}
.header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px}
.top-id{display:flex;align-items:center;width:160px;font-size:14px}
.logo-box{text-align:center;width:160px}
.logo-tpp{font-size:30px;font-weight:bold;line-height:0.8;margin:0;font-family:'Times New Roman',serif}
.logo-sub{font-size:10px;font-weight:bold;border-top:2px solid #000;margin-top:4px;display:inline-block}
.main-title{font-size:24px;font-weight:bold;margin-top:6px}
.content-layout{display:flex;justify-content:space-between;margin-bottom:6px}
.column{width:48%}
.field{display:flex;align-items:baseline;margin-bottom:7px}
.label{font-size:13px;white-space:nowrap}
.dots{flex-grow:1;border-bottom:1px dotted #000;margin-left:8px;min-height:14px;padding-right:4px}
.gray-box{background:#999;height:18px;width:120px;margin-left:10px;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:bold;color:#fff}
.extra-lines{margin-top:6px}
.line{border-bottom:1px dotted #000;height:18px;width:100%}
.footer-right{margin-top:10px;text-align:right;font-size:13px;font-weight:bold}
.warehouse-container{width:100%;margin:12px auto}
.wrapper{display:flex;gap:6px;align-items:flex-start;width:100%}
.side-table{width:150px;border:1.5px solid #000;display:flex;flex-direction:column;flex-shrink:0}
.side-cell{border:0.5px solid #000;padding:6px;text-align:center;min-height:30px;display:flex;flex-direction:column;justify-content:center;font-weight:bold;font-size:12px}
.side-cell span{font-weight:normal;margin-top:3px}
.main-container{flex-grow:1;border:1.5px solid #000}
.grid-table{display:grid;grid-template-columns:40px 90px 90px 1fr 70px 55px 55px;width:100%}
.grid-item{border:0.5px solid #000;padding:5px 3px;text-align:center;font-size:11px;display:flex;align-items:center;justify-content:center}
.grid-header{background-color:#f0f0f0;font-weight:bold}
.data-row{height:65px}
.bottom-section{display:grid;grid-template-columns:40px 180px 1fr;width:100%}
.col-tabaq{display:flex;flex-direction:column}
.empty-cell{height:30px;border:0.5px solid #000}
.gray-cell{height:30px;border:0.5px solid #000;background-color:#999}
.col-details{display:flex;flex-direction:column}
.label-cell{height:30px;border:0.5px solid #000;display:flex;align-items:center;padding-right:8px;font-weight:bold;font-size:11px}
.col-approval{border:0.5px solid #000;display:flex;flex-direction:column}
.approval-head{padding:4px;text-align:center;border-bottom:0.5px solid #000;font-weight:bold;font-size:11px}
.checks{display:flex;justify-content:space-around;align-items:center;flex-grow:1;font-size:10px}
.footer{border-top:1.5px solid #000;padding:6px}
.check-box{width:11px;height:11px;border:1px solid #000;display:inline-block;margin-left:4px;vertical-align:middle;text-align:center;font-size:9px;line-height:11px}
.reason-line{border-bottom:1px dotted #000;flex-grow:1;margin-right:5px}
.container{width:100%;margin:12px auto 0 auto;border:1.5px solid #000;padding:10px}
.header-split{display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:8px}
.header-item{text-align:center;font-weight:bold;font-size:13px}
.date-space{border-bottom:1px solid #000;padding:0 15px;margin:0 2px;display:inline-block;min-width:20px}
.main-grid{display:grid;grid-template-columns:1fr 1fr;gap:15px}
.sketch-box{border:1px solid #000;height:100px;background-image:linear-gradient(to right,#e0e0e0 1px,transparent 1px),linear-gradient(to bottom,#e0e0e0 1px,transparent 1px);background-size:12px 12px}
.top-columns{display:grid;grid-template-columns:1.2fr 1fr;gap:8px;margin-top:8px}
.top-columns-left{display:grid;grid-template-columns:1fr 1.2fr;gap:8px;margin-top:8px}
.option-item{display:flex;align-items:center;margin-bottom:4px;font-size:11px}
.checkbox{width:11px;height:11px;border:1px solid #000;margin-left:6px;flex-shrink:0;text-align:center;font-size:9px;line-height:11px}
.info-line{font-size:11px;margin-bottom:5px}
.line-fill{border-bottom:1px dotted #000;display:inline-block;width:60%;height:12px}
.dimensions-container{display:flex;align-items:center;margin-top:10px;width:100%}
.dimensions-label{font-weight:bold;font-size:11px;margin-left:8px;white-space:nowrap}
.independent-dimensions-table{flex-grow:1;border-collapse:collapse}
.independent-dimensions-table td{border:1px solid #000;text-align:center;padding:4px;font-size:11px}
.notes-wrapper{display:flex;flex-direction:column;align-items:center;width:100%}
.note-line{border-bottom:1px dotted #000;height:18px;width:100%}
.approval-table{width:100%;border-collapse:collapse;margin-top:12px}
.approval-table td{border:1px solid #000;height:25px;text-align:center;font-size:12px}
.bg-gray{background-color:#f0f0f0;font-weight:bold;width:100px}
</style>
</head>
<body>
<div class="page">

<!-- Section 1: بطاقة الإنتاج -->
<div class="header">
  <div class="top-id"><span>رقمنا :</span><span class="dots">${fmt(d.ID)}</span></div>
  <div class="main-title">بطاقة إنتاج</div>
  <div class="logo-box">
    <div class="logo-tpp">TPP</div>
    <div class="logo-sub">TARABICHI</div>
  </div>
</div>
<div class="content-layout">
  <div class="column">
    <div class="field"><span class="label">الاسم :</span><span class="dots">${fmt(d.Customer)}</span></div>
    <div class="field"><span class="label">النموذج :</span><span class="dots">${fmt(d.Pattern)} ${fmt(d.Pattern2)}</span></div>
    <div class="field"><span class="label">العدد المطلوب :</span><span class="dots">${fmt(d.Demand)}</span></div>
    <div class="field"><span class="label">ملاحظات :</span><span class="dots">${fmt(d.note_ord)}</span></div>
  </div>
  <div class="column">
    <div class="field"><span class="label">رقم الطلب :</span><span class="dots">${fmt(d.marji3)}</span></div>
    <div class="field"><span class="label">تاريخ الورود :</span><span class="dots">${fmt(d.date_come)}</span></div>
    <div class="field"><span class="label">موعد التسليم :</span><div class="gray-box">${fmt(d.Apoent_Delv_date)}</div></div>
    <div class="field"><span class="label">أرسلت للفرز :</span><span class="dots">${fmt(d.Perioud)}</span></div>
  </div>
</div>
<div class="extra-lines"><div class="line"></div><div class="line"></div></div>
<div class="footer-right">كود النموذج الطبي : ${fmt(d.Code_M) || '....................'}</div>

<!-- Section 2: المستودع/الإخراج -->
<div class="warehouse-container">
  <div class="wrapper">
    <div class="main-container">
      <div class="grid-table">
        <div class="grid-item grid-header">طبق</div>
        <div class="grid-item grid-header">النوع</div>
        <div class="grid-item grid-header">بلد المصدر</div>
        <div class="grid-item grid-header">المورد</div>
        <div class="grid-item grid-header">القياس</div>
        <div class="grid-item grid-header">غراماج</div>
        <div class="grid-item grid-header">الوزن</div>
        <div class="grid-item data-row"></div>
        <div class="grid-item data-row"></div>
        <div class="grid-item data-row"></div>
        <div class="grid-item data-row"></div>
        <div class="grid-item data-row"></div>
        <div class="grid-item data-row"></div>
        <div class="grid-item data-row"></div>
      </div>
      <div class="bottom-section">
        <div class="col-tabaq">
          <div class="empty-cell"></div>
          <div class="gray-cell"></div>
        </div>
        <div class="col-details">
          <div class="label-cell">اخراج زيادة طبع</div>
          <div class="label-cell grid-header">المجموع المستهلك في الطبعة</div>
        </div>
        <div class="col-approval">
          <div class="approval-head">موافقة المدير الفني على :</div>
          <div class="checks">
            <span><div class="check-box"></div> القساوة</span>
            <span><div class="check-box"></div> قياس الطبع</span>
            <span><div class="check-box"></div> صلاحية الكرتون</span>
          </div>
        </div>
      </div>
      <div class="footer">
        <div style="display:flex;justify-content:space-between;margin-bottom:8px">
          <div style="display:grid;grid-template-columns:80px 130px;gap:4px;font-size:11px">
            <div><div class="check-box"></div> تلف</div>
            <div><div class="check-box"></div> خطأ</div>
            <div><div class="check-box"></div> زيادة كمية الطبع</div>
            <div><div class="check-box"></div> تم معالجة الفروقات</div>
          </div>
          <div style="flex-grow:1;display:flex;align-items:baseline;margin-right:15px;font-size:11px">
            <b>تعليل سبب إخراج الأطباق زيادة:</b>
            <div class="reason-line"></div>
          </div>
        </div>
        <div style="text-align:left;font-weight:bold;font-size:12px">توقيع أمين المستودع: .......................................</div>
      </div>
    </div>
    <div class="side-table">
      <div class="side-cell" style="height:75px">
        الحجم النهائي
        <span>${fmt(d.final_size_tall) || 'X'} × ${fmt(d.final_size_width) || 'X'}</span>
        <span>${fmt(d.final_size_tall2) || 'X'} × ${fmt(d.final_size_width2) || 'X'}</span>
      </div>
      <div class="side-cell" style="height:75px">
        الطبع
        <span style="text-align:right;padding-right:15px">على ${fmt(d.print_on) || ''}</span>
        <span style="text-align:right;padding-right:15px">على ${fmt(d.print_on2) || ''}</span>
      </div>
      <div class="side-cell">يفصل الطبق: ${fmt(d.sheet_unit_qunt)}</div>
      <div class="side-cell">إجمالي العدد: ${fmt(d.grnd_qunt)}</div>
      <div class="side-cell">عدد الألوان: ${fmt(d.Clr_qunt)}</div>
    </div>
  </div>
</div>

<!-- Section 3: التفصيل للمقطع -->
<div class="container">
  <div class="header-split">
    <div class="header-item">التفصيل للمقطع</div>
    <div class="header-item">تاريخ القطع: <span class="date-space"></span> / <span class="date-space"></span> / <span class="date-space"></span></div>
  </div>
  <div class="main-grid">
    <div>
      <div class="sketch-box"></div>
      <div class="top-columns">
        <div>
          <div class="info-line">آلة الطبع: <span class="line-fill">${fmt(d.Machin_Print)}</span></div>
          <div class="info-line">آلة التقطيع: <span class="line-fill">${fmt(d.Machin_Cut)}</span></div>
          <div class="info-line">رقم القالب: <span class="line-fill">${fmt(d.MontagNum)}</span></div>
        </div>
        <div>
          <div class="option-item"><div class="checkbox">${chkd(checks.varn)}</div> برنيـــش</div>
          <div class="option-item"><div class="checkbox">${chkd(custChecks['مع تطوية'])}</div> مع تطويــة</div>
          <div class="option-item"><div class="checkbox">${chkd(mfgChecks['تلميع كامل'])}</div> تلميع كامل</div>
          <div class="option-item"><div class="checkbox">${chkd(mfgChecks['تلميع بقعي'])}</div> تلميع بقعي</div>
        </div>
      </div>
      <div class="dimensions-container">
        <div class="dimensions-label">الأبعاد:</div>
        <table class="independent-dimensions-table">
          <tr><td>الطول</td><td>العرض</td><td>الإرتفاع</td></tr>
          <tr style="height:20px"><td>${fmt(d.LongU)}</td><td>${fmt(d.WedthU)}</td><td>${fmt(d.HightU)}</td></tr>
        </table>
      </div>
    </div>
    <div>
      <div class="sketch-box"></div>
      <div class="top-columns-left">
        <div>
          <div class="option-item"><div class="checkbox">${chkd(mfgChecks['سلفان لميع'])}</div> سلفان لميع</div>
          <div class="option-item"><div class="checkbox">${chkd(mfgChecks['سلفان مات'])}</div> سلفان مت</div>
          <div class="option-item"><div class="checkbox">${chkd(custChecks['حراري'])}</div> حــــراري</div>
          <div class="option-item"><div class="checkbox">${chkd(custChecks['بص'])}</div> بـــلص</div>
        </div>
        <div class="notes-wrapper">
          <div style="font-weight:bold;margin-bottom:4px;text-align:center;font-size:12px">ملاحظات:</div>
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
          <div class="note-line"></div>
        </div>
      </div>
    </div>
  </div>
  <table class="approval-table">
    <tr><td class="bg-gray">موافقة الإدارة</td><td></td><td></td><td></td><td></td></tr>
    <tr><td></td><td></td><td></td><td></td><td></td></tr>
  </table>
</div>

</div>
<script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.target   = '_blank';
    a.rel      = 'noopener';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  if (isLoading) return <Loading />;

  const G = ({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) => (
    <FormGroup label={label} required={req}>{children}</FormGroup>
  );
  
  return (
    <div style={{ direction: 'rtl' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>←</button>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>
          {isEdit ? `✏️ تعديل الطلب: ${existing?.ID ?? id}` : '➕ طلب جديد'}
        </h1>
      </div>

      {/* 🔘 أزرار التحكم السريع بالأقسام */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button 
          type="button"
          onClick={() => setOpenSections({ basic: true, specs: true, printing: true, quality: true, delivery: true })}
          style={{ 
            background: 'var(--bg)', border: '1px solid var(--border)', 
            borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
            color: 'var(--ink)', fontFamily: 'Cairo, sans-serif'
          }}
        >
          📂 فتح الكل
        </button>
        <button 
          type="button"
          onClick={() => setOpenSections({ basic: false, specs: false, printing: false, quality: false, delivery: false })}
          style={{ 
            background: 'var(--bg)', border: '1px solid var(--border)', 
            borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer',
            color: 'var(--ink)', fontFamily: 'Cairo, sans-serif'
          }}
        >
          📁 إغلاق الكل
        </button>
        <Btn
          variant="outline"
          type="button"
          onClick={handleDuplicate}
          style={{ display: 'flex', alignItems: 'center', gap: 5 }}
        >
          📄 نسخ الطلب
        </Btn>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>

        {/* ══ 1. بيانات الطلب الأساسية ══ */}
        <AccordionCard 
          title="📋 بيانات الطلب الأساسية"
          isOpen={openSections.basic}
          onToggle={() => toggleSection('basic')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
            <G label="تسلسل"><input className="fc" {...register('Ser')} readOnly={!isEdit} style={{ textAlign: 'right' }} /></G>
            <G label="اسم الزبون" req><input className="fc" {...register('Customer', { required: true })} list="cust-list" placeholder="ابحث عن الزبون..." style={{ textAlign: 'right' }} /></G>
            <G label="رقمنا"><input className="fc" {...register('ID')} style={{ textAlign: 'right' }} /></G>
            <G label="المرجع"><input className="fc" {...register('marji3')} style={{ textAlign: 'right' }} /></G>
            <G label="التفصيلات المرتبطة"><input className="fc" {...register('AttachmentsOrders')} style={{ textAlign: 'right' }} /></G>
          </div>
          <datalist id="cust-list">
            {customers.map(c => <option key={(c as any).ID1} value={c.Customer} />)}
          </datalist>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12, marginTop: 12 }}>
            <G label="تاريخ الورود"><input className="fc" type="date" {...register('date_come')} style={{ textAlign: 'right' }} /></G>
            <G label="تاريخ الطلب"><input className="fc" {...register('delev_date')} style={{ textAlign: 'right' }} /></G>
            <G label="موعد التسليم"><input className="fc" {...register('Apoent_Delv_date')} style={{ textAlign: 'right' }} /></G>
            <G label="موافقة المونتاج"><input className="fc" type="date" {...register('Perioud')} style={{ textAlign: 'right' }} /></G>
            <G label="المطلوب"><input className="fc" type="number" {...register('Demand')} style={{ textAlign: 'right' }} /></G>
            <G label="نموذج طبي"><input className="fc" type="number" {...register('Med_smpl_Q')} style={{ textAlign: 'right' }} /></G>
            <G label="رقم الأمر" req><input className="fc" {...register('ID', { required: true })} placeholder="65982" style={{ textAlign: 'right' }} /></G>
            <G label="سنة العمل" req><input className="fc" {...register('Year', { required: true })} style={{ textAlign: 'right' }} /></G>
          </div>
        </AccordionCard>

        {/* ══ 2. مواصفات المطبوعة ══ */}
        <AccordionCard 
          title="🎨 مواصفات المطبوعة"
          isOpen={openSections.specs}
          onToggle={() => toggleSection('specs')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12 }}>
            <G label="نوع المطبوعة">
              <select className="fc" {...register('unit')} style={{ textAlign: 'right' }}>
                <option value="">—</option>
                {['علبة','كرتون','بروشور','استيكر','غلاف','وراقة دحابة'].map(v => <option key={v}>{v}</option>)}
              </select>
            </G>
            <G label="الاسم "><input className="fc" {...register('Pattern')} style={{ textAlign: 'right' }} /></G>
            <G label=" الوصف"><input className="fc" {...register('Pattern2')} style={{ textAlign: 'right' }} /></G>
            <G label="العيار"><input className="fc" {...register('ear')} style={{ textAlign: 'right' }} /></G>
            <G label="الوحدة">
              <select className="fc" {...register('UnitMed')} style={{ textAlign: 'right' }}>
                <option>ورقة</option><option>كيلو</option><option>متر</option>
              </select>
            </G>
            <G label="تصدير">
              <select className="fc" {...register('Form')} style={{ textAlign: 'right' }}>
                <option>لا</option><option>نعم</option>
              </select>
            </G>
            <G label="التعبئة"><input className="fc" {...register('Loading')} style={{ textAlign: 'right' }} /></G>
            <G label="ارقام الكود"><input className="fc" {...register('Code_M')} style={{ textAlign: 'right' }} /></G>
          </div>

          <SectionDiv label="المواصفات الفنية" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12 }}>
            <G label="الترخيص"><input className="fc" {...register('authorization')} style={{ textAlign: 'right' }} /></G>
            <G label="السعر"><input className="fc" type="number" {...register('Price')} style={{ textAlign: 'right' }} /></G>         
            <G label="النموذج المجاني"><input className="fc" {...register('Free_text')} style={{ textAlign: 'right' }} /></G>
            <G label="اللون"><input className="fc" {...register('Free_clr')} style={{ textAlign: 'right' }} /></G>
            <G label="الكود"><input className="fc" {...register('Code')} style={{ textAlign: 'right' }} /></G>
            <G label="رقم الطبخة"><input className="fc" {...register('Mix_num')} style={{ textAlign: 'right' }} /></G>
            <G label="تاريخ الإنتاج"><input className="fc" type="date" {...register('ProDate')} style={{ textAlign: 'right' }} /></G>
            <G label="تاريخ الانتهاء"><input className="fc" type="date" {...register('ExpDate')} style={{ textAlign: 'right' }} /></G>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 12 }}>
            <G label="شركة الامتياز"><input className="fc" {...register('Authr_co')} style={{ textAlign: 'right' }} /></G>
            <G label="رقم النموذج"><input className="fc" {...register('Pat_num')} style={{ textAlign: 'right' }} /></G>
            <G label="ملاحظات الطلبية"><input className="fc" style={{ textAlign: 'right' }} /></G>
            <G label="تعديل بالمونتاج"><input className="fc" {...register('modefyM')} style={{ textAlign: 'right' }} /></G>
          </div>

          <SectionDiv label="المواد" />
          <InlineTable
            cols={MATERIALS_COLS}
            rows={isEdit ? materialsRows : pendingMaterials}
            onRowsChange={handleMaterialsChange}
            syncDraftRows={!isEdit}
          />
        </AccordionCard>

        {/* ══ 3. مواصفات الطباعة والمونتاج ══ */}
        <AccordionCard 
          title="⚙️ مواصفات الطباعة والمونتاج"
          isOpen={openSections.printing}
          onToggle={() => toggleSection('printing')}
        >
          <SectionDiv label="الأبعاد" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12 }}>
            <G label="الطري"><input className="fc" type="number" step="0.01" {...register('SoftU')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="القاسي"><input className="fc" type="number" step="0.01" {...register('TafU')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الطول"><input className="fc" type="number" step="0.01" {...register('LongU')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="العرض"><input className="fc" type="number" step="0.01" {...register('WedthU')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الارتفاع"><input className="fc" type="number" step="0.01" {...register('HightU')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="لسان التدكيك"><input className="fc" type="number" step="0.01" {...register('Lesan')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="رقم المونتاج"><input className="fc" {...register('MontagNum')} style={{ textAlign: 'right' }} /></G>
            <G label="القالب">
              <select className="fc" {...register('Cut_num')} style={{ textAlign: 'right' }}>
                <option>لأول مرة</option><option>موجود</option>
              </select>
            </G>
          </div>

          <SectionDiv label="الطلبية والإنتاج" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12 }}>
            <G label="الحجم النهائي - طري"><input className="fc" type="number" step="0.01" {...register('final_size_tall')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الحجم النهائي - طري2"><input className="fc" type="number" step="0.01" {...register('final_size_tall2')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الحجم النهائي - قاسي"><input className="fc" type="number" step="0.01" {...register('final_size_width')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الحجم النهائي - قاسي2"><input className="fc" type="number" step="0.01" {...register('final_size_width2')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الطبع على"><input className="fc" type="number" {...register('print_on')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="الطبع على"><input className="fc" type="number" {...register('print_on2')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="فصل الطبق"><input className="fc" type="number" {...register('sheet_unit_qunt')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="2فصل الطبق"><input className="fc" type="number" {...register('sheet_unit_qunt2')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="عدد الطبع"><input className="fc" type="number" {...register('Qunt_of_print_on')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="عدد الطبع"><input className="fc" type="number" {...register('Qunt_of_print_on2')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="عدد الألوان"><input className="fc" type="number" {...register('Clr_qunt')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="منها نموذج طبي"><input className="fc" type="number" {...register('Med_Sample')} defaultValue={0} style={{ textAlign: 'right' }} /></G>
            <G label="العدد المنتج">
              <input className="fc" type="number" {...register('grnd_qunt')} defaultValue={0}
                style={{ background: '#f0f9f0', borderColor: '#27ae60', textAlign: 'right' }} />
            </G>
            <G label="المعلومات الفنية"><input className="fc" {...register('note_ord')} style={{ textAlign: 'right' }} /></G>
            <G label="برنيش"><CheckItem label="برنيش" checked={!!checks.varn} {...register('Varnish')} onChange={chk('varn')} /></G>
            <G label="CTB"><CheckItem
              label="CTB"
              checked={!!checks.CTB}
              onChange={chk('CTB')}
            /></G>
          </div>

          <SectionDiv label="العمليات" />
          <InlineTable
            cols={OPERATIONS_COLS}
            rows={isEdit ? operationsRows : pendingOps}
            onRowsChange={handleOperationsChange}
            syncDraftRows={!isEdit}
          />
        </AccordionCard>

        {/* ══ 4. مراقبة الجودة والمشاكل ══ */}
        <AccordionCard 
          title="🔍 مراقبة الجودة والمشاكل"
          isOpen={openSections.quality}
          onToggle={() => toggleSection('quality')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* أثناء التصنيع */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '9px 13px', background: 'rgba(214,137,16,.1)', color: 'var(--warn)', fontSize: 12, fontWeight: 700, borderBottom: '1px solid rgba(214,137,16,.2)', textAlign: 'right' }}>
                ⚠️ المشاكل الواردة أثناء التصنيع
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 6, display: 'block', textAlign: 'right' }}>آلة الطبع</label>
                  <input className="fc" {...register('Machin_Print')} style={{ fontSize: 12, textAlign: 'right' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 6, display: 'block', textAlign: 'right' }}>آلة التقطيع</label>
                  <input className="fc" {...register('Machin_Cut')} style={{ fontSize: 12, textAlign: 'right' }} />
                </div>
                <div style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 6, display: 'block', textAlign: 'right' }}>عدد الألوان</label>
                  <input className="fc" type="number" {...register('clr_Qnt_order')} style={{ fontSize: 12, textAlign: 'right' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {CHK_MFG.map(l => <CheckItem key={l} label={l} checked={!!mfgChecks[l]} onChange={mchk(l)} />)}
                </div>
              </div>
            </div>

            {/* من الزبون */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '9px 13px', background: 'rgba(192,57,43,.08)', color: 'var(--red)', fontSize: 12, fontWeight: 700, borderBottom: '1px solid rgba(192,57,43,.15)', textAlign: 'right' }}>
                🚨 المشاكل الواردة من الزبون
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--steel)', marginBottom: 4, display: 'block', textAlign: 'right' }}>رقم الطبع</label>
                    <input className="fc" style={{ fontSize: 12, textAlign: 'right' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--steel)', marginBottom: 4, display: 'block', textAlign: 'right' }}>عدد الطبع</label>
                    <input className="fc" type="number" style={{ fontSize: 12, textAlign: 'right' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--steel)', marginBottom: 4, display: 'block', textAlign: 'right' }}>الأبعاد</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input className="fc" type="number" defaultValue={23} style={{ fontSize: 12, textAlign: 'right' }} />
                      <span style={{ color: 'var(--muted)', fontWeight: 700 }}>×</span>
                      <input className="fc" type="number" defaultValue={25} style={{ fontSize: 12, textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input className="fc" type="number" defaultValue={23} style={{ fontSize: 12, textAlign: 'right' }} />
                      <span style={{ color: 'var(--muted)', fontWeight: 700 }}>×</span>
                      <input className="fc" type="number" defaultValue={25} style={{ fontSize: 12, textAlign: 'right' }} />
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input className="fc" type="number" defaultValue={23} style={{ fontSize: 12, textAlign: 'right' }} />
                      <span style={{ color: 'var(--muted)', fontWeight: 700 }}>×</span>
                      <input className="fc" type="number" defaultValue={25} style={{ fontSize: 12, textAlign: 'right' }} />
                    </div>
                  </div>
                  
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--steel)', marginBottom: 4, display: 'block', textAlign: 'right' }}>تاريخ الانتهاء</label>
                    <input className="fc" type="date" style={{ fontSize: 12, textAlign: 'right' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {CHK_CUST.map(l => <CheckItem key={l} label={l} checked={!!custChecks[l]} onChange={cchk(l)} />)}
                </div>
                <div style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 6, display: 'block', textAlign: 'right' }}>اختبار</label>
                  <input className="fc" placeholder="ادخل نص الاختبار" style={{ fontSize: 12, textAlign: 'right' }} />
                </div>
              </div>
            </div>
          </div>

          <SectionDiv label="سجل المشاكل الواردة من الزبون" />
          <InlineTable
            cols={PROBLEMS_COLS}
            rows={isEdit ? problemsRows : pendingProblems}
            onRowsChange={handleProblemsChange}
            syncDraftRows={!isEdit}
          />
        </AccordionCard>

        {/* ══ 5. التسليم والفوترة ══ */}
        <AccordionCard 
          title="🚚 التسليم والفوترة"
          isOpen={openSections.delivery}
          onToggle={() => toggleSection('delivery')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            <G label="الكمية المسلمة"><input className="fc" type="number" defaultValue={0} {...register('Qunt_Ac')} style={{ textAlign: 'right' }} /></G>
            <G label="التعبئة عند الزبون"><input className="fc" {...register('Cus_Paking')} style={{ textAlign: 'right' }} /></G>
            <G label="طريقة تلزيق العلبة"><input className="fc" {...register('box_stk_typ')} style={{ textAlign: 'right' }} /></G>
            <G label="الحالة">
              <div style={{ display: 'flex', gap: 8, paddingTop: 4, flexWrap: 'wrap' }}>
                <CheckItem label="سُلِّمت" checked={!!checks.Reseved} onChange={chk('Reseved')} />
                <CheckItem label="فوترة"  checked={!!checks.Billed}  onChange={chk('Billed')} />
                <CheckItem label="مطبوعة" checked={!!checks.Printed} onChange={chk('Printed')} />
              </div>
            </G>
          </div>

          <SectionDiv label="الإيصالات" />
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--steel)', color: '#fff' }}>
                  {['إيصال','تاريخ الإيصال','الحد','رقم الفاتورة','النوع','عدد العلب','ط','ع','ا','حذف'].map(h => (
                    <th key={h} style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 600, fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                    ✦ لا توجد إيصالات — اضغط ➕ لإضافة إيصال
                  </td></tr>
                )}
                {vouchers.map((v, i) => (
                  <tr key={(v as any).ID1} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fdf8f0' }}>
                    <td style={{ padding: '8px', textAlign: 'right' }}><span style={{ fontWeight: 600 }}>{v.Voucher_num || '—'}</span></td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.V_date || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.V_Qunt || '0'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.Bill_Num || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.Contean || '—'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.Paking_q || '0'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.Box_L || '0'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.Box_W || '0'}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>{v.Box_H || '0'}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>
                      <button type="button"
                        onClick={() => confirm('حذف الإيصال؟') && deleteVoucher.mutate((v as any).ID1)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12 }}>
            <Btn variant="outline" type="button" onClick={() => setVoucherOpen(true)}>➕ إضافة إيصال</Btn>
          </div>
        </AccordionCard>

        {/* ── Footer ── */}
        <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>سنة العمل: <strong>{watchYear}</strong></span>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="outline" type="button" onClick={() => navigate('/orders')}>إلغاء</Btn>
            <Btn variant="outline" type="button" onClick={printProductionCard}>🖨️ طباعة بطاقة الإنتاج</Btn>
            <Btn variant="primary" type="submit" disabled={isSaving}>
              {isSaving ? '⏳ جاري الحفظ...' : '✅ حفظ وتأكيد'}
            </Btn>
          </div>
        </div>

      </form>

      <VoucherModal open={voucherOpen} onClose={() => setVoucherOpen(false)} orderId={watchId} orderYear={watchYear} />
    </div>
  );
}
