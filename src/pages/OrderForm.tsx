import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useOrder, useCreateOrder, useUpdateOrder, useCustomers, useVouchers, useCreateVoucher, useDeleteVoucher, useOrders, useOperations, useCreateOperation, useUpdateOperation, useDeleteOperation, useCartons, useCreateCarton, useUpdateCarton, useDeleteCarton, useProblems, useCreateProblem, useUpdateProblem, useDeleteProblem } from '../hooks/useApi';
import { Card, FormGroup, SectionDiv, CheckItem, Loading, Btn } from '../components/ui';
import type { Order } from '../types';

// ── مساعد الحقل ── خارج الـ component لمنع إعادة الإنشاء
function G({ label, req, children }: { label: string; req?: boolean; children: React.ReactNode }) {
  return <FormGroup label={label} required={req}>{children}</FormGroup>;
}

// ══════════════════════════════════════════════════════
// 🔽 Accordion Card Component
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
if (minusCount > 1) {
v = v.replace(/-/g, '');
}
if (v.includes('-') && v.indexOf('-') !== 0) {
v = v.replace(/-/g, '');
}

const parts = v.split('.');
if (parts.length > 2) {
v = parts[0] + '.' + parts.slice(1).join('');
}

if (v === '-' || v === '.' || v === '-.' || v === '') return '';

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

setLocalRows((prev) => {
  const nextRows = prev.map((r, idx) =>
    idx === i ? { ...r, [key]: finalValue } : r
  );
  return nextRows;
});
setDirtyRows((prev) => {
  const next = new Set(prev);
  next.add(i);
  return next;
});
}, [isNumericCol, cleanNumber]);

const saveRow = React.useCallback(async (i: number) => {
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
    // Build updated list from rowsRef (not stale localRows closure)
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
}, [cols, localRows, onRowsChange]);

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
          <td key={`${c.key}-${i}`} style={{ padding: '3px 5px' }}>
            <input
              value={value}
              type={c.type === 'date' ? 'date' : 'text'}
              inputMode={isNumber ? 'decimal' : undefined}
              onChange={(e) => {
                let val = e.target.value;
                if (isNumber) val = cleanNumber(val);
                setCell(i, c.key, val);
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
            {(row._isNew === 'true' || dirtyRows.has(i)) && (
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
});

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
val = val.replace(/[^0-9]/g, '');
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
{ key: 'Electricity',label: 'كهرباء', type: 'number' },
{ key: 'Taghez', label: 'تجهيز', type: 'number' },
{ key: 'StopVar', label: 'توقف', type: 'number' },
{ key: 'Date', label: 'التاريخ', type: 'date' },
{ key: 'NotesA', label: 'ملاحظات' },
{ key: 'Tabrer', label: 'تبرير' },
];

const CHK_MFG = ['برنيش','تلميع بقعي','تلميع كامل','سلفان لميع','سلفان مات','طُبعت؟'];
const CHK_CUST = ['مع طبخة','مع تطوية','تدعيم زكزاك','حراري','بلص'];

// ── ربط checkboxes التصنيع بحقول الداتابيز ────────────────────────────────────
const MFG_MAP: Record<string, string> = {
'برنيش': 'varnich',
'تلميع بقعي': 'uv_Spot',
'تلميع كامل': 'uv',
'سلفان لميع': 'seluvan_lum',
'سلفان مات': 'seluvan_mat',
'طُبعت؟': 'Printed',
};

// ✅ ربط checkboxes الزبون بحقول الداتابيز
const CUST_MAP: Record<string, string> = {
'مع طبخة': 'tabkha',
'مع تطوية': 'Tay',
'تدعيم زكزاك': 'Tad3em',
'حراري': 'harary',
'بلص': 'bals',
};

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

// ══════════════════════════════════════════════════════
// 🎯 MAIN COMPONENT - OrderFormPage
// ══════════════════════════════════════════════════════
export default function OrderFormPage() {
const { id, year } = useParams<{ id?: string; year?: string }>();
const isEdit = !!(id && year && String(id).trim() && String(year).trim());
const navigate = useNavigate();
const location = useLocation();
const duplicatedData = location.state?.duplicatedData || null;

const { data: existing, isLoading } = useOrder(id ?? '', year ?? '');
const createOrder = useCreateOrder();
const updateOrder = useUpdateOrder(id ?? '', year ?? '');
const { data: customers = [] } = useCustomers();

const [checks, setChecks] = useState<Record<string, boolean>>({});
const [mfgChecks, setMfgChecks] = useState<Record<string, boolean>>({});
const [custChecks, setCustChecks] = useState<Record<string, boolean>>({});
const [voucherOpen, setVoucherOpen] = useState(false);

const [idInitialized, setIdInitialized] = useState(false);
const [hasLoadedEdit, setHasLoadedEdit] = useState(false);
const [hasLoadedDuplicate, setHasLoadedDuplicate] = useState(false);

const [currentYear] = useState(String(new Date().getFullYear()));
const ordersYearRef = useRef<string>(String(new Date().getFullYear()));

// ✅ useForm بدون dependencies معقدة
const { register, handleSubmit, reset, setValue } = useForm<Order>({
defaultValues: {
Year: currentYear,
ID: '',
Ser: ''
}
});

// ✅ استخدام useRef لحفظ بيانات الفورم
const formDataRef = useRef<Partial<Order>>({});

// ── helper مشترك لمزامنة أي InlineTable مع الداتابيز ────────────────────────
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
      await onDelete(Number(old.ID)).catch(err => {
        console.error('❌ Delete error:', err);
      });
    }
  }

  for (const row of newRows) {
    const { ID, _isNew, ...fields } = row;
    if (ID && oldIds.has(ID)) {
      await onUpdate(Number(ID), fields).catch(err => {
        console.error('❌ Update error:', err);
      });
    } else if (!ID) {
      await onCreate(fields).catch(err => {
        console.error('❌ Create error:', err);
      });
    }
  }
} catch (error) {
  console.error('❌ syncRows error:', error);
}
}, []);

// ── الكرتون ───────────────────────────────────────────────────────────────────
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

const [pendingMaterials, setPendingMaterials] = useState<Record<string, string>[]>([]);
const [pendingProblems, setPendingProblems] = useState<Record<string, string>[]>([]);
const [pendingOps, setPendingOps] = useState<Record<string, string>[]>([]);

const handleMaterialsChange = useCallback(async (newRows: Record<string, string>[]) => {
if (!isEdit) {
setPendingMaterials(newRows);
return;
}

try {
  await syncRows(
    materialsRows, newRows,
    (f) => createCarton.mutateAsync({ ...f, ID: id!, year: year! }),
    (rowId, f) => updateCarton.mutateAsync({ rowId, data: f }),
    (rowId) => deleteCarton.mutateAsync(rowId),
  );
} catch (error) {
  console.error('❌ handleMaterialsChange error:', error);
}
}, [isEdit, materialsRows, syncRows, createCarton, updateCarton, deleteCarton, id, year]);

// ── سجل المشاكل ───────────────────────────────────────────────────────────────
const { data: problemsData = [] } = useProblems(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
const createProblem = useCreateProblem();
const updateProblem = useUpdateProblem();
const deleteProblem = useDeleteProblem();

interface Problem {
ID1?: number;
print_num?: string;
prod_date?: string;
exp_date?: string;
print_count?: number;
}

const problemsRows: Record<string, string>[] = useMemo(() =>
problemsData.map((p: Problem) => ({
ID: String(p.ID1 ?? ''),
print_num: p.print_num ?? '',
prod_date: p.prod_date ?? '',
exp_date: p.exp_date ?? '',
print_count: String(p.print_count ?? ''),
})), [problemsData]
);

const handleProblemsChange = useCallback(async (newRows: Record<string, string>[]) => {
if (!isEdit) {
setPendingProblems(newRows);
return;
}

try {
  await syncRows(
    problemsRows, newRows,
    (f) => createProblem.mutateAsync({ ...f, ID: id!, Year: year! }),
    (rowId, f) => updateProblem.mutateAsync({ rowId, data: f }),
    (rowId) => deleteProblem.mutateAsync(rowId),
  );
} catch (error) {
  console.error('❌ handleProblemsChange error:', error);
}
}, [isEdit, problemsRows, syncRows, createProblem, updateProblem, deleteProblem, id, year]);

// ── العمليات ──────────────────────────────────────────────────────────────────
const { data: operationsData = [] } = useOperations(isEdit ? (id ?? '') : '', isEdit ? (year ?? '') : '');
const createOperation = useCreateOperation();
const updateOperation = useUpdateOperation();
const deleteOperation = useDeleteOperation();

const operationsRows: Record<string, string>[] = useMemo(() =>
operationsData.map((op: any) => ({
ID: String(op.ID1 ?? op.ID ?? ''),
Action: op.Action ?? '',
Color: op.Color ?? '',
Qunt_Ac: String(op.Qunt_Ac ?? ''),
On: String(op.On ?? ''),
Machin: op.Machin ?? '',
Hours: String(op.Hours ?? ''),
Kelo: String(op.Kelo ?? ''),
Actual: String(op.Actual ?? ''),
Tarkeb: String(op.Tarkeb ?? ''),
Wash: String(op.Wash ?? ''),
Electricity: String(op.Electricity ?? ''),
Taghez: String(op.Taghez ?? ''),
StopVar: String(op.StopVar ?? ''),
Date: op.Date ?? '',
NotesA: op.NotesA ?? '',
Tabrer: op.Tabrer ?? '',
})), [operationsData]
);

const handleOperationsChange = useCallback(async (newRows: Record<string, string>[]) => {
if (!isEdit) {
setPendingOps(newRows);
return;
}

try {
  await syncRows(
    operationsRows, newRows,
    (f) => createOperation.mutateAsync({ ...f, ID: id!, year: year! }),
    (rowId, f) => updateOperation.mutateAsync({ rowId, data: f }),
    (rowId) => deleteOperation.mutateAsync(rowId),
  );
} catch (error) {
  console.error('❌ handleOperationsChange error:', error);
}
}, [isEdit, operationsRows, syncRows, createOperation, updateOperation, deleteOperation, id, year]);

// ── حالة الأقسام ──────────────────────────────────────────────────────────────
const getInitialSections = () => {
try {
const saved = localStorage.getItem('orderFormSections');
if (saved) return JSON.parse(saved);
} catch {}
return { basic: true, specs: true, printing: true, quality: true, delivery: true };
};

const [openSections, setOpenSections] = useState<Record<string, boolean>>(getInitialSections);

useEffect(() => {
localStorage.setItem('orderFormSections', JSON.stringify(openSections));
}, [openSections]);

const { data: ordersResponse } = useOrders({ year: currentYear });
const orders = useMemo(() => ordersResponse?.data ?? [], [ordersResponse]);

const { data: vouchers = [] } = useVouchers(
isEdit ? (id ?? '') : '',
isEdit ? (year ?? currentYear) : currentYear
);
const deleteVoucher = useDeleteVoucher();

// ✅ 1️⃣ تحميل بيانات التعديل - مرة واحدة
useEffect(() => {
if (!isEdit || !existing || hasLoadedEdit || duplicatedData) return;

reset(existing);
formDataRef.current = { ...existing };

const loadedMfg: Record<string, boolean> = {};
Object.entries(MFG_MAP).forEach(([label, field]) => {
  loadedMfg[label] = fromBit((existing as any)[field]);
});
setMfgChecks(loadedMfg);

const loadedCust: Record<string, boolean> = {};
Object.entries(CUST_MAP).forEach(([label, field]) => {
  loadedCust[label] = fromBit((existing as any)[field]);
});
setCustChecks(loadedCust);

setChecks({
  varnich: fromBit(existing.varnich),
  uv: fromBit(existing.uv),
  uv_Spot: fromBit(existing.uv_Spot),
  seluvan_lum: fromBit(existing.seluvan_lum),
  seluvan_mat: fromBit(existing.seluvan_mat),
  Tad3em: fromBit(existing.Tad3em),
  Tay: fromBit(existing.Tay),
  harary: fromBit(existing.harary),
  rolling: fromBit(existing.rolling),
  Printed: fromBit(existing.Printed),
  Billed: fromBit(existing.Billed),
  Reseved: fromBit(existing.Reseved),
  CTB: fromBit(existing.DubelM),
  varn: fromBit(existing.varnich),
});

setHasLoadedEdit(true);
}, [isEdit, existing, hasLoadedEdit, duplicatedData, reset]);

// ✅ 2️⃣ تحميل بيانات النسخ - مرة واحدة
useEffect(() => {
if (!duplicatedData || hasLoadedDuplicate) return;

const {
  checks: copiedChecks,
  mfgChecks: copiedMfg,
  custChecks: copiedCust,
  idInitialized: copiedIdInitialized,
  ...orderData
} = duplicatedData;

reset(orderData);
formDataRef.current = { ...orderData };
setChecks(copiedChecks ?? {});
setMfgChecks(copiedMfg ?? {});
setCustChecks(copiedCust ?? {});
setIdInitialized(copiedIdInitialized ?? false);
setMaterialsRows([]);
setPendingMaterials([]);
setPendingOps([]);
setPendingProblems([]);
setHasLoadedDuplicate(true);
}, [duplicatedData, hasLoadedDuplicate, reset]);

// ✅ 3️⃣ تهيئة طلب جديد - مرة واحدة فقط
const idInitializedRef = useRef(false);

useEffect(() => {
  if (isEdit || duplicatedData) return;
  if (idInitializedRef.current) return;
  if (!orders || orders.length === 0) return;

  idInitializedRef.current = true;

  const latestOrder = orders[orders.length - 1];
  const lastSer = parseInt(latestOrder?.Ser || '0') || 0;
  const newId = String((Number(latestOrder?.ID) || 0) + 1);

  const initData = {
    Ser: String(lastSer + 1),
    ID: newId,
    Year: currentYear,
  };

  reset((prev) => ({ ...prev, ...initData }));
  formDataRef.current = initData;
  setIdInitialized(true);
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [orders]);
// ✅ الحفظ - مع معالجة أخطاء شاملة
const onSubmit = useCallback(async (data: Order) => {
try {
BOOL_FIELDS.forEach(f => {
(data as any)[f] = toBit(checks[f]);
});

Object.entries(MFG_MAP).forEach(([label, field]) => {
  (data as any)[field] = toBit(mfgChecks[label]);
});

Object.entries(CUST_MAP).forEach(([label, field]) => {
  (data as any)[field] = toBit(custChecks[label]);
});

(data as any).DubelM = toBit(checks.CTB);

if (!isEdit) {
  const maxRowId = orders.length > 0
    ? Math.max(...orders.map((o: any) => o.ID)) + 1
    : 1;
  (data as any).ID = maxRowId;
}

if (isEdit) {
  await updateOrder.mutateAsync({ 
    ...data, 
    ID: id,        // ✅ نأخذ ID من الـ URL وليس من الفورم
    Year: year     // ✅ نأخذ Year من الـ URL وليس من الفورم
  });
// 🔁 استبدل كل هذا القسم:

} else {
  const maxRowId = orders.length > 0
    ? Math.max(...orders.map((o: any) => o.ID)) + 1
    : 1;
  (data as any).ID = maxRowId;
}

if (isEdit) {
  await updateOrder.mutateAsync({ 
    ...data, 
    ID: id,        // ✅ تثبيت ID من الـ URL
    Year: year     // ✅ تثبيت Year من الـ URL
  });
} else {
  // ✅ 1️⃣ إنشاء الطلب الرئيسي مع ضمان وجود Year
  const created = await createOrder.mutateAsync({ 
    ...data, 
    Year: data.Year || currentYear  // ✅ يضمن وجود Year دائماً
  });
  
  const newId = String((created as any)?.ID ?? (data as any).ID);
  
  // ✅ 2️⃣ تحديد السنة للـ sub-tables (كرتون، مشاكل، عمليات)
  const yr = String(data.Year || currentYear);  // ✅ نفس المنطق

  // ✅ 3️⃣ إنشاء العناصر الفرعية مع تمرير Year بشكل صحيح
  await Promise.all([
    ...pendingMaterials.map(({ ID, _isNew, ...f }) =>
      createCarton.mutateAsync({ 
        ...f, 
        ID: newId, 
        Year: yr,    // ✅ اسم الحقل في الداتابيز
        year: yr     // ✅ احتياطاً لو الـ API يقبل الاسم الصغير
      }).catch(err => {
        console.error('❌ Create carton error:', err);
        return null;
      })),
      
    ...pendingProblems.map(({ ID, _isNew, ...f }) =>
      createProblem.mutateAsync({ 
        ...f, 
        ID: newId, 
        Year: yr 
      }).catch(err => {
        console.error('❌ Create problem error:', err);
        return null;
      })),
      
    ...pendingOps.map(({ ID, _isNew, ...f }) =>
      createOperation.mutateAsync({ 
        ...f, 
        ID: newId, 
        Year: yr 
      }).catch(err => {
        console.error('❌ Create operation error:', err);
        return null;
      })),
  ]);
}

await new Promise(resolve => setTimeout(resolve, 100));
navigate('/orders');
} catch (error) {
console.error('❌ Submit error:', error);
alert('حدث خطأ أثناء الحفظ. الرجاء المحاولة مرة أخرى.');
}
}, [checks, mfgChecks, custChecks, isEdit, orders, updateOrder, createOrder, currentYear, pendingMaterials, pendingProblems, pendingOps, createCarton, createProblem, createOperation, navigate]);

const handleDuplicate = useCallback(() => {
const sourceData = isEdit && existing ? { ...existing } : {};

const excludeFields = [
  'ID', 'ID1', 'Ser',
  'Year',
  'date_come', 'Perioud',
  'marji3',
  'AttachmentsOrders',
];

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
      idInitialized: false,
    }
  }
});
}, [isEdit, existing, checks, mfgChecks, custChecks, navigate]);

const chk = useCallback((k: string) => (v: boolean) => setChecks(c => ({ ...c, [k]: v })), []);
const mchk = useCallback((k: string) => (v: boolean) => setMfgChecks(c => ({ ...c, [k]: v })), []);
const cchk = useCallback((k: string) => (v: boolean) => setCustChecks(c => ({ ...c, [k]: v })), []);

const toggleSection = useCallback((key: string) => {
setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
}, []);

const isSaving = createOrder.isPending || updateOrder.isPending;

// ══════════════════════════════════════════════════════
// 🖨️ طباعة بطاقة الإنتاج
const printProductionCard = useCallback(() => {
const d = formDataRef.current;  const chkd = (val: any) => (val ? '✔' : '');
  const fmt = (v: any) => v ?? '';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
/* ═══════════════════════════════════════════════════════════
   RESET & FORCE RTL – FIXES TABLE SHIFTING LEFT
   ═══════════════════════════════════════════════════════════ */
* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

html, body {
    direction: rtl !important;
    text-align: right !important;
    font-family: 'Arial', sans-serif;
    background: #fff;
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
}

/* Force all block and inline elements to align right */
div, p, span, h1, h2, h3, h4, h5, h6,
table, td, th, tr, tbody, thead, tfoot,
ul, li, section, article, header, footer {
    direction: rtl !important;
    text-align: right !important;
}

/* ═══════════════════════════════════════════════════════════
   PAGE CONTAINER
   ═══════════════════════════════════════════════════════════ */
.page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto;
    padding: 8mm;
    box-sizing: border-box;
    border: 1px solid #000;
    direction: rtl !important;
    text-align: right !important;
    display: block;
    position: relative;
    left: 0;
    right: 0;
}

@media print {
    * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
        print-color-adjust: exact !important;
    }
    
    html, body {
        width: 210mm;
        height: 297mm;
        margin: 0;
        padding: 0;
        direction: rtl !important;
        text-align: right !important;
    }
    
    body {
        margin: 0 !important;
        padding: 0 !important;
        display: flex;
        justify-content: flex-end;
        align-items: flex-start;
    }
    
    .page {
        width: 210mm;
        height: 297mm;
        margin: 0 !important;
        padding: 8mm !important;
        border: none !important;
        direction: rtl !important;
        text-align: right !important;
        box-sizing: border-box;
        page-break-after: always;
        page-break-inside: avoid;
    }
}

/* ═══════════════════════════════════════════════════════════
   TABLES – CRITICAL FIX
   ═══════════════════════════════════════════════════════════ */
table {
    width: 100%;
    border-collapse: collapse;
    direction: rtl !important;
    text-align: right !important;
    table-layout: fixed;          /* Prevents columns from resizing */
    word-break: break-word;
}

th, td {
    text-align: right !important;
    vertical-align: middle;
    padding: 6px 4px;
    direction: rtl !important;
}

/* ═══════════════════════════════════════════════════════════
   FLEX & GRID CONTAINERS – ALIGN TO RIGHT
   ═══════════════════════════════════════════════════════════ */
.header,
.content-layout,
.wrapper,
.bottom-section,
.checks,
.warehouse-out-body,
.top-columns,
.top-columns-left,
.dimensions-container,
.option-item {
    justify-content: flex-end !important;
}

.grid-table {
    display: grid;
    direction: rtl !important;
    text-align: right !important;
}

.grid-item {
    text-align: right !important;
    justify-content: flex-end !important;
    display: flex;
    align-items: center;
}

/* ═══════════════════════════════════════════════════════════
   PULL CONTAINERS TO RIGHT EDGE
   ═══════════════════════════════════════════════════════════ */
.warehouse-container,
.warehouse-out,
.main-container,
.side-table,
.container,
.wrapper {
    margin-left: auto !important;
    margin-right: 0 !important;
}

/* ═══════════════════════════════════════════════════════════
   DOTTED UNDERLINES & CHECKBOXES
   ═══════════════════════════════════════════════════════════ */
.dots, .line-fill, .reason-line {
    margin-right: 8px !important;
    margin-left: 0 !important;
}

.check-box, .checkbox {
    margin-left: 6px !important;
    margin-right: 0 !important;
    display: inline-block;
}

/* ═══════════════════════════════════════════════════════════
   EXISTING STYLES (KEPT FOR COMPATIBILITY)
   ═══════════════════════════════════════════════════════════ */
/* ------------------- Section 1 ------------------- */
.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
}
.top-id {
    display: flex;
    align-items: center;
    width: 160px;
    font-size: 14px;
}
.logo-box {
    text-align: center;
    width: 160px;
}
.logo-tpp {
    font-size: 30px;
    font-weight: bold;
    line-height: 0.8;
    margin: 0;
    font-family: 'Times New Roman', serif;
}
.logo-sub {
    font-size: 10px;
    font-weight: bold;
    border-top: 2px solid #000;
    margin-top: 4px;
    display: inline-block;
}
.main-title {
    font-size: 24px;
    font-weight: bold;
    margin-top: 6px;
}
.content-layout {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
}
.column {
    width: 48%;
}
.field {
    display: flex;
    align-items: baseline;
    margin-bottom: 7px;
}
.label {
    font-size: 13px;
    white-space: nowrap;
}
.dots {
    flex-grow: 1;
    border-bottom: 1px dotted #000;
    margin-left: 8px;
    min-height: 14px;
    padding-right: 4px;
}
.gray-box {
    background: #999;
    height: 18px;
    width: 120px;
    margin-left: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: #fff;
}
.extra-lines {
    margin-top: 6px;
}
.line {
    border-bottom: 1px dotted #000;
    height: 18px;
    width: 100%;
}
.footer-right {
    margin-top: 10px;
    text-align: right;
    font-size: 13px;
    font-weight: bold;
}

/* ------------------- Section 2 ------------------- */
.warehouse-container {
    width: 100%;
    margin: 12px auto;
}
.wrapper {
    display: flex;
    gap: 6px;
    align-items: flex-start;
    width: 100%;
}
.side-table {
    width: 150px;
    border: 1.5px solid #000;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
}
.side-cell {
    border: 0.5px solid #000;
    padding: 6px;
    text-align: center;
    min-height: 30px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    font-weight: bold;
    font-size: 12px;
}
.side-cell span { font-weight: normal; margin-top: 3px; }
.main-container {
    flex-grow: 1;
    border: 1.5px solid #000;
}
.grid-table {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    width: 100%;
}
.grid-item {
    border: 0.5px solid #000;
    padding: 5px 3px;
    text-align: center;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
}
.grid-header { background-color: #f0f0f0; font-weight: bold; }
.data-row { height: 65px; }
.bottom-section {
    display: grid;
    grid-template-columns: 40px 180px 1fr;
    width: 100%;
}
.col-tabaq { display: flex; flex-direction: column; }
.empty-cell { height: 30px; border: 0.5px solid #000; }
.gray-cell { height: 30px; border: 0.5px solid #000; background-color: #999; }
.col-details { display: flex; flex-direction: column; }
.label-cell {
    height: 30px;
    border: 0.5px solid #000;
    display: flex;
    align-items: center;
    padding-right: 8px;
    font-weight: bold;
    font-size: 11px;
}
.col-approval {
    border: 0.5px solid #000;
    display: flex;
    flex-direction: column;
}
.approval-head {
    padding: 4px;
    text-align: center;
    border-bottom: 0.5px solid #000;
    font-weight: bold;
    font-size: 11px;
}
.checks {
    display: flex;
    justify-content: space-around;
    align-items: center;
    flex-grow: 1;
    font-size: 10px;
}
.footer {
    border-top: 1.5px solid #000;
    padding: 6px;
}
.check-box {
    width: 11px;
    height: 11px;
    border: 1px solid #000;
    display: inline-block;
    margin-left: 4px;
    vertical-align: middle;
    text-align: center;
    font-size: 9px;
    line-height: 11px;
}
.reason-line {
    border-bottom: 1px dotted #000;
    flex-grow: 1;
    margin-right: 5px;
}

/* ------------------- Section 3 ------------------- */
.warehouse-out {
    width: 100%;
    margin: 10px auto;
    font-size: 12px;
    font-weight: bold;
}
.warehouse-out .header-row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 11px;
    flex-wrap: nowrap;
    gap: 4px;
}
.warehouse-out .header-row span {
    display: inline-block;
    white-space: nowrap;
}
.warehouse-out-body {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}
.warehouse-out-table {
    border-collapse: collapse;
    flex-grow: 1;
    text-align: center;
    font-size: 11px;
}
.warehouse-out-table th,
.warehouse-out-table td {
    border: 1px solid black;
    padding: 6px 4px;
}
.warehouse-out-table thead th {
    background-color: #f0f0f0;
    font-weight: bold;
}
.warehouse-out-table tr.dashed-row td:not(:first-child) {
    border-bottom: 1px dashed black;
}
.warehouse-out-side {
    width: 90px;
    flex-shrink: 0;
    font-size: 11px;
    font-weight: bold;
    text-align: center;
}

/* ------------------- Section 4 ------------------- */
.container {
    width: 100%;
    margin: 12px auto 0 auto;
    border: 1.5px solid #000;
    padding: 10px;
}
.header-split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-bottom: 8px;
}
.header-item {
    text-align: center;
    font-weight: bold;
    font-size: 13px;
}
.date-space {
    border-bottom: 1px solid #000;
    padding: 0 15px;
    margin: 0 2px;
    display: inline-block;
    min-width: 20px;
}
.year-input {
    border-bottom: 1px solid #000;
    padding: 0 8px;
    margin-left: 2px;
    display: inline-block;
    min-width: 15px;
}
.main-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
}
.sketch-box {
    border: 1px solid #000;
    height: 100px;
    background-image:
        linear-gradient(to right, #e0e0e0 1px, transparent 1px),
        linear-gradient(to bottom, #e0e0e0 1px, transparent 1px);
    background-size: 12px 12px;
}
.top-columns {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 8px;
    margin-top: 8px;
}
.top-columns-left {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 8px;
    margin-top: 8px;
}
.option-item {
    display: flex;
    align-items: center;
    margin-bottom: 4px;
    font-size: 11px;
}
.checkbox {
    width: 11px;
    height: 11px;
    border: 1px solid #000;
    margin-left: 6px;
    flex-shrink: 0;
    text-align: center;
    font-size: 9px;
    line-height: 11px;
}
.info-line {
    font-size: 11px;
    margin-bottom: 5px;
}
.line-fill {
    border-bottom: 1px dotted #000;
    display: inline-block;
    width: 60%;
    height: 12px;
}
.dimensions-container {
    display: flex;
    align-items: center;
    margin-top: 10px;
    width: 100%;
}
.dimensions-label {
    font-weight: bold;
    font-size: 11px;
    margin-left: 8px;
    white-space: nowrap;
}
.independent-dimensions-table {
    flex-grow: 1;
    border-collapse: collapse;
}
.independent-dimensions-table td {
    border: 1px solid #000;
    text-align: center;
    padding: 4px;
    font-size: 11px;
}
.notes-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
}
.note-line {
    border-bottom: 1px dotted #000;
    height: 18px;
    width: 100%;
}
.approval-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 12px;
}
.approval-table td {
    border: 1px solid #000;
    height: 25px;
    text-align: center;
    font-size: 12px;
}
.bg-gray {
    background-color: #f0f0f0;
    font-weight: bold;
    width: 100px;
}
</style>
</head>
<body dir="rtl">

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

<!-- Section 2: المستودع/الأخراج مع wrapper الجديد -->
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
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <div style="display: grid; grid-template-columns: 80px 130px; gap: 4px; font-size: 11px;">
                        <div><div class="check-box"></div> تلف</div>
                        <div><div class="check-box"></div> خطأ</div>
                        <div><div class="check-box"></div> زيادة كمية الطبع</div>
                        <div><div class="check-box"></div> تم معالجة الفروقات</div>
                    </div>
                    <div style="flex-grow: 1; display: flex; align-items: baseline; margin-right: 15px; font-size: 11px;">
                        <b>تعليل سبب إخراج الأطباق زيادة:</b>
                        <div class="reason-line"></div>
                    </div>
                </div>
                <div style="text-align: left; font-weight: bold; font-size: 12px;">
                    توقيع أمين المستودع: .......................................
                </div>
            </div>
        </div>

        <div class="side-table">
            <div class="side-cell" style="height: 75px;">
                الحجم النهائي
                <span>${fmt(d.final_size_tall) || 'X'} × ${fmt(d.final_size_width) || 'X'}</span>
                <span>${fmt(d.final_size_tall2) || 'X'} × ${fmt(d.final_size_width2) || 'X'}</span>
            </div>
            <div class="side-cell" style="height: 75px;">
                الطبع
                <span style="display:flex; align-items:center; justify-content:flex-end; width:100%; padding-right:4px;">على <span style="flex-grow:1; border-bottom:1px dotted #000; margin-right:4px; display:inline-block;">${fmt(d.print_on)}</span></span>
                <span style="display:flex; align-items:center; justify-content:flex-end; width:100%; padding-right:4px;">على <span style="flex-grow:1; border-bottom:1px dotted #000; margin-right:4px; display:inline-block;">${fmt(d.print_on2)}</span></span>
            </div>
            <div class="side-cell">يفصل الطبق: ${fmt(d.sheet_unit_qunt)}</div>
            <div class="side-cell" style="flex-direction:column; align-items:flex-start; min-height:50px; padding-bottom:0;">
                <span style="margin-bottom:4px;">إجمالي العدد: ${fmt(d.grnd_qunt)}</span>
            </div>
            <div class="side-cell">عدد الألوان: ${fmt(d.Clr_qunt)}</div>
        </div>
    </div>
</div>

<!-- Section 3: إخراج المستودع -->
<div class="warehouse-out">
    <div class="header-row">
        <span>أخرج من المستودع &nbsp; / &nbsp; / &nbsp; ٢٠١</span>
        <span>رقم الصـــــادر: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span>التوقيـــــع: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span>عدد الطبع على</span>
    </div>
    <div class="header-row">
        <span>أخرج من المستودع &nbsp; / &nbsp; / &nbsp; ٢٠١</span>
        <span>رقم الصـــــادر: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span>التوقيـــــع: &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
        <span>عدد الطبع على</span>
    </div>
    <div class="warehouse-out-body">
        <table class="warehouse-out-table">
            <thead>
                <tr>
                    <th style="width: 20%;"></th>
                    <th style="width: 10%;">العـدد</th>
                    <th style="width: 25%;">الجهة المنفـــــذة</th>
                    <th style="width: 45%;">ملاحظـــــات</th>
                </tr>
            </thead>
            <tbody>
                <tr class="dashed-row">
                    <td>بلاكـــــــات</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
                <tr>
                    <td>بلاكات إضافية</td>
                    <td></td>
                    <td></td>
                    <td></td>
                </tr>
            </tbody>
        </table>
        <div class="warehouse-out-side">
            منها نموذج طبي على
        </div>
    </div>
</div>

<!-- Section 4: التفصيل للمقطع -->
<div class="container">
    <div class="header-split">
        <div class="header-item">التفصيل للمقطع</div>
        <div class="header-item">
            تاريخ القطع:
            <span class="date-space"></span> /
            <span class="date-space"></span> /
            <span class="year-input"></span>٢٠
        </div>
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
                    <div class="option-item"><div class="checkbox">${chkd(mfgChecks['برنيش'])}</div> برنيـــش</div>
                    <div class="option-item"><div class="checkbox">${chkd(custChecks['مع تطوية'])}</div> مع تطويــة</div>
                    <div class="option-item"><div class="checkbox">${chkd(mfgChecks['تلميع كامل'])}</div> تلميع كامل</div>
                    <div class="option-item"><div class="checkbox">${chkd(mfgChecks['تلميع بقعي'])}</div> تلميع بقعي</div>
                </div>
            </div>

            <div class="dimensions-container">
                <div class="dimensions-label">الأبعاد:</div>
                <table class="independent-dimensions-table">
                    <tr>
                        <td style="width: 33%;">الطول</td>
                        <td style="width: 33%;">العرض</td>
                        <td style="width: 34%;">الإرتفاع</td>
                    </tr>
                    <tr style="height: 20px;">
                        <td>${fmt(d.LongU)}</td>
                        <td>${fmt(d.WedthU)}</td>
                        <td>${fmt(d.HightU)}</td>
                    </tr>
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
                    <div class="option-item"><div class="checkbox">${chkd(custChecks['بلص'])}</div> بـــلص</div>
                </div>
                <div class="notes-wrapper">
                    <div style="font-weight: bold; margin-bottom: 4px; text-align: center; font-size: 12px;">ملاحظات:</div>
                    <div class="note-line"></div>
                    <div class="note-line"></div>
                    <div class="note-line"></div>
                    <div class="note-line"></div>
                </div>
            </div>
        </div>
    </div>

    <table class="approval-table">
        <tr>
            <td class="bg-gray">موافقة الإدارة</td>
            <td></td><td></td><td></td><td></td>
        </tr>
        <tr>
            <td></td><td></td><td></td><td></td><td></td>
        </tr>
    </table>
</div>

</div>
<script>
window.addEventListener('load', () => { 
    setTimeout(() => {
        window.focus();
        const settings = window.matchMedia('print');
        window.print();
    }, 500);
});
</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}, [checks, custChecks, mfgChecks]); // Ensure getValues is in deps

if (isLoading) return <Loading />;

return (
<div style={{ direction: 'rtl' }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
<button onClick={() => navigate('/orders')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 }}>←</button>
<h1 style={{ fontSize: 20, fontWeight: 900 }}>
{isEdit ? `✏️ تعديل الطلب: ${existing?.ID ?? id}` : '➕ طلب جديد'}
</h1>
</div>

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
      <G label="تسلسل"><input className="fc" {...register('Ser')} readOnly style={{ textAlign: 'right', background: '#f8f9fa' }} /></G>
      <G label="اسم الزبون" req><input className="fc" {...register('Customer', { required: true })} list="cust-list" placeholder="ابحث عن الزبون..." style={{ textAlign: 'right' }} /></G>
      <G label="رقمنا"><input className="fc" {...register('ID')} readOnly style={{ textAlign: 'right', background: '#f8f9fa' }} /></G>
      <G label="المرجع" req><input className="fc" {...register('marji3', { required: true })} placeholder="65982" style={{ textAlign: 'right' }} /></G>
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
      <G label="السعر"><input className="fc" {...register('Price')} style={{ textAlign: 'right' }} /></G>         
      <G label="النموذج المجاني"><input className="fc" {...register('Free_txt')} style={{ textAlign: 'right' }} /></G>
      <G label="اللون"><input className="fc" {...register('Free_clr')} style={{ textAlign: 'right' }} /></G>
      <G label="الكود"><input className="fc" {...register('Code')} style={{ textAlign: 'right' }} /></G>
      <G label="رقم الطبخة"><input className="fc" {...register('Mix_num')} style={{ textAlign: 'right' }} /></G>
      <G label="تاريخ الإنتاج"><input className="fc" type="date" {...register('ProDate')} style={{ textAlign: 'right' }} /></G>
      <G label="تاريخ الانتهاء"><input className="fc" type="date" {...register('ExpDate')} style={{ textAlign: 'right' }} /></G>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginTop: 12 }}>
      <G label="شركة الامتياز"><input className="fc" {...register('Authr_co')} style={{ textAlign: 'right' }} /></G>
      <G label="رقم النموذج"><input className="fc" {...register('Pat_Num')} style={{ textAlign: 'right' }} /></G>
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
      <G label="الطري"><input className="fc" type="number" step="0.01" {...register('SoftU')} style={{ textAlign: 'right' }} /></G>
      <G label="القاسي"><input className="fc" type="number" step="0.01" {...register('TafU')} style={{ textAlign: 'right' }} /></G>
      <G label="الطول"><input className="fc" type="number" step="0.01" {...register('LongU')} style={{ textAlign: 'right' }} /></G>
      <G label="العرض"><input className="fc" type="number" step="0.01" {...register('WedthU')} style={{ textAlign: 'right' }} /></G>
      <G label="الارتفاع"><input className="fc" type="number" step="0.01" {...register('HightU')} style={{ textAlign: 'right' }} /></G>
      <G label="لسان التدكيك"><input className="fc" type="number" step="0.01" {...register('Lesan')} style={{ textAlign: 'right' }} /></G>
      <G label="رقم المونتاج"><input className="fc" {...register('MontagNum')} style={{ textAlign: 'right' }} /></G>
      <G label="القالب">
        <select className="fc" {...register('Cut_num')} style={{ textAlign: 'right' }}>
          <option>لأول مرة</option><option>موجود</option>
        </select>
      </G>
    </div>

    <SectionDiv label="الطلبية والإنتاج" />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: 12 }}>
      <G label="الحجم النهائي - طري"><input className="fc" type="number" step="0.01" {...register('final_size_tall')} style={{ textAlign: 'right' }} /></G>
      <G label="الحجم النهائي - طري2"><input className="fc" type="number" step="0.01" {...register('final_size_tall2')} style={{ textAlign: 'right' }} /></G>
      <G label="الحجم النهائي - قاسي"><input className="fc" type="number" step="0.01" {...register('final_size_width')} style={{ textAlign: 'right' }} /></G>
      <G label="الحجم النهائي - قاسي2"><input className="fc" type="number" step="0.01" {...register('final_size_width2')} style={{ textAlign: 'right' }} /></G>
      <G label="الطبع على"><input className="fc" {...register('print_on')} style={{ textAlign: 'right' }} /></G>
      <G label="الطبع على"><input className="fc" {...register('print_on2')} style={{ textAlign: 'right' }} /></G>
      <G label="فصل الطبق"><input className="fc" {...register('sheet_unit_qunt')} style={{ textAlign: 'right' }} /></G>
      <G label="2فصل الطبق"><input className="fc" {...register('sheet_unit_qunt2')} style={{ textAlign: 'right' }} /></G>
      <G label="عدد الطبع"><input className="fc"  {...register('Qunt_of_print_on')} style={{ textAlign: 'right' }} /></G>
      <G label="عدد الطبع"><input className="fc"  {...register('Qunt_of_print_on2')} style={{ textAlign: 'right' }} /></G>
      <G label="عدد الألوان"><input className="fc" type="number" {...register('Clr_qunt')} style={{ textAlign: 'right' }} /></G>
      <G label="منها نموذج طبي"><input className="fc"  {...register('Med_Sampel')} style={{ textAlign: 'right' }} /></G>
      <G label="العدد المنتج">
        <input className="fc" type="number" {...register('grnd_qunt')}
          style={{ background: '#f0f9f0', borderColor: '#27ae60', textAlign: 'right' }} />
      </G>
      <G label="المعلومات الفنية"><input className="fc" {...register('note_ord')} style={{ textAlign: 'right' }} /></G>
      <G label="برنيش"><CheckItem label="برنيش" checked={!!checks.varn} onChange={chk('varn')} /></G>
      <G label="CTB"><CheckItem label="CTB" checked={!!checks.CTB} onChange={chk('CTB')} /></G>
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
            <input className="fc" {...register('clr_Qnt_order')} style={{ fontSize: 12, textAlign: 'right' }} />
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
            {CHK_MFG.map(label => (
              <label 
                key={label}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: mfgChecks[label] ? 'rgba(52,152,219,0.1)' : 'transparent',
                  border: `1px solid ${mfgChecks[label] ? '#3498db' : 'var(--border)'}`,
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={!!mfgChecks[label]}
                  onChange={(e) => {
                    setMfgChecks(prev => ({ ...prev, [label]: e.target.checked }));
                  }}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
              </label>
            ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <input className="fc" type="number" defaultValue={23} style={{ fontSize: 12, textAlign: 'right' }} />
                <span style={{ color: 'var(--muted)', fontWeight: 700 }}>×</span>
                <input className="fc" type="number" defaultValue={25} style={{ fontSize: 12, textAlign: 'right' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
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
            {CHK_CUST.map((label) => (
              <label 
                key={label}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 8,
                  cursor: 'pointer',
                  padding: '6px 8px',
                  borderRadius: 6,
                  background: custChecks[label] ? 'rgba(46,204,113,0.1)' : 'transparent',
                  border: `1px solid ${custChecks[label] ? '#27ae60' : 'var(--border)'}`,
                  transition: 'all 0.2s'
                }}
              >
                <input
                  type="checkbox"
                  checked={!!custChecks[label]}
                  onChange={(e) => {
                    setCustChecks(prev => ({ ...prev, [label]: e.target.checked }));
                  }}
                  style={{ width: 16, height: 16, cursor: 'pointer' }}
                />
                <span style={{ fontSize: 12, fontWeight: 500 }}>{label}</span>
              </label>
            ))}
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
      <G label="الكمية المسلمة"><input className="fc" type="number" {...register('Qunt_Ac')} style={{ textAlign: 'right' }} /></G>
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
    <span style={{ fontSize: 12, color: 'var(--muted)' }}>سنة العمل: <strong>{currentYear}</strong></span>
    <div style={{ display: 'flex', gap: 10 }}>
      <Btn variant="outline" type="button" onClick={() => navigate('/orders')}>إلغاء</Btn>
      <Btn variant="outline" type="button" onClick={printProductionCard}>🖨️ طباعة بطاقة الإنتاج</Btn>
      <Btn variant="primary" type="submit" disabled={isSaving}>
        {isSaving ? '⏳ جاري الحفظ...' : '✅ حفظ وتأكيد'}
      </Btn>
    </div>
  </div> 

</form>

<VoucherModal 
  open={voucherOpen} 
  onClose={() => setVoucherOpen(false)} 
  orderId={id || ''} 
  orderYear={year || currentYear} 
/>
</div>
);
}
