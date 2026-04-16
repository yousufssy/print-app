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
    const updated = localRows.map((r) => (r.ID === ID ? row : r));
    await onRowsChange(updated);
  }
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
    (f) => createOperation.mutateAsync({ ...f, ID: id!, Year: year! }),
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
  await updateOrder.mutateAsync(data);
} else {
  const created = await createOrder.mutateAsync(data);
  const newId = String((created as any)?.ID ?? (data as any).ID);
  const yr = String((data as any).Year ?? currentYear);

  await Promise.all([
    ...pendingMaterials.map(({ ID, _isNew, ...f }) =>
      createCarton.mutateAsync({ ...f, ID: newId, year: yr }).catch(err => {
        console.error('❌ Create carton error:', err);
        return null;
      })),
    ...pendingProblems.map(({ ID, _isNew, ...f }) =>
      createProblem.mutateAsync({ ...f, ID: newId, Year: yr }).catch(err => {
        console.error('❌ Create problem error:', err);
        return null;
      })),
    ...pendingOps.map(({ ID, _isNew, ...f }) =>
      createOperation.mutateAsync({ ...f, ID: newId, Year: yr }).catch(err => {
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
const d = formDataRef.current;
  const chkd = (val: any) => (val ? '✔' : '');
  const fmt = (v: any) => v ?? '';

  const html = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<style>
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
body {
  font-family: 'Arial', sans-serif;
  background: #fff;
  direction: rtl;
  margin: 0;
  padding: 0;
}
.page {
  width: 210mm;
  min-height: 297mm;
  margin: 0 auto;
  padding: 10mm 8mm;
  background: #fff;
  border: 1px solid #000;
  box-sizing: border-box;
  position: relative;
}
@media print {
  body { margin: 0; }
  .page {
    border: none;
    padding: 10mm 8mm;
  }
}

/* ----- Header ----- */
.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 10px;
}
.logo {
  text-align: center;
  width: 140px;
}
.logo-tpp {
  font-size: 32px;
  font-weight: bold;
  font-family: 'Times New Roman', serif;
  line-height: 1;
}
.logo-sub {
  font-size: 11px;
  font-weight: bold;
  border-top: 2px solid #000;
  margin-top: 4px;
  padding-top: 2px;
}
.title-main {
  font-size: 24px;
  font-weight: bold;
  margin-right: 20px;
}
.order-info {
  width: 180px;
  font-size: 13px;
}
.info-row {
  display: flex;
  margin-bottom: 4px;
}
.info-label {
  width: 70px;
  white-space: nowrap;
}
.info-value {
  flex: 1;
  border-bottom: 1px dotted #000;
  margin-right: 5px;
  min-height: 18px;
}

/* ----- Two-column layout for top section ----- */
.top-section {
  display: flex;
  gap: 20px;
  margin-top: 5px;
  margin-bottom: 10px;
}
.col {
  flex: 1;
}
.field {
  display: flex;
  margin-bottom: 6px;
  font-size: 13px;
}
.field-label {
  width: 80px;
}
.field-dots {
  flex: 1;
  border-bottom: 1px dotted #000;
  margin-right: 5px;
}

/* ----- Material Table + Side Panel ----- */
.material-wrapper {
  display: flex;
  gap: 6px;
  margin: 12px 0;
  border: 1.5px solid #000;
}
.material-table-container {
  flex: 1;
  border-left: 1.5px solid #000;
}
.material-table {
  width: 100%;
  border-collapse: collapse;
  text-align: center;
}
.material-table th,
.material-table td {
  border: 0.5px solid #000;
  padding: 6px 2px;
  font-size: 11px;
}
.material-table th {
  background: #f0f0f0;
  font-weight: bold;
}
.side-panel {
  width: 150px;
  padding: 8px 6px;
  font-size: 11px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.panel-item {
  border-bottom: 1px dotted #000;
  padding-bottom: 5px;
}
.panel-title {
  font-weight: bold;
  margin-bottom: 3px;
}
.panel-value {
  font-weight: normal;
  margin-top: 2px;
}

/* ----- Approval Section ----- */
.approval-box {
  display: flex;
  border: 1.5px solid #000;
  margin: 8px 0;
  padding: 8px;
  justify-content: space-between;
  align-items: center;
}
.approval-checks {
  display: flex;
  gap: 20px;
}
.check-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.check-square {
  width: 12px;
  height: 12px;
  border: 1px solid #000;
  display: inline-block;
  text-align: center;
  font-size: 10px;
  line-height: 12px;
}

/* ----- Warehouse Out Section ----- */
.warehouse-row {
  display: flex;
  justify-content: space-between;
  margin: 8px 0;
  font-size: 12px;
  font-weight: bold;
}
.warehouse-table {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
  font-size: 11px;
}
.warehouse-table th,
.warehouse-table td {
  border: 1px solid #000;
  padding: 5px;
  text-align: center;
}
.warehouse-table th {
  background: #f0f0f0;
}

/* ----- Bottom Sketch & Notes ----- */
.bottom-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
  margin-top: 12px;
  border-top: 1.5px solid #000;
  padding-top: 10px;
}
.sketch-box {
  border: 1px solid #000;
  height: 80px;
  background: repeating-linear-gradient(45deg, #eee 0px, #eee 1px, transparent 1px, transparent 8px);
}
.machine-info {
  margin-top: 6px;
  font-size: 11px;
}
.note-box {
  border: 1px solid #000;
  padding: 6px;
  height: 120px;
}
.note-title {
  font-weight: bold;
  margin-bottom: 4px;
}

/* ----- Footer Approvals ----- */
.footer-signatures {
  display: flex;
  justify-content: space-between;
  margin-top: 15px;
  font-size: 12px;
  border-top: 1px solid #000;
  padding-top: 8px;
}

/* Utility */
.dots-line {
  border-bottom: 1px dotted #000;
  display: inline-block;
  min-width: 40px;
}
.fw-bold {
  font-weight: bold;
}
.text-left {
  text-align: left;
}
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="header">
    <div class="order-info">
      <div class="info-row"><span class="info-label">رقم الطلب:</span><span class="info-value">${fmt(d.marji3)}</span></div>
      <div class="info-row"><span class="info-label">الاسم:</span><span class="info-value">${fmt(d.Customer)}</span></div>
      <div class="info-row"><span class="info-label">التاريخ:</span><span class="info-value">${fmt(d.date_come)}</span></div>
      <div class="info-row"><span class="info-label">المودع:</span><span class="info-value"></span></div>
      <div class="info-row"><span class="info-label">تاريخ الموعد:</span><span class="info-value">${fmt(d.Apoent_Delv_date)}</span></div>
    </div>
    <div class="title-main">بطاقة إنتاج</div>
    <div class="logo">
      <div class="logo-tpp">TPP</div>
      <div class="logo-sub">TARABICHI</div>
    </div>
  </div>

  <!-- Second row: سند التصديق / أرسلت للفرز -->
  <div style="display: flex; gap: 30px; margin: 8px 0; font-size:13px;">
    <div style="display: flex;"><span style="width:80px;">سند التصديق:</span><span class="dots-line" style="width:120px;"></span></div>
    <div style="display: flex;"><span style="width:80px;">أرسلت للفرز:</span><span class="dots-line" style="width:120px;">${fmt(d.Perioud)}</span></div>
  </div>

  <!-- كود النموذج الطبي -->
  <div style="margin: 8px 0; font-size:13px; font-weight:bold;">
    كود النموذج الطبي: ${fmt(d.Code_M) || '....................'}
  </div>

  <!-- MATERIAL TABLE + SIDE PANEL -->
  <div class="material-wrapper">
    <div class="material-table-container">
      <table class="material-table">
        <thead>
          <tr><th>طبق</th><th>النوع</th><th>بلد المصدر</th><th>المورد</th><th>القياس</th><th>غراماج</th><th>الوزن</th></tr>
        </thead>
        <tbody>
          <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
          <tr><td></td><td></td><td></td><td></td><td></td><td></td><td></td></tr>
        </tbody>
      </table>
      <!-- المجموع المستهلك -->
      <div style="display: flex; border-top: 1px solid #000; padding: 5px; font-size:12px; font-weight:bold;">
        <span style="width:120px;">المجموع المستهلك في الطبعة:</span>
        <span style="flex:1; border-bottom:1px dotted #000;"></span>
      </div>
    </div>
    <div class="side-panel">
      <div class="panel-item">
        <div class="panel-title">الحجم النهائي</div>
        <div class="panel-value">${fmt(d.final_size_tall) || 'X'} × ${fmt(d.final_size_width) || 'X'}</div>
        <div class="panel-value">${fmt(d.final_size_tall2) || 'X'} × ${fmt(d.final_size_width2) || 'X'}</div>
      </div>
      <div class="panel-item">
        <div class="panel-title">الطبع</div>
        <div>على ${fmt(d.print_on) || '______'}</div>
        <div>على ${fmt(d.print_on2) || '______'}</div>
      </div>
      <div class="panel-item">يفصل الطبق: ${fmt(d.sheet_unit_qunt)}</div>
      <div class="panel-item">إجمالي العدد: ${fmt(d.grnd_qunt)}</div>
      <div class="panel-item">عدد الألوان: ${fmt(d.Clr_qunt)}</div>
    </div>
  </div>

  <!-- APPROVAL CHECKS -->
  <div class="approval-box">
    <div style="font-weight:bold;">موافقة المدير الفني على:</div>
    <div class="approval-checks">
      <div class="check-item"><span class="check-square">${chkd(mfgChecks['تلميع كامل'])}</span> القساوة</div>
      <div class="check-item"><span class="check-square">${chkd(mfgChecks['تلميع بقعي'])}</span> قياس الطبع</div>
      <div class="check-item"><span class="check-square"></span> صلاحية الكرتون</div>
    </div>
  </div>

  <!-- أسباب الإخراج -->
  <div style="display: flex; gap: 15px; margin: 10px 0; font-size:12px;">
    <div style="display: flex; gap: 10px;">
      <div class="check-item"><span class="check-square"></span> تلف</div>
      <div class="check-item"><span class="check-square"></span> خطأ</div>
      <div class="check-item"><span class="check-square"></span> زيادة كمية الطبع</div>
      <div class="check-item"><span class="check-square"></span> تم معالجة الفروقات</div>
    </div>
    <div style="flex:1; display: flex;">
      <span style="font-weight:bold; margin-left:8px;">تعليل سبب إخراج الأطباق زيادة:</span>
      <span style="flex:1; border-bottom:1px dotted #000;"></span>
    </div>
  </div>

  <!-- توقيع أمين المستودع -->
  <div style="text-align: left; margin: 5px 0 10px; font-size:13px; font-weight:bold;">
    توقيع أمين المستودع: .......................................
  </div>

  <!-- WAREHOUSE OUT SECTION (two rows) -->
  <div class="warehouse-row">
    <span>أخرج من المستودع &nbsp; / &nbsp; / &nbsp; ٢٠١</span>
    <span>رقم الصـــــادر: ___________</span>
    <span>التوقيـــــع: ___________</span>
    <span>عدد الطبع على ${fmt(d.Qunt_of_print_on) || ''}</span>
  </div>
  <div class="warehouse-row">
    <span>أخرج من المستودع &nbsp; / &nbsp; / &nbsp; ٢٠١</span>
    <span>رقم الصـــــادر: ___________</span>
    <span>التوقيـــــع: ___________</span>
    <span>عدد الطبع على ${fmt(d.Qunt_of_print_on2) || ''}</span>
  </div>

  <!-- NOTES TABLE -->
  <table class="warehouse-table">
    <thead>
      <tr><th></th><th>العـدد</th><th>الجهة المنفـــــذة</th><th>ملاحظـــــات</th></tr>
    </thead>
    <tbody>
      <tr><td>بلاكـــــــات</td><td></td><td></td><td></td></tr>
      <tr><td>بلاكات إضافية</td><td></td><td></td><td></td></tr>
    </tbody>
  </table>
  <div style="text-align: left; font-size:12px; margin: 4px 0;">منها نموذج طبي على ${fmt(d.Med_Sampel) || ''}</div>

  <!-- BOTTOM: SKETCH & NOTES -->
  <div class="bottom-grid">
    <div>
      <div class="sketch-box"></div>
      <div class="machine-info">
        <div>آلة الطبع: ${fmt(d.Machin_Print)}</div>
        <div>آلة التقطيع: ${fmt(d.Machin_Cut)}</div>
        <div>رقم القالب: ${fmt(d.MontagNum)}</div>
      </div>
      <div style="margin-top: 8px; display: flex; gap: 10px;">
        <div class="check-item"><span class="check-square">${chkd(mfgChecks['برنيش'])}</span> برنيش</div>
        <div class="check-item"><span class="check-square">${chkd(custChecks['مع تطوية'])}</span> مع تطوية</div>
        <div class="check-item"><span class="check-square">${chkd(mfgChecks['تلميع كامل'])}</span> تلميع كامل</div>
        <div class="check-item"><span class="check-square">${chkd(mfgChecks['تلميع بقعي'])}</span> تلميع بقعي</div>
      </div>
      <div style="margin-top: 8px;">
        <span style="font-weight:bold;">الأبعاد:</span> الطول ${fmt(d.LongU)} | العرض ${fmt(d.WedthU)} | الإرتفاع ${fmt(d.HightU)}
      </div>
    </div>
    <div>
      <div class="sketch-box"></div>
      <div style="margin-top: 8px; display: flex; gap: 10px;">
        <div class="check-item"><span class="check-square">${chkd(mfgChecks['سلفان لميع'])}</span> سلفان لميع</div>
        <div class="check-item"><span class="check-square">${chkd(mfgChecks['سلفان مات'])}</span> سلفان مت</div>
        <div class="check-item"><span class="check-square">${chkd(custChecks['حراري'])}</span> حراري</div>
        <div class="check-item"><span class="check-square">${chkd(custChecks['بلص'])}</span> بلص</div>
      </div>
      <div class="note-box">
        <div class="note-title">ملاحظات:</div>
        <div style="border-bottom:1px dotted #000; margin:6px 0;">&nbsp;</div>
        <div style="border-bottom:1px dotted #000; margin:6px 0;">&nbsp;</div>
        <div style="border-bottom:1px dotted #000; margin:6px 0;">&nbsp;</div>
        <div style="border-bottom:1px dotted #000; margin:6px 0;">&nbsp;</div>
      </div>
    </div>
  </div>

  <!-- FOOTER APPROVALS -->
  <div class="footer-signatures">
    <span>موافقة الإدارة: _________________</span>
    <span>تاريخ القطع: ____ / ____ / ٢٠____</span>
  </div>
  <div style="margin-top: 8px; text-align: center; font-size: 12px;">
    التفصيل للمقطع
  </div>

</div>
<script>window.addEventListener('load', () => { window.focus(); window.print(); });</script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const printWindow = window.open(url, '_blank');
  if (printWindow) {
    printWindow.focus();
  } else {
    // Fallback if popup blocked
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}, [ checks, custChecks, mfgChecks]);

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
