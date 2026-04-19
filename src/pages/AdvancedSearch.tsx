// 📁 pages/AdvancedSearchPage.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { advancedSearchApi } from '../api/searchService';
import { customersApi } from '../api/services';
import type { 
  AdvancedSearchFilters, 
  AdvancedSearchResult, 
  SavedSearch,
  Customer 
} from '../types/search';
import { Btn, FormGroup, SectionDiv, Card } from '../components/ui';

const SEARCH_PATH = '/search';
const DEFAULT_YEAR = '2025';

export function FilterCard({ 
  title, 
  children, 
  defaultOpen = true,
  badge 
}: { 
  title: string; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, marginBottom: 12, background: '#fff', overflow: 'hidden' }}>
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        style={{ width: '100%', padding: '12px 16px', background: open ? 'var(--steel)' : 'var(--bg)', color: open ? '#fff' : 'var(--ink)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'Cairo, sans-serif', textAlign: 'right', direction: 'rtl' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {badge !== undefined && badge > 0 && (
            <span style={{ background: '#fff', color: 'var(--steel)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{badge}</span>
          )}
        </span>
        <span style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '12px 16px 16px', background: '#fafafa' }}>
          {children}
        </div>
      )}
    </div>
  );
}

export function FilterGroup({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string; }) {
  return (
    <FormGroup label={label}>
      {children}
      {hint && <small style={{ color: 'var(--muted)', fontSize: 11, display: 'block', marginTop: 2 }}>{hint}</small>}
    </FormGroup>
  );
}

function formatOrderDetail(order: any) {
  const fields = [
    { label: 'رقم الطلب', value: order.ID },
    { label: 'السنة', value: order.Year },
    { label: 'الزبون', value: order.Customer },
    { label: 'النموذج', value: order.Pattern },
    { label: 'الوصف', value: order.Pattern2 },
    { label: 'المرجع', value: order.marji3 },
    { label: 'الكمية المطلوبة', value: order.Demand },
    { label: 'السعر', value: order.Price ? `${order.Price} ر.س` : '—' },
    { label: 'تاريخ الورود', value: order.date_come || '—' },
    { label: 'موعد التسليم', value: order.Apoent_Delv_date || '—' },
    { label: 'المنتج النهائي', value: order.grnd_qunt },
    { label: 'ملاحظات', value: order.note_ord },
  ];
  const specsFields = [
    { label: 'نوع المطبوعة', value: order.unit },
    { label: 'الأبعاد (ط × ع × ا)', value: (order.LongU || order.WedthU || order.HightU) ? `${order.LongU || '?'} × ${order.WedthU || '?'} × ${order.HightU || '?'}` : '—' },
    { label: 'الحجم النهائي (طري)', value: (order.final_size_tall || order.final_size_width) ? `${order.final_size_tall || '?'} × ${order.final_size_width || '?'}` : '—' },
    { label: 'الحجم النهائي (قاسي)', value: (order.final_size_tall2 || order.final_size_width2) ? `${order.final_size_tall2 || '?'} × ${order.final_size_width2 || '?'}` : '—' },
    { label: 'الطري', value: order.SoftU },
    { label: 'القاسي', value: order.TafU },
    { label: 'الارتفاع', value: order.HightU },
    { label: 'لسان التدكيك', value: order.Lesan },
    { label: 'الطبع على', value: order.print_on },
    { label: 'الطبع على (2)', value: order.print_on2 },
    { label: 'عدد الألوان', value: order.Clr_qunt },
    { label: 'فصل الطبق', value: order.sheet_unit_qunt },
    { label: 'آلة الطبع', value: order.Machin_Print },
    { label: 'آلة التقطيع', value: order.Machin_Cut },
    { label: 'رقم المونتاج', value: order.MontagNum },
  ];
  const statuses = [];
  if (order.Printed) statuses.push('🖨️ مطبوع');
  if (order.Billed) statuses.push('🧾 مفوتر');
  if (order.Reseved) statuses.push('🚚 مُسلَّم');
  if (order.hasVouchers) statuses.push('🧾 له إيصالات');
  return { fields, specsFields, statuses };
}

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const { register, handleSubmit, reset, watch, setValue, getValues, control } = useForm<AdvancedSearchFilters>({
    defaultValues: { year: DEFAULT_YEAR, sortBy: 'ID', sortOrder: 'desc', limit: 50 }
  });

  const allFilters = useWatch({ control });
  const sortOrder = allFilters.sortOrder;
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult | null>(null);

  const activeFiltersCount = useMemo(() =>
    Object.entries(allFilters).filter(([key, v]) => {
      if (v === undefined || v === '' || v === null) return false;
      if (key === 'year' && String(v) === DEFAULT_YEAR) return false;
      if (['sortBy', 'sortOrder', 'limit', 'page'].includes(key)) return false;
      return true;
    }).length,
  [allFilters]);

  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  const [saveMessage, setSaveMessage] = useState('');
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [hoveredOrder, setHoveredOrder] = useState<AdvancedSearchResult['data'][0] | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: () => customersApi.list() as Promise<Customer[]>,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  
  const UNIT_TYPES = useMemo(() => ['علبة', 'كرتون', 'بروشور', 'استيكر', 'غلاف', 'وراقة دحابة'], []);
  const SORT_OPTIONS = useMemo(() => [
    { value: 'ID', label: '🔢 رقم الطلب' },
    { value: 'date_come', label: '📥 تاريخ الورود' },
    { value: 'Apoent_Delv_date', label: '📅 موعد التسليم' },
    { value: 'Demand', label: '📦 الكمية' },
    { value: 'Price', label: '💰 السعر' },
    { value: 'Customer', label: '👤 الزبون' },
  ], []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedOrderSearches');
      if (saved) setSavedSearches(JSON.parse(saved));
    } catch (e) { console.warn('Failed to load saved searches', e); }
  }, []);
  
  const onSearch = useCallback(async (filters: AdvancedSearchFilters) => {
    if (isSearching) return;
    setIsSearching(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      const result = await advancedSearchApi.search(filters);
      navigate(`${SEARCH_PATH}?${params.toString()}`, { replace: true });
      setSearchResults(result);
      localStorage.setItem('lastOrderSearch', JSON.stringify(filters));
    } catch (error: any) {
      console.error('Search failed:', error);
      alert('❌ حدث خطأ أثناء البحث: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSearching(false);
    }
  }, [navigate, isSearching]);
  
  const onSaveSearch = async () => {
    if (!newSearchName.trim()) { setSaveMessage('⚠️ يرجى إدخال اسم للبحث'); return; }
    const filters = getValues();
    const newSaved: SavedSearch = { id: Date.now().toString(), name: newSearchName, filters, createdAt: new Date().toISOString(), createdBy: 'current_user' };
    const updated = [...savedSearches, newSaved];
    setSavedSearches(updated);
    localStorage.setItem('savedOrderSearches', JSON.stringify(updated));
    setNewSearchName('');
    setSaveMessage('✅ تم حفظ البحث بنجاح');
    setTimeout(() => setSaveMessage(''), 3000);
  };
  
  const onLoadSavedSearch = (search: SavedSearch) => {
    reset(search.filters);
    setShowSavedModal(false);
    setTimeout(() => handleSubmit(onSearch)(), 100);
  };
  
  const onDeleteSavedSearch = (id: string) => {
    if (confirm('هل تريد حذف هذا البحث المحفوظ؟')) {
      const updated = savedSearches.filter(s => s.id !== id);
      setSavedSearches(updated);
      localStorage.setItem('savedOrderSearches', JSON.stringify(updated));
    }
  };
  
  const onExport = async () => {
    if (!searchResults?.data?.length) { alert('⚠️ لا توجد نتائج لتصديرها'); return; }
    if (searchResults.total > 10000) { alert('⚠️ عدد النتائج كبير جداً'); return; }
    setIsExporting(true);
    try {
      const filters = getValues();
      const blob = await advancedSearchApi.export(filters, exportFormat);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order_search_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error: any) {
      alert('❌ فشل التصدير: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsExporting(false);
    }
  };
  
  const onReset = () => {
    reset({ year: DEFAULT_YEAR, sortBy: 'ID', sortOrder: 'desc', limit: 50 });
    setSearchResults(null);
    navigate(SEARCH_PATH, { replace: true });
  };
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(onSearch)(); }
      if (e.key === 'Escape') setShowSavedModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch, handleSubmit]);
  
  const handleMouseEnter = (e: React.MouseEvent, order: any) => {
    if (hideTimeout.current) clearTimeout(hideTimeout.current);
    const x = Math.min(e.clientX + 15, window.innerWidth - 520);
    const y = Math.min(e.clientY + 15, window.innerHeight - 320);
    setTooltipPos({ x, y });
    setHoveredOrder(order);
  };
  
  const handleMouseLeave = () => {
    hideTimeout.current = setTimeout(() => setHoveredOrder(null), 150);
  };

  const FILTER_LABELS = useMemo(() => ({
    customer: '👤 الزبون', orderId: '🔢 رقم الطلب', pattern: '🎨 النموذج',
    dateComeFrom: '📅 من تاريخ', dateComeTo: '📅 إلى تاريخ', isPrinted: '🖨️ مطبوع',
    isBilled: '🧾 مفوتر', hasVouchers: '🧾 له إيصالات', Form: '🚢 تصدير'
  }), []);
  
  return (
    <div style={{ direction: 'rtl', padding: 20, maxWidth: 1400, margin: '0 auto', fontFamily: 'Cairo, sans-serif' }}>
      
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink)' }}>←</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🔍 البحث المتقدم في الطلبات</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>ابحث عبر جميع حقول النظام مع خيارات تصفية متقدمة</p>
        </div>
        {searchResults && (
          <div style={{ marginRight: 'auto', display: 'flex', gap: 16, background: '#f8f9fa', padding: '8px 16px', borderRadius: 8 }}>
            <span><b>{searchResults.total}</b> نتيجة</span>
            <span>•</span>
            <span>صفحة <b>{searchResults.page}</b> من <b>{searchResults.totalPages}</b></span>
          </div>
        )}
      </header>
      
      <nav style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
        <Btn variant="primary" type="button" onClick={handleSubmit(onSearch)} disabled={isSearching}>
          {isSearching ? '⏳ جاري البحث...' : '🔍 تنفيذ البحث'} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Btn>
        <Btn variant="outline" type="button" onClick={onReset}>🗑️ إعادة تعيين</Btn>
        <Btn variant="outline" type="button" onClick={() => setShowSavedModal(true)}>
          📂 البحوث المحفوظة {savedSearches.length > 0 && `(${savedSearches.length})`}
        </Btn>
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        <select value={exportFormat} onChange={(e) => setExportFormat(e.target.value as any)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff' }}>
          <option value="csv">📄 CSV</option>
          <option value="excel">📊 Excel</option>
          <option value="pdf">📕 PDF</option>
        </select>
        <Btn variant="outline" type="button" onClick={onExport} disabled={isExporting || !searchResults?.data?.length}>
          {isExporting ? '⏳...' : '📤 تصدير'}
        </Btn>
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        <Btn variant="outline" type="button" onClick={() => { navigator.clipboard.writeText(JSON.stringify(getValues(), null, 2)); }}>
          📋 نسخ الإعدادات
        </Btn>
      </nav>
      
      {activeFiltersCount > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', padding: '8px 12px', background: '#e3f2fd', borderRadius: 8 }}>
          {Object.entries(allFilters).map(([key, value]) => {
            if (value === undefined || value === '' || value === null) return null;
            if (['year', 'sortBy', 'sortOrder', 'limit'].includes(key)) return null;
            if (key === 'year' && value === DEFAULT_YEAR) return null;
            return (
              <span key={key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: '#fff', borderRadius: 16, fontSize: 12, border: '1px solid #bbdefb' }}>
                {FILTER_LABELS[key as keyof typeof FILTER_LABELS] || key}: <b>{String(value)}</b>
                <button
                  onClick={() => setValue(key as keyof AdvancedSearchFilters, key === 'year' ? DEFAULT_YEAR as any : undefined)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666', padding: 0, lineHeight: 1 }}>✕</button>
              </span>
            );
          })}
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSearch)} style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        <section>
          <FilterCard title="🔍 بحث نصي سريع">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FilterGroup label="كلمة مفتاحية" hint="ابحث في جميع الحقول النصية">
                <input className="fc" {...register('query')} placeholder="اكتب للبحث..." style={{ textAlign: 'right' }} />
              </FilterGroup>
              <FilterGroup label="اسم الزبون">
                <input className="fc" {...register('customer')} list="search-customers" placeholder="ابحث بالاسم..." style={{ textAlign: 'right' }} />
                <datalist id="search-customers">
                  {customers.map((c) => <option key={c._ID ?? c.ID1 ?? c.Customer} value={c.Customer} />)}
                </datalist>
              </FilterGroup>
            </div>
          </FilterCard>
          
          <FilterCard title="📋 بيانات الطلب الأساسية" badge={activeFiltersCount}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <FilterGroup label="رقم الطلب"><input className="fc" type="number" {...register('orderId')} placeholder="4085" style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="رقم التسلسل"><input className="fc" type="number" {...register('serialNumber')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="المرجع"><input className="fc" {...register('reference')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="سنة العمل"><input className="fc" type="number" {...register('year')} min="2020" max="2030" style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="من تاريخ الورود"><input className="fc" type="date" {...register('dateComeFrom')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="إلى تاريخ الورود"><input className="fc" type="date" {...register('dateComeTo')} style={{ textAlign: 'right' }} /></FilterGroup>
            </div>
          </FilterCard>
          
          <FilterCard title="🎨 مواصفات المطبوعة">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <FilterGroup label="اسم النموذج"><input className="fc" {...register('pattern')} placeholder="Pattern" style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="وصف النموذج"><input className="fc" {...register('pattern2')} placeholder="Pattern2" style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="نوع المطبوعة"><select className="fc" {...register('unitType')} style={{ textAlign: 'right' }}><option value="">-- الكل --</option>{UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}</select></FilterGroup>
              <FilterGroup label="الكود"><input className="fc" {...register('code')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="الحد الأدنى للكمية"><input className="fc" type="number" {...register('demandMin')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="الحد الأقصى للكمية"><input className="fc" type="number" {...register('demandMax')} style={{ textAlign: 'right' }} /></FilterGroup>
            </div>
          </FilterCard>
          
          {/* ✅ حالة الطلب — isExport أصبح input نصي */}
          <FilterCard title="✅ حالة الطلب والخصائص">
            <fieldset style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, border: 'none', padding: 0, margin: 0 }}>
              {[
                { key: 'isPrinted',   label: '🖨️ مطبوع' },
                { key: 'isBilled',    label: '🧾 مفوتر' },
                { key: 'isDelivered', label: '🚚 مُسلَّم' },
                { key: 'hasVouchers', label: '🧾 له إيصالات' },
                { key: 'hasProblems', label: '⚠️ له مشاكل' },
                { key: 'hasCartons',  label: '📦 له مواد' },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, cursor: 'pointer' }}>
                  <input type="checkbox" {...register(key as keyof AdvancedSearchFilters)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              ))}

              {/* ✅ تصدير — input نصي بدل checkbox */}
              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <FilterGroup label="🚢 تصدير">
                  <input
                    className="fc"
                    {...register('Form')}
                    placeholder="مثال: نعم، لا، اسم الدولة..."
                    style={{ textAlign: 'right' }}
                  />
                </FilterGroup>
              </div>
            </fieldset>
          </FilterCard>
          
          <FilterCard title="⚙️ العمليات والمواد">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FilterGroup label="نوع العملية"><input className="fc" {...register('operationType')} placeholder="طباعة، تقطيع..." style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="اسم الآلة"><input className="fc" {...register('machineName')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="المورد"><input className="fc" {...register('materialSupplier')} style={{ textAlign: 'right' }} /></FilterGroup>
              <FilterGroup label="الحد الأدنى للسعر"><input className="fc" type="number" step="0.01" {...register('priceMin')} style={{ textAlign: 'right' }} /></FilterGroup>
            </div>
          </FilterCard>
        </section>
        
        <aside style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
          <Card noPad>
            <div style={{ padding: 16 }}>
              <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>⚙️ خيارات العرض</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FilterGroup label="ترتيب النتائج حسب">
                  <select className="fc" {...register('sortBy')} style={{ textAlign: 'right' }}>
                    {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </FilterGroup>
                <FilterGroup label="اتجاه الترتيب">
                  <div style={{ display: 'flex', gap: 8 }}>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: sortOrder === 'desc' ? '#e3f2fd' : '#f8f9fa', borderRadius: 6, cursor: 'pointer' }}>
                      <input type="radio" value="desc" {...register('sortOrder')} /> تنازلي ↓
                    </label>
                    <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: sortOrder === 'asc' ? '#e3f2fd' : '#f8f9fa', borderRadius: 6, cursor: 'pointer' }}>
                      <input type="radio" value="asc" {...register('sortOrder')} /> تصاعدي ↑
                    </label>
                  </div>
                </FilterGroup>
                <FilterGroup label="عدد النتائج في الصفحة">
                  <select className="fc" {...register('limit', { valueAsNumber: true })} style={{ textAlign: 'right' }}>
                    <option value={25}>25 نتيجة</option><option value={50}>50 نتيجة</option>
                    <option value={100}>100 نتيجة</option><option value={200}>200 نتيجة</option>
                  </select>
                </FilterGroup>
              </div>
              <div style={{ margin: '20px 0', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                <Btn variant="primary" type="submit" style={{ width: '100%', marginBottom: 8 }} disabled={isSearching}>
                  {isSearching ? '⏳ جاري البحث...' : '🔍 تنفيذ البحث'}
                </Btn>
                <Btn variant="outline" type="button" onClick={() => setShowSavedModal(true)} style={{ width: '100%' }}>
                  📂 حفظ/تحميل بحث
                </Btn>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', textAlign: 'center' }}>
                💡 اضغط <kbd style={{ background: '#eee', padding: '2px 6px', borderRadius: 4 }}>Ctrl+Enter</kbd> للبحث السريع
              </div>
            </div>
          </Card>
          
          {searchResults && (
            <div style={{ marginTop: 16 }}>
              <Card noPad>
                <div style={{ padding: 16 }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>📊 ملخص النتائج</h4>
                  <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13, margin: 0 }}>
                    <dt>📦 إجمالي النتائج:</dt><dd style={{ fontWeight: 700, textAlign: 'left', margin: 0 }}>{searchResults.total}</dd>
                    <dt>📄 الصفحات:</dt><dd style={{ fontWeight: 700, textAlign: 'left', margin: 0 }}>{searchResults.totalPages}</dd>
                  </dl>
                </div>
              </Card>
            </div>
          )}
        </aside>
      </form>
      
      {searchResults && searchResults.data.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>📋 نتائج البحث ({searchResults.data.length} من {searchResults.total})</h3>
            <Btn variant="outline" size="sm" onClick={() => {
              const csv = [['رقم الطلب', 'الزبون', 'النموذج', 'الكمية', 'السعر', 'تاريخ الورود', 'الحالة'].join(',')];
              searchResults.data.forEach((r) => {
                csv.push([r.ID, r.Customer, r.Pattern, r.Demand, r.Price, r.date_come,
                  [r.Printed ? 'مطبوع' : '', r.Billed ? 'مفوتر' : '', r.Reseved ? 'مُسلَّم' : ''].filter(Boolean).join('/')].join(','));
              });
              const blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'search_results.csv'; a.click(); URL.revokeObjectURL(url);
            }}>📥 تصدير سريع (CSV)</Btn>
          </div>
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--steel)', color: '#fff' }}>
                  {['رقم الطلب','الزبون','النموذج','الكمية','السعر','تاريخ الورود','موعد التسليم','الحالة','عرض'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searchResults.data.map((order, i: number) => (
                  <tr key={order._ID || order.ID || i}
                    style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                    onClick={() => navigate(`/orders/${order.ID}/${order.Year || allFilters.year}`)}
                    onMouseEnter={(e) => handleMouseEnter(e, order)}
                    onMouseLeave={handleMouseLeave}
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/orders/${order.ID}/${order.Year || allFilters.year}`); } }}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{order.ID}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Customer || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Pattern} {order.Pattern2 ? `(${order.Pattern2})` : ''}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{order.Demand || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{order.Price ? `${order.Price} ر.س` : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{order.date_come || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Apoent_Delv_date || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 11, background: order.Printed ? '#e8f5e9' : order.Billed ? '#fff3e0' : '#f5f5f5', color: order.Printed ? '#2e7d32' : order.Billed ? '#ef6c00' : '#666' }}>
                        {order.Printed ? '🖨️ مطبوع' : order.Billed ? '🧾 مفوتر' : '⏳ قيد المعالجة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--steel)', padding: 4 }} title="عرض التفاصيل"
                        onClick={(e) => { e.stopPropagation(); navigate(`/orders/${order.ID}/${order.Year || allFilters.year}`); }}>👁️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {searchResults.totalPages > 1 && (
            <nav aria-label="ترقيم الصفحات" style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 16 }}>
              {Array.from({ length: searchResults.totalPages }, (_, i) => i + 1)
                .slice(Math.max(0, searchResults.page - 3), Math.min(searchResults.totalPages, searchResults.page + 2))
                .map(page => (
                  <button key={page} onClick={() => { setValue('page', page); handleSubmit(onSearch)(); }}
                    aria-current={page === searchResults.page ? 'page' : undefined}
                    style={{ width: 32, height: 32, borderRadius: 6, background: page === searchResults.page ? 'var(--steel)' : '#fff', color: page === searchResults.page ? '#fff' : 'var(--ink)', cursor: 'pointer', fontWeight: page === searchResults.page ? 700 : 400, border: page === searchResults.page ? 'none' : '1px solid var(--border)' }}>
                    {page}
                  </button>
                ))}
            </nav>
          )}
        </section>
      )}
      
      {hoveredOrder && createPortal(
        <div style={{ position: 'fixed', top: tooltipPos.y, left: tooltipPos.x, zIndex: 1000, background: '#fff', borderRadius: 16, boxShadow: '0 20px 40px rgba(0,0,0,0.2)', padding: '14px 18px', minWidth: 500, maxWidth: 700, direction: 'rtl', fontFamily: 'Cairo, sans-serif', pointerEvents: 'none' }}>
          <div style={{ fontWeight: 800, fontSize: 14, borderBottom: '2px solid var(--steel)', paddingBottom: 6, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>📄 تفاصيل الطلب #{hoveredOrder.ID}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{hoveredOrder.Year}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px 20px' }}>
            {(() => {
              const { fields, specsFields, statuses } = formatOrderDetail(hoveredOrder);
              return (
                <>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--steel)', marginBottom: 8 }}>📋 بيانات الطلب</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 12 }}>
                      {fields.map((f, idx) => f.value && f.value !== '—' ? (
                        <React.Fragment key={idx}>
                          <span style={{ fontWeight: 600, color: 'var(--steel)' }}>{f.label}:</span>
                          <span>{f.value}</span>
                        </React.Fragment>
                      ) : null)}
                      {statuses.length > 0 && (
                        <>
                          <span style={{ fontWeight: 600, color: 'var(--steel)' }}>الحالة:</span>
                          <span style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {statuses.map(s => <span key={s} style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 20, fontSize: 11 }}>{s}</span>)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    {/* ── القياسات ── */}
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--steel)', marginBottom: 6 }}>📐 القياسات</div>
                    <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 6, textAlign: 'center', marginBottom: 6 }}>
                        {[
                          { label: 'الطول', value: hoveredOrder.LongU },
                          { label: 'العرض', value: hoveredOrder.WedthU },
                          { label: 'الارتفاع', value: hoveredOrder.HightU },
                        ].map(d => (
                          <div key={d.label} style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', background: '#fff' }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>{d.label}</div>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{d.value || '—'}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 11 }}>
                        {hoveredOrder.SoftU && <div><span style={{ color: 'var(--muted)' }}>طري: </span><b>{hoveredOrder.SoftU}</b></div>}
                        {hoveredOrder.TafU  && <div><span style={{ color: 'var(--muted)' }}>قاسي: </span><b>{hoveredOrder.TafU}</b></div>}
                        {hoveredOrder.Lesan && <div style={{ gridColumn: '1/-1' }}><span style={{ color: 'var(--muted)' }}>لسان التدكيك: </span><b>{hoveredOrder.Lesan}</b></div>}
                      </div>
                      {(hoveredOrder.final_size_tall || hoveredOrder.final_size_width) && (
                        <div style={{ marginTop: 5, fontSize: 11, borderTop: '1px solid var(--border)', paddingTop: 4 }}>
                          <span style={{ color: 'var(--muted)' }}>الحجم النهائي طري: </span>
                          <b>{hoveredOrder.final_size_tall} × {hoveredOrder.final_size_width}</b>
                        </div>
                      )}
                      {(hoveredOrder.final_size_tall2 || hoveredOrder.final_size_width2) && (
                        <div style={{ fontSize: 11 }}>
                          <span style={{ color: 'var(--muted)' }}>الحجم النهائي قاسي: </span>
                          <b>{hoveredOrder.final_size_tall2} × {hoveredOrder.final_size_width2}</b>
                        </div>
                      )}
                    </div>
                    {/* ── مواصفات الطباعة ── */}
                    <div style={{ fontWeight: 700, fontSize: 12, color: 'var(--steel)', marginBottom: 6 }}>⚙️ مواصفات الطباعة</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '5px 10px', fontSize: 12 }}>
                      {specsFields.filter(f => f.value && f.value !== '—').map((f, idx) => (
                        <React.Fragment key={idx}>
                          <span style={{ fontWeight: 600, color: 'var(--steel)', whiteSpace: 'nowrap' }}>{f.label}:</span>
                          <span>{f.value}</span>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', textAlign: 'center', borderTop: '1px solid var(--border)', paddingTop: 8 }}>اضغط للانتقال إلى صفحة التعديل</div>
        </div>,
        document.body
      )}
      
      {showSavedModal && (
        <div onClick={() => setShowSavedModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 16, padding: 24, width: 520, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: 'right' }}>📂 البحوث المحفوظة</h3>
            {savedSearches.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>لا توجد بحوث محفوظة</p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                {savedSearches.map(search => (
                  <div key={search.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderBottom: '1px solid var(--border)', background: '#fafafa', borderRadius: 8, marginBottom: 8 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{search.name}</div>
                      <small style={{ color: 'var(--muted)' }}>{new Date(search.createdAt).toLocaleDateString('ar-SA')}</small>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onLoadSavedSearch(search)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#27ae60', fontSize: 16, padding: 4 }}>📥</button>
                      <button onClick={() => onDeleteSavedSearch(search.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 16, padding: 4 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <SectionDiv label="💾 حفظ البحث الحالي" />
            {saveMessage && (
              <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: saveMessage.startsWith('✅') ? '#e8f5e9' : '#fff3e0', fontSize: 13 }}>{saveMessage}</div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="fc" value={newSearchName} onChange={(e) => setNewSearchName(e.target.value)} placeholder="اسم البحث..." style={{ flex: 1, textAlign: 'right' }} onKeyDown={(e) => e.key === 'Enter' && onSaveSearch()} />
              <Btn variant="primary" type="button" onClick={onSaveSearch} disabled={!newSearchName.trim()}>حفظ</Btn>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="outline" type="button" onClick={() => setShowSavedModal(false)}>إغلاق</Btn>
            </div>
          </div>
        </div>
      )}
      
      {isSearching && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.9)', zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ width: 40, height: 40, border: '4px solid var(--border)', borderTopColor: 'var(--steel)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>جاري البحث في قاعدة البيانات...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
    </div>
  );
}
