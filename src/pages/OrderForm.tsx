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
    localStorage.setItem('orderFormSections', JSON.parse(JSON.stringify(openSections)));
  }, [openSections]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<Order>();
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
      ['varnich','uv','uv_Spot','seluvan_lum','seluvan_mat','Tad3em','Tay','harary','rolling','CTB','varn','Printed','Billed','Reseved'].forEach(f => {
        c[f] = (existing as any)[f] === 'True' || (existing as any)[f] === '1';
      });
      setChecks(c);

      const custC: Record<string, boolean> = {};
      const custLabels = ['مع طبخة','مع تطوية','تدعيم زكزاك','حراري','بص','تلميع بقعي'];
      const custFields = ['cust_with_baking', 'cust_with_folding', 'cust_tad3em_zkzk', 'cust_harary', 'cust_bp', 'cust_tlm3_bq3y'];
      custLabels.forEach((label, i) => {
        custC[label] = (existing as any)[custFields[i]] === 'True' || (existing as any)[custFields[i]] === '1';
      });
      setCustChecks(custC);
    } else {
      reset({ Year: String(new Date().getFullYear()) });
    }
  }, [existing, reset]);

  useEffect(() => {
    if (!isEdit && orders.length >= 0) {
      const latestOrder = orders.sort((a: any, b: any) => b.row_id - a.row_id)[0];
      const lastSer = latestOrder ? parseInt(latestOrder.Ser || '0') || 0 : 0;
      setValue('Ser', String(lastSer + 1));
    }
  }, [isEdit, orders, setValue]);

  const onSubmit = async (data: Order) => {
    ['varnich','uv','uv_Spot','seluvan_lum','seluvan_mat','Tad3em','Tay','harary','rolling','CTB','varn','Printed','Billed','Reseved'].forEach(f => {
      (data as any)[f] = checks[f] ? 'True' : 'False';
    });

    const custLabels = ['مع طبخة','مع تطوية','تدعيم زكزاك','حراري','بص','تلميع بقعي'];
    const custFields = ['cust_with_baking', 'cust_with_folding', 'cust_tad3em_zkzk', 'cust_harary', 'cust_bp', 'cust_tlm3_bq3y'];
    custFields.forEach((field, i) => {
      (data as any)[field] = custChecks[custLabels[i]] ? 'true' : 'false';
    });

    (data as any).DubelM = checks.CTB ? 'true' : 'false';
    // (data as any).Varnish = checks.varn ? '1' : '0';
    (data as any).tabkha = '0'; 
    (data as any).bals = '0';


    if (!isEdit) {
      const maxRowId = orders.length > 0 ? Math.max(...orders.map((o: any) => o.row_id)) + 1 : 1;
      (data as any).row_id = maxRowId;
    }

    if (isEdit) {
      await updateOrder.mutateAsync(data);
    } else {
      await createOrder.mutateAsync(data);
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

      {/* 🔘 أزرار التحكم السريع بالأقسام (اختياري) */}
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
            {customers.map(c => <option key={(c as any)._row_id} value={c.Customer} />)}
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
            <G label="CTB"><CheckItem
              label="CTB"
              checked={!!watch('DubelM')}
              onChange={(val) => setValue('DubelM', val)}
            /></G>
          
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
                  <tr key={(v as any)._row_id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fdf8f0' }}>
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
                        onClick={() => confirm('حذف الإيصال؟') && deleteVoucher.mutate((v as any)._row_id)}
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
