import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useOrder, useCreateOrder, useUpdateOrder, useCustomers, useVouchers, useCreateVoucher, useDeleteVoucher, useOrders } from '../hooks/useApi';
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
function InlineTable({ cols, rows, onRowsChange }: {
  cols: { key: string; label: string; type?: string; width?: number }[];
  rows: Record<string, string>[];
  onRowsChange: (rows: Record<string, string>[]) => void;
}) {
  const addRow = () => onRowsChange([...rows, Object.fromEntries(cols.map(c => [c.key, '']))]);
  const delRow = (i: number) => onRowsChange(rows.filter((_, idx) => idx !== i));
  const setCell = (i: number, k: string, v: string) => {
    onRowsChange(rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));
  };

  return (
    <div style={{ overflowX: 'auto', marginTop: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ background: 'var(--steel)', color: '#fff' }}>
            {cols.map(c => (
              <th key={c.key} style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap', width: c.width }}>
                {c.label}
              </th>
            ))}
            <th style={{ padding: '8px 10px', width: 36 }}></th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length + 1} style={{ textAlign: 'center', color: 'var(--muted)', padding: 16 }}>
                ✦ لا توجد سجلات — اضغط ➕ لإضافة سطر
              </td>
            </tr>
          )}
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fdf8f0' }}>
              {cols.map(c => (
                <td key={c.key} style={{ padding: '3px 5px' }}>
                  <input
                    value={row[c.key] ?? ''}
                    type={c.type ?? 'text'}
                    onChange={e => setCell(i, c.key, e.target.value)}
                    style={{ width: '100%', border: 'none', background: 'transparent', fontFamily: 'Cairo, sans-serif', fontSize: 12, outline: 'none', padding: '4px 3px', color: 'var(--ink)', textAlign: 'right' }}
                    onFocus={e => (e.target.style.background = '#fff9f0')}
                    onBlur={e => (e.target.style.background = 'transparent')}
                  />
                </td>
              ))}
              <td style={{ padding: '3px 6px', textAlign: 'center' }}>
                <button type="button" onClick={() => delRow(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', fontSize: 14 }}>🗑</button>
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan={cols.length + 1} style={{ padding: '8px 10px' }}>
              <button type="button" onClick={addRow}
                style={{ background: 'none', border: '1.5px dashed var(--border)', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', color: 'var(--muted)', fontFamily: 'Cairo, sans-serif', fontSize: 12, width: '100%' }}>
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
  const F = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, [k]: e.target.value }));
  
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
  { key: 'type',      label: 'النوع' },
  { key: 'source',    label: 'المصدر' },
  { key: 'supplier',  label: 'المورد' },
  { key: 'length',    label: 'الطول',        type: 'number' },
  { key: 'width',     label: 'العرض',        type: 'number' },
  { key: 'gram',      label: 'غرام',         type: 'number' },
  { key: 'at_plates', label: 'عند الأطباق',  type: 'number' },
  { key: 'last_date', label: 'تاريخ الآخر',  type: 'date' },
  { key: 'output',    label: 'منكوه الإخراج' },
  { key: 'notes',     label: 'ملاحظات' },
];

const PROBLEMS_COLS = [
  { key: 'print_num',   label: 'رقم الطبع' },
  { key: 'prod_date',   label: 'تاريخ الإنتاج',  type: 'date' },
  { key: 'exp_date',    label: 'تاريخ الانتهاء', type: 'date' },
  { key: 'print_count', label: 'عدد الطبع',       type: 'number' },
];

const OPERATIONS_COLS = [
  { key: 'opreation', label: 'العملية' },
  { key: 'machine', label: 'الآلة' },
  { key: 'num',   label: 'العدد',        type: 'number' },
  { key: 'info',    label: 'معلومات فنية' },
  { key: 'kaw',     label: 'كع',          type: 'number' },
  { key: 'tall',    label: 'ط',           type: 'number' },
  { key: 'sa',      label: 'سا',          type: 'number' },
  { key: 'date',    label: 'التاريخ',     type: 'date' },
  { key: 'notes',   label: 'ملاحظات' },
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

  const [materialsRows,  setMaterialsRows]  = useState<Record<string, string>[]>([]);
  const [problemsRows,   setProblemsRows]   = useState<Record<string, string>[]>([]);
  const [operationsRows, setOperationsRows] = useState<Record<string, string>[]>([]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    basic: true,
    specs: true,
    printing: true,
    quality: true,
    delivery: true
  });

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

  // ✅ إضافة getValues هنا
  const { register, handleSubmit, reset, watch, setValue, getValues } = useForm<Order>();
  const watchYear = watch('Year') || String(new Date().getFullYear());
  const watchId   = watch('ID') || '';

  const { data: ordersResponse } = useOrders({ year: watchYear });
  const orders = ordersResponse?.data || [];

  const { data: vouchers = [] } = useVouchers(isEdit ? watchId : '', watchYear);
  const deleteVoucher = useDeleteVoucher();

  useEffect(() => {
    if (existing) {
      reset(existing);
      const c: Record<string, boolean> = {};
      BOOL_FIELDS.forEach(f => {
        c[f] = fromBit((existing as any)[f]);
      });
      c['CTB']  = fromBit((existing as any)['DubelM']);
      c['varn'] = fromBit((existing as any)['varnich']);
      setChecks(c);

      const custC: Record<string, boolean> = {};
      CUST_LABELS.forEach((label, i) => {
        custC[label] = fromBit((existing as any)[CUST_FIELDS[i]]);
      });
      setCustChecks(custC);
    } else {
      reset({ Year: String(new Date().getFullYear()) });
    }
  }, [existing, reset]);

  useEffect(() => {
    if (!isEdit && orders.length >= 0) {
      const latestOrder = orders.sort((a: any, b: any) => b.ID - a.ID)[0];
      const lastSer = latestOrder ? parseInt(latestOrder.Ser || '0') || 0 : 0;
      setValue('Ser', String(lastSer + 1));
    }
  }, [isEdit, orders, setValue]);

  const onSubmit = async (data: Order) => {
    BOOL_FIELDS.forEach(f => {
      (data as any)[f] = toBit(checks[f]);
    });
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
      await createOrder.mutateAsync(data);
    }
    navigate('/orders');
  };

  // 🖨️ دالة الطباعة باستخدام القالب من الملف المرفق
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

  const isSaving = createOrder.isPending || updateOrder.isPending;

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
        
        {/* 🖨️ زر الطباعة الجديد */}
        <button 
          type="button"
          onClick={printProductionCard}
          style={{ 
            background: 'var(--primary, #2980b9)', 
            color: '#fff',
            border: 'none', 
            borderRadius: 6, 
            padding: '6px 14px', 
            fontSize: 12, 
            cursor: 'pointer',
            fontFamily: 'Cairo, sans-serif',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            transition: 'background 0.2s'
          }}
          onMouseOver={(e) => e.currentTarget.style.background = 'var(--primary-dark, #1f618d)'}
          onMouseOut={(e) => e.currentTarget.style.background = 'var(--primary, #2980b9)'}
        >
          🖨️ طباعة البطاقة
        </button>
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
            {customers.map(c => <option key={(c as any)._ID} value={c.Customer} />)}
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
          <InlineTable cols={MATERIALS_COLS} rows={materialsRows} onRowsChange={setMaterialsRows} />
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
            <G label="CTB"><CheckItem label="CTB" checked={!!checks.CTB} onChange={chk('CTB')} /></G>
          </div>

          <SectionDiv label="العمليات" />
          <InlineTable cols={OPERATIONS_COLS} rows={operationsRows} onRowsChange={setOperationsRows} />
        </AccordionCard>

        {/* ══ 4. مراقبة الجودة والمشاكل ══ */}
        <AccordionCard 
          title="🔍 مراقبة الجودة والمشاكل"
          isOpen={openSections.quality}
          onToggle={() => toggleSection('quality')}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
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
          <InlineTable cols={PROBLEMS_COLS} rows={problemsRows} onRowsChange={setProblemsRows} />
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
                  <tr key={(v as any)._ID} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fdf8f0' }}>
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
                        onClick={() => confirm('حذف الإيصال؟') && deleteVoucher.mutate((v as any)._ID)}
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
            <Btn variant="outline" type="button" onClick={printProductionCard} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              🖨️ طباعة
            </Btn>
            <Btn variant="outline" type="button" onClick={() => navigate('/orders')}>إلغاء</Btn>
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
