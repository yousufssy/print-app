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
  const handlePrint = () => {
    const formData = getValues();
    
    const customer = formData.Customer || '....................';
    const pattern = formData.Pattern || '....................';
    const pattern2 = formData.Pattern2 || '';
    const demand = formData.Demand || '...';
    const orderNum = formData.ID || '....................';
    const ser = formData.Ser || '...';
    const dateCome = formData.date_come || '..../..../......';
    const deliveryDate = formData.Apoent_Delv_date || '..../..../......';
    const notes = formData.note_ord || formData.Free_text || '';
    const codeMed = formData.Code_M || '....................';
    
    // الأبعاد
    const finalLength = formData.final_size_tall || formData.LongU || '...';
    const finalWidth = formData.final_size_width || formData.WedthU || '...';
    const finalHeight = formData.HightU || '...';
    
    // الطباعة
    const printMachine = formData.Machin_Print || '....................';
    const cutMachine = formData.Machin_Cut || '....................';
    const colorsCount = formData.clr_Qnt_order || formData.Clr_qunt || '...';
    const platesCount = formData.sheet_unit_qunt || '...';
    const printOn = formData.print_on || '...';
    const printOn2 = formData.print_on2 || '...';
    const totalQty = formData.grnd_qunt || '...';
    
    // الخيارات
    const varnish = checks.varnich || checks.varn ? '✓' : '☐';
    const folding = custChecks['مع تطوية'] ? '✓' : '☐';
    const fullGloss = mfgChecks['تلميع كامل'] ? '✓' : '☐';
    const spotGloss = mfgChecks['تلميع بقعي'] ? '✓' : '☐';
    const seluvanLum = mfgChecks['سلفان لميع'] ? '✓' : '☐';
    const seluvanMat = mfgChecks['سلفان مات'] ? '✓' : '☐';
    const harary = custChecks['حراري'] ? '✓' : '☐';
    const bals = custChecks['بص'] ? '✓' : '☐';
    
    // المواد من الجدول
    const materialsHtml = materialsRows.slice(0, 4).map((row: any) => `
      <div class="grid-item data-row">${row.type || ''}</div>
      <div class="grid-item data-row">${row.source || ''}</div>
      <div class="grid-item data-row">${row.supplier || ''}</div>
      <div class="grid-item data-row">${row.length || ''}×${row.width || ''}</div>
      <div class="grid-item data-row">${row.gram || ''}</div>
      <div class="grid-item data-row">${row.at_plates || ''}</div>
      <div class="grid-item data-row">${row.output || ''}</div>
    `).join('') || '<div class="grid-item data-row" colspan="7" style="text-align:center;color:#666">لا توجد مواد مضافة</div>';

    const printContent = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<title>بطاقة إنتاج - طلب رقم: ${orderNum}</title>
<style>
body { font-family: 'Arial', 'Cairo', sans-serif; margin: 0; padding: 0; background-color: #fff; direction: rtl; }
@media print {
  body { padding: 0; }
  .no-print { display: none !important; }
  .page { border: none !important; box-shadow: none !important; margin: 0; }
}
.page { width: 850px; margin: 20px auto; padding: 20px; box-sizing: border-box; border: 1px solid #000; background: #fff; }
.header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.top-id { display: flex; align-items: center; width: 200px; font-size: 18px; }
.logo-box { text-align: center; width: 200px; }
.logo-tpp { font-size: 40px; font-weight: bold; line-height: 0.8; margin: 0; font-family: 'Times New Roman', serif; }
.logo-sub { font-size: 12px; font-weight: bold; border-top: 2px solid #000; margin-top: 4px; display: inline-block; }
.main-title { font-size: 32px; font-weight: bold; margin-top: 10px; }
.content-layout { display: flex; justify-content: space-between; margin-bottom: 10px; }
.column { width: 48%; }
.field { display: flex; align-items: baseline; margin-bottom: 12px; }
.label { font-size: 19px; white-space: nowrap; font-weight: bold; }
.dots { flex-grow: 1; border-bottom: 1px dotted #000; margin-left: 8px; min-height: 18px; }
.gray-box { background: #ccc; height: 25px; width: 160px; margin-left: 10px; border: 1px solid #999; }
.extra-lines { margin-top: 10px; }
.line { border-bottom: 1px dotted #000; height: 25px; width: 100%; }
.footer-right { margin-top: 20px; text-align: right; font-size: 16px; font-weight: bold; }
.warehouse-container { width: 100%; max-width: 1200px; margin: 30px auto; }
.wrapper { display: flex; gap: 10px; align-items: flex-start; width: 100%; }
.side-table { width: 200px; border: 1.5px solid #000; display: flex; flex-direction: column; }
.side-cell { border: 0.5px solid #000; padding: 10px; text-align: center; min-height: 40px; display: flex; flex-direction: column; justify-content: center; font-weight: bold; font-size: 13px; }
.side-cell span { font-weight: normal; margin-top: 3px; font-size: 12px; }
.main-container { flex-grow: 1; border: 1.5px solid #000; }
.grid-table { display: grid; grid-template-columns: 60px 120px 120px 1fr 100px 80px 80px; width: 100%; }
.grid-item { border: 0.5px solid #000; padding: 8px; text-align: center; font-size: 13px; display: flex; align-items: center; justify-content: center; min-height: 35px; }
.grid-item.header { background-color: #f0f0f0; font-weight: bold; }
.grid-item.data-row { min-height: 45px; }
.bottom-section { display: grid; grid-template-columns: 60px 240px 1fr; width: 100%; }
.col-tabaq { display: flex; flex-direction: column; }
.empty-cell { height: 40px; border: 0.5px solid #000; }
.gray-cell { height: 40px; border: 0.5px solid #000; background-color: #ccc; }
.col-details { display: flex; flex-direction: column; }
.label-cell { height: 40px; border: 0.5px solid #000; display: flex; align-items: center; padding-right: 10px; font-weight: bold; font-size: 13px; }
.label-cell.header { background: #f0f0f0; }
.col-approval { border: 0.5px solid #000; display: flex; flex-direction: column; }
.approval-head { padding: 5px; text-align: center; border-bottom: 0.5px solid #000; font-weight: bold; font-size: 12px; }
.checks { display: flex; justify-content: space-around; align-items: center; flex-grow: 1; font-size: 11px; flex-wrap: wrap; gap: 3px; }
.footer { border-top: 1.5px solid #000; padding: 10px; }
.check-box { width: 14px; height: 14px; border: 1px solid #000; display: inline-flex; align-items: center; justify-content: center; margin-left: 5px; font-size: 10px; }
.reason-line { border-bottom: 1px dotted #000; flex-grow: 1; margin-right: 5px; }
.container { width: 100%; max-width: 900px; margin: 30px auto 0 auto; border: 1.5px solid #000; padding: 15px; }
.header-split { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; margin-bottom: 10px; }
.header-item { text-align: center; font-weight: bold; font-size: 16px; }
.date-space { border-bottom: 1px solid #000; padding: 0 20px; margin: 0 2px; display: inline-block; min-width: 30px; }
.year-input { border-bottom: 1px solid #000; padding: 0 10px; margin-left: 2px; display: inline-block; min-width: 20px; }
.main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 25px; }
.sketch-box { border: 1px solid #000; height: 130px; background-image: linear-gradient(to right, #e0e0e0 1px, transparent 1px), linear-gradient(to bottom, #e0e0e0 1px, transparent 1px); background-size: 15px 15px; }
.top-columns, .top-columns-left { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
.option-item { display: flex; align-items: center; margin-bottom: 6px; font-size: 13px; }
.checkbox { width: 13px; height: 13px; border: 1px solid #000; margin-left: 8px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; }
.info-line { font-size: 13px; margin-bottom: 8px; }
.line-fill { border-bottom: 1px dotted #000; display: inline-block; width: 70%; height: 15px; }
.dimensions-container { display: flex; align-items: center; margin-top: 15px; width: 100%; }
.dimensions-label { font-weight: bold; font-size: 14px; margin-left: 10px; white-space: nowrap; }
.independent-dimensions-table { flex-grow: 1; border-collapse: collapse; }
.independent-dimensions-table td { border: 1px solid #000; text-align: center; padding: 6px; font-size: 13px; }
.notes-wrapper { display: flex; flex-direction: column; align-items: center; width: 100%; }
.note-line { border-bottom: 1px dotted #000; height: 22px; width: 100%; }
.approval-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
.approval-table td { border: 1px solid #000; height: 30px; text-align: center; font-size: 12px; }
.bg-gray { background-color: #f0f0f0; font-weight: bold; width: 120px; }
.print-btn { position: fixed; bottom: 20px; left: 20px; padding: 10px 20px; background: #2980b9; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-family: inherit; font-size: 14px; z-index: 1000; }
.print-btn:hover { background: #1f618d; }
</style>
</head>
<body>
<div class="page">
  <!-- Section 1: بطاقة الإنتاج -->
  <div class="header">
    <div class="top-id"><span>رقمنا :</span><span class="dots"></span><span style="margin-right:5px;font-weight:bold">${ser}</span></div>
    <div class="main-title">بطاقة إنتاج</div>
    <div class="logo-box">
      <div class="logo-tpp">TPP</div>
      <div class="logo-sub">TARABICHI</div>
    </div>
  </div>
  <div class="content-layout">
    <div class="column">
      <div class="field"><span class="label">الاسم :</span><span class="dots"></span><span style="margin-right:5px">${customer}</span></div>
      <div class="field"><span class="label">النموذج :</span><span class="dots"></span><span style="margin-right:5px">${pattern} ${pattern2}</span></div>
      <div class="field"><span class="label">العدد المطلوب :</span><span class="dots"></span><span style="margin-right:5px">${demand}</span></div>
      <div class="field"><span class="label">ملاحظات :</span><span class="dots"></span><span style="margin-right:5px">${notes?.substring(0,30) || ''}</span></div>
    </div>
    <div class="column">
      <div class="field"><span class="label">رقم الطلب :</span><span class="dots"></span><span style="margin-right:5px">${orderNum}</span></div>
      <div class="field"><span class="label">تاريخ الورود :</span><span class="dots"></span><span style="margin-right:5px">${dateCome}</span></div>
      <div class="field"><span class="label">موعد التسليم :</span><div class="gray-box" style="display:flex;align-items:center;padding-right:10px;font-size:14px">${deliveryDate}</div></div>
      <div class="field"><span class="label">أرسلت للفرز :</span><span class="dots"></span></div>
    </div>
  </div>
  <div class="extra-lines"><div class="line"></div><div class="line"></div></div>
  <div class="footer-right">كود النموذج الطبي : <span style="border-bottom:1px dotted #000;padding:0 10px">${codeMed}</span></div>

  <!-- Section 2: المستودع/الأخراج -->
  <div class="warehouse-container">
    <div class="wrapper">
      <div class="main-container">
        <div class="grid-table">
          <div class="grid-item header">طبق</div>
          <div class="grid-item header">النوع</div>
          <div class="grid-item header">بلد المصدر</div>
          <div class="grid-item header">المورد</div>
          <div class="grid-item header">القياس</div>
          <div class="grid-item header">غراماج</div>
          <div class="grid-item header">الوزن</div>
          ${materialsHtml}
        </div>
        <div class="bottom-section">
          <div class="col-tabaq">
            <div class="empty-cell"></div>
            <div class="gray-cell"></div>
          </div>
          <div class="col-details">
            <div class="label-cell">اخراج زيادة طبع</div>
            <div class="label-cell header">المجموع المستهلك في الطبعة</div>
          </div>
          <div class="col-approval">
            <div class="approval-head">موافقة المدير الفني على :</div>
            <div class="checks">
              <span><div class="check-box">${checks.varnich ? '✓' : ''}</div> القساوة</span>
              <span><div class="check-box"></div> قياس الطبع</span>
              <span><div class="check-box"></div> صلاحية الكرتون</span>
            </div>
          </div>
        </div>
        <div class="footer">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; flex-wrap: wrap; gap: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 5px 15px;">
              <div><div class="check-box"></div> تلف</div>
              <div><div class="check-box"></div> خطأ</div>
              <div><div class="check-box"></div> زيادة كمية الطبع</div>
              <div><div class="check-box"></div> تم معالجة الفروقات</div>
            </div>
            <div style="flex-grow: 1; display: flex; align-items: baseline; margin-right: 20px; min-width: 200px;">
              <b style="white-space:nowrap">تعليل السبب:</b>
              <div class="reason-line"></div>
            </div>
          </div>
          <div style="text-align: left; font-weight: bold; font-size: 14px;">
            توقيع أمين المستودع: <span style="border-bottom:1px solid #000;display:inline-block;width:150px"></span>
          </div>
        </div>
      </div>
      <div class="side-table">
        <div class="side-cell" style="height: 100px; font-size: 12px;">
          الحجم النهائي
          <div style="display:flex;justify-content:center;gap:5px;margin-top:5px;font-size:14px">
            <span>${finalLength}</span><span>×</span><span>${finalWidth}</span><span>×</span><span>${finalHeight}</span>
          </div>
        </div>
        <div class="side-cell" style="height: 100px; font-size: 12px;">
          الطبع
          <div style="text-align:right;padding-right:15px;margin-top:3px;font-size:12px">على: ${printOn}</div>
          <div style="text-align:right;padding-right:15px;font-size:12px">على: ${printOn2}</div>
        </div>
        <div class="side-cell">يفصل الطبق:<br><span style="font-size:12px;font-weight:normal;margin-top:3px">${platesCount}</span></div>
        <div class="side-cell">إجمالي العدد:<br><span style="font-size:12px;font-weight:normal;margin-top:3px;color:#27ae60">${totalQty}</span></div>
        <div class="side-cell">عدد الألوان:<br><span style="font-size:12px;font-weight:normal;margin-top:3px">${colorsCount}</span></div>
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
            <div class="info-line">آلة الطبع: <span class="line-fill" style="width:60%"></span><span style="margin-right:5px;font-size:12px">${printMachine}</span></div>
            <div class="info-line">آلة التقطيع: <span class="line-fill" style="width:60%"></span><span style="margin-right:5px;font-size:12px">${cutMachine}</span></div>
            <div class="info-line">رقم القالب: <span class="line-fill" style="width:60%"></span><span style="margin-right:5px;font-size:12px">${formData.Cut_num || ''}</span></div>
          </div>
          <div>
            <div class="option-item"><div class="checkbox">${varnish}</div> برنيـــش</div>
            <div class="option-item"><div class="checkbox">${folding}</div> مع تطويــة</div>
            <div class="option-item"><div class="checkbox">${fullGloss}</div> تلميع كامل</div>
            <div class="option-item"><div class="checkbox">${spotGloss}</div> تلميع بقعي</div>
          </div>
        </div>
        <div class="dimensions-container">
          <div class="dimensions-label">الأبعاد:</div>
          <table class="independent-dimensions-table">
            <tr><td style="width: 33%;">الطول</td><td style="width: 33%;">العرض</td><td style="width: 34%;">الإرتفاع</td></tr>
            <tr style="height: 25px;"><td>${finalLength}</td><td>${finalWidth}</td><td>${finalHeight}</td></tr>
          </table>
        </div>
      </div>
      <div>
        <div class="sketch-box"></div>
        <div class="top-columns-left">
          <div>
            <div class="option-item"><div class="checkbox">${seluvanLum}</div> سلفان لميع</div>
            <div class="option-item"><div class="checkbox">${seluvanMat}</div> سلفان مت</div>
            <div class="option-item"><div class="checkbox">${harary}</div> حــــراري</div>
            <div class="option-item"><div class="checkbox">${bals}</div> بـــلص</div>
          </div>
          <div class="notes-wrapper">
            <div style="font-weight: bold; margin-bottom: 5px; text-align: center;">ملاحظات:</div>
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
        <td class="bg-gray">المدير الفني</td>
        <td></td><td></td><td></td><td></td>
      </tr>
      <tr>
        <td class="bg-gray">مراقبة الجودة</td>
        <td></td><td></td><td></td><td></td>
      </tr>
    </table>
  </div>
</div>

<button class="no-print print-btn" onclick="window.print()">🖨️ طباعة الآن</button>
<button class="no-print print-btn" onclick="window.close()" style="left:160px;background:#c0392b">✕ إغلاق</button>

<script>
  window.onload = function() {
    // يمكن تفعيل الطباعة التلقائية إذا رغبت:
    // window.print();
  }
</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=950,height=1400,scrollbars=yes');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
    } else {
      alert('⚠️ يرجى السماح بالنوافذ المنبثقة في المتصفح لتمكين الطباعة');
    }
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
          onClick={handlePrint}
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
            <Btn variant="outline" type="button" onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
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
