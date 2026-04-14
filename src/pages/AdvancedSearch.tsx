// 📁 pages/AdvancedSearchPage.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { advancedSearchApi } from '../api/services';
import type { AdvancedSearchFilters, AdvancedSearchResult, SavedSearch } from '../types/search';
import { Btn, FormGroup, SectionDiv, Loading, Card } from '../components/ui';

// ── مكونات فرعية داخل الصفحة ──────────────────────────────────────────────

// 🔽 بطاقة فلتر قابلة للطي
function FilterCard({ 
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
    <div style={{ 
      border: '1px solid var(--border)', 
      borderRadius: 12, 
      marginBottom: 12,
      background: '#fff',
      overflow: 'hidden'
    }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '12px 16px',
          background: open ? 'var(--steel)' : 'var(--bg)',
          color: open ? '#fff' : 'var(--ink)',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 600,
          fontFamily: 'Cairo, sans-serif',
          textAlign: 'right',
          direction: 'rtl'
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {title}
          {badge !== undefined && badge > 0 && (
            <span style={{
              background: '#fff',
              color: 'var(--steel)',
              borderRadius: '50%',
              width: 20, height: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700
            }}>{badge}</span>
          )}
        </span>
        <span style={{ 
          transition: 'transform 0.2s',
          transform: open ? 'rotate(180deg)' : 'rotate(0)'
        }}>▼</span>
      </button>
      
      {open && (
        <div style={{ padding: '12px 16px 16px', background: '#fafafa' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── الصفحة الرئيسية ──────────────────────────────────────────────────────

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  
  // 🎣 Form state
  const { register, handleSubmit, reset, watch, setValue } = useForm<AdvancedSearchFilters>({
    defaultValues: {
      year: new Date().getFullYear().toString(),
      sortBy: 'ID',
      sortOrder: 'desc',
      limit: 50
    }
  });
  
  // 🔄 Search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<AdvancedSearchResult | null>(null);
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  // 💾 Saved searches
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [newSearchName, setNewSearchName] = useState('');
  
  // 📤 Export state
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  // 📊 بيانات مساعدة للقوائم
  const { data: customers = [] } = useQuery({
    queryKey: ['customers'],
    queryFn: () => fetch('/api/customers').then(r => r.json())
  });
  
  const UNIT_TYPES = ['علبة', 'كرتون', 'بروشور', 'استيكر', 'غلاف', 'وراقة دحابة'];
  const SORT_OPTIONS = [
    { value: 'ID', label: '🔢 رقم الطلب' },
    { value: 'date_come', label: '📥 تاريخ الورود' },
    { value: 'Apoent_Delv_date', label: '📅 موعد التسليم' },
    { value: 'Demand', label: '📦 الكمية' },
    { value: 'Price', label: '💰 السعر' },
    { value: 'Customer', label: '👤 الزبون' },
  ];
  
  // 🔍 حساب عدد الفلاتر النشطة
  useEffect(() => {
    const values = watch();
    const count = Object.values(values).filter(
      v => v !== undefined && v !== '' && v !== null && 
           v !== new Date().getFullYear().toString() && // استثناء السنة الافتراضية
           v !== 'ID' && v !== 'desc' && v !== 50 // استثناء القيم الافتراضية للفرز
    ).length;
    setActiveFiltersCount(count);
  }, [watch]);
  
  // 💾 تحميل البحوث المحفوظة
  useEffect(() => {
    const loadSaved = async () => {
      try {
        const saved = localStorage.getItem('savedOrderSearches');
        if (saved) setSavedSearches(JSON.parse(saved));
      } catch (e) { console.warn('Failed to load saved searches', e); }
    };
    loadSaved();
  }, []);
  
  // 🔍 تنفيذ البحث
  const onSearch = useCallback(async (filters: AdvancedSearchFilters) => {
    setIsSearching(true);
    try {
      // ✅ تحديث URL بارامترز للمشاركة
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      navigate(`/orders/search?${params.toString()}`, { replace: true });
      
      // ✅ تنفيذ البحث
      const result = await advancedSearchApi.search(filters);
      setSearchResults(result);
      
      // ✅ حفظ الفلاتر الحالية للاستخدام لاحقاً
      localStorage.setItem('lastOrderSearch', JSON.stringify(filters));
      
    } catch (error: any) {
      console.error('Search failed:', error);
      alert('❌ حدث خطأ أثناء البحث: ' + (error.response?.data?.message || error.message));
    } finally {
      setIsSearching(false);
    }
  }, [navigate]);
  
  // 💾 حفظ بحث مخصص
  const onSaveSearch = async () => {
    if (!newSearchName.trim()) {
      alert('⚠️ يرجى إدخال اسم للبحث');
      return;
    }
    
    const filters = watch();
    const newSaved: SavedSearch = {
      id: Date.now().toString(),
      name: newSearchName,
      filters,
      createdAt: new Date().toISOString(),
      createdBy: 'current_user' // ✅ يمكن استبداله بـ user.id من auth
    };
    
    const updated = [...savedSearches, newSaved];
    setSavedSearches(updated);
    localStorage.setItem('savedOrderSearches', JSON.stringify(updated));
    
    setNewSearchName('');
    setShowSavedModal(false);
    alert('✅ تم حفظ البحث بنجاح');
  };
  
  // 📂 تحميل بحث محفوظ
  const onLoadSavedSearch = (search: SavedSearch) => {
    reset(search.filters);
    setShowSavedModal(false);
    // ✅ تنفيذ البحث تلقائياً بعد التحميل
    setTimeout(() => handleSubmit(onSearch)(), 100);
  };
  
  // 🗑️ حذف بحث محفوظ
  const onDeleteSavedSearch = (id: string) => {
    if (confirm('هل تريد حذف هذا البحث المحفوظ؟')) {
      const updated = savedSearches.filter(s => s.id !== id);
      setSavedSearches(updated);
      localStorage.setItem('savedOrderSearches', JSON.stringify(updated));
    }
  };
  
  // 📤 تصدير النتائج
  const onExport = async () => {
    if (!searchResults?.data?.length) {
      alert('⚠️ لا توجد نتائج لتصديرها');
      return;
    }
    
    setIsExporting(true);
    try {
      const filters = watch();
      const blob = await advancedSearchApi.exportResults(filters, exportFormat);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `order_search_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      
      alert('✅ تم تصدير الملف بنجاح');
    } catch (error: any) {
      console.error('Export failed:', error);
      alert('❌ فشل التصدير: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // 🔄 إعادة تعيين الفلاتر
  const onReset = () => {
    reset({
      year: new Date().getFullYear().toString(),
      sortBy: 'ID',
      sortOrder: 'desc',
      limit: 50
    });
    setSearchResults(null);
    // ✅ تنظيف الـ URL
    navigate('/orders/search', { replace: true });
  };
  
  // ⌨️ اختصار لوحة المفاتيح: Ctrl+Enter للبحث
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(onSearch)();
      }
      if (e.key === 'Escape') {
        setShowSavedModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSearch, handleSubmit]);
  
  // 🎨 Helper لعرض الحقول
  const G = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
    <FormGroup label={label}>
      {children}
      {hint && <small style={{ color: 'var(--muted)', fontSize: 11, display: 'block', marginTop: 2 }}>{hint}</small>}
    </FormGroup>
  );
  
  return (
    <div style={{ direction: 'rtl', padding: 20, maxWidth: 1400, margin: '0 auto', fontFamily: 'Cairo, sans-serif' }}>
      
      {/* 📍 Header */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24,
        paddingBottom: 16, borderBottom: '1px solid var(--border)'
      }}>
        <button onClick={() => navigate('/orders')} style={{ 
          background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink)' 
        }}>←</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🔍 البحث المتقدم في الطلبات</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            ابحث عبر جميع حقول النظام مع خيارات تصفية متقدمة
          </p>
        </div>
        
        {/* 📊 إحصائيات سريعة */}
        {searchResults && (
          <div style={{ 
            marginRight: 'auto', display: 'flex', gap: 16, 
            background: '#f8f9fa', padding: '8px 16px', borderRadius: 8
          }}>
            <span><b>{searchResults.total}</b> نتيجة</span>
            <span>•</span>
            <span>صفحة <b>{searchResults.page}</b> من <b>{searchResults.totalPages}</b></span>
          </div>
        )}
      </div>
      
      {/* 🎛️ شريط الأدوات العلوي */}
      <div style={{ 
        display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap',
        background: '#fff', padding: 12, borderRadius: 12, border: '1px solid var(--border)'
      }}>
        <Btn variant="primary" type="button" onClick={handleSubmit(onSearch)} disabled={isSearching}>
          {isSearching ? '⏳ جاري البحث...' : '🔍 تنفيذ البحث'} {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Btn>
        
        <Btn variant="outline" type="button" onClick={onReset}>🗑️ إعادة تعيين</Btn>
        
        <Btn variant="outline" type="button" onClick={() => setShowSavedModal(true)}>
          📂 البحوث المحفوظة {savedSearches.length > 0 && `(${savedSearches.length})`}
        </Btn>
        
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        
        <select 
          value={exportFormat} 
          onChange={(e) => setExportFormat(e.target.value as any)}
          style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: '#fff' }}
        >
          <option value="csv">📄 CSV</option>
          <option value="excel">📊 Excel</option>
          <option value="pdf">📕 PDF</option>
        </select>
        <Btn variant="outline" type="button" onClick={onExport} disabled={isExporting || !searchResults?.data?.length}>
          {isExporting ? '⏳...' : '📤 تصدير'}
        </Btn>
        
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} />
        
        <Btn variant="outline" type="button" onClick={() => {
          const filters = watch();
          navigator.clipboard.writeText(JSON.stringify(filters, null, 2));
          alert('✅ تم نسخ إعدادات البحث للحافظة');
        }}>
          📋 نسخ الإعدادات
        </Btn>
      </div>
      
      {/* 🔄 عرض الفلاتر النشطة كـ Tags */}
      {activeFiltersCount > 0 && (
        <div style={{ 
          display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap',
          padding: '8px 12px', background: '#e3f2fd', borderRadius: 8
        }}>
          {Object.entries(watch()).map(([key, value]) => {
            if (value === undefined || value === '' || value === null) return null;
            if (['year', 'sortBy', 'sortOrder', 'limit'].includes(key)) return null;
            if (key === 'year' && value === new Date().getFullYear().toString()) return null;
            
            const labelMap: Record<string, string> = {
              customer: '👤 الزبون', orderId: '🔢 رقم الطلب', pattern: '🎨 النموذج',
              dateComeFrom: '📅 من تاريخ', dateComeTo: '📅 إلى تاريخ',
              isPrinted: '🖨️ مطبوع', isBilled: '🧾 مفوتر', hasVouchers: '🧾 له إيصالات'
            };
            
            return (
              <span key={key} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', background: '#fff', borderRadius: 16,
                fontSize: 12, border: '1px solid #bbdefb'
              }}>
                {labelMap[key] || key}: <b>{String(value)}</b>
                <button onClick={() => setValue(key as any, undefined)} 
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#666' }}>✕</button>
              </span>
            );
          })}
        </div>
      )}
      
      {/* 📋 نموذج البحث المتقدم */}
      <form onSubmit={handleSubmit(onSearch)} style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20 }}>
        
        {/* 🎛️ أعمدة الفلاتر */}
        <div>
          {/* 🔍 بحث نصي عام */}
          <FilterCard title="🔍 بحث نصي سريع" defaultOpen={true}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <G label="كلمة مفتاحية" hint="ابحث في جميع الحقول النصية">
                <input className="fc" {...register('query')} placeholder="اكتب للبحث..." style={{ textAlign: 'right' }} />
              </G>
              <G label="اسم الزبون">
                <input className="fc" {...register('customer')} list="search-customers" placeholder="ابحث بالاسم..." style={{ textAlign: 'right' }} />
                <datalist id="search-customers">
                  {customers.map((c: any) => <option key={c._ID} value={c.Customer} />)}
                </datalist>
              </G>
            </div>
          </FilterCard>
          
          {/* 📋 بيانات الطلب */}
          <FilterCard title="📋 بيانات الطلب الأساسية" badge={activeFiltersCount}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <G label="رقم الطلب"><input className="fc" type="number" {...register('orderId')} placeholder="4085" style={{ textAlign: 'right' }} /></G>
              <G label="رقم التسلسل"><input className="fc" type="number" {...register('serialNumber')} style={{ textAlign: 'right' }} /></G>
              <G label="المرجع"><input className="fc" {...register('reference')} style={{ textAlign: 'right' }} /></G>
              <G label="سنة العمل"><input className="fc" type="number" {...register('year')} min="2020" max="2030" style={{ textAlign: 'right' }} /></G>
              <G label="من تاريخ الورود"><input className="fc" type="date" {...register('dateComeFrom')} style={{ textAlign: 'right' }} /></G>
              <G label="إلى تاريخ الورود"><input className="fc" type="date" {...register('dateComeTo')} style={{ textAlign: 'right' }} /></G>
            </div>
          </FilterCard>
          
          {/* 🎨 مواصفات المطبوعة */}
          <FilterCard title="🎨 مواصفات المطبوعة">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <G label="اسم النموذج"><input className="fc" {...register('pattern')} placeholder="Pattern" style={{ textAlign: 'right' }} /></G>
              <G label="وصف النموذج"><input className="fc" {...register('pattern2')} placeholder="Pattern2" style={{ textAlign: 'right' }} /></G>
              <G label="نوع المطبوعة">
                <select className="fc" {...register('unitType')} style={{ textAlign: 'right' }}>
                  <option value="">-- الكل --</option>
                  {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </G>
              <G label="الكود"><input className="fc" {...register('code')} style={{ textAlign: 'right' }} /></G>
              <G label="الحد الأدنى للكمية"><input className="fc" type="number" {...register('demandMin')} style={{ textAlign: 'right' }} /></G>
              <G label="الحد الأقصى للكمية"><input className="fc" type="number" {...register('demandMax')} style={{ textAlign: 'right' }} /></G>
            </div>
          </FilterCard>
          
          {/* ✅ فلاتر الحالة */}
          <FilterCard title="✅ حالة الطلب والخصائص">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                { key: 'isPrinted', label: '🖨️ مطبوع' },
                { key: 'isBilled', label: '🧾 مفوتر' },
                { key: 'isDelivered', label: '🚚 مُسلَّم' },
                { key: 'hasVouchers', label: '🧾 له إيصالات' },
                { key: 'hasProblems', label: '⚠️ له مشاكل' },
                { key: 'hasCartons', label: '📦 له مواد' },
              ].map(({ key, label }) => (
                <label key={key} style={{ 
                  display: 'flex', alignItems: 'center', gap: 8, 
                  padding: '8px 12px', background: '#f8f9fa', borderRadius: 6, cursor: 'pointer'
                }}>
                  <input type="checkbox" {...register(key as any)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              ))}
            </div>
          </FilterCard>
          
          {/* ⚙️ فلاتر العمليات والمواد */}
          <FilterCard title="⚙️ العمليات والمواد">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <G label="نوع العملية"><input className="fc" {...register('operationType')} placeholder="طباعة، تقطيع..." style={{ textAlign: 'right' }} /></G>
              <G label="اسم الآلة"><input className="fc" {...register('machineName')} style={{ textAlign: 'right' }} /></G>
              <G label="المورد"><input className="fc" {...register('materialSupplier')} style={{ textAlign: 'right' }} /></G>
              <G label="الحد الأدنى للسعر"><input className="fc" type="number" step="0.01" {...register('priceMin')} style={{ textAlign: 'right' }} /></G>
            </div>
          </FilterCard>
        </div>
        
        {/* ⚙️ لوحة التحكم الجانبية */}
        <div style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
          <Card style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>⚙️ خيارات العرض</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <G label="ترتيب النتائج حسب">
                <select className="fc" {...register('sortBy')} style={{ textAlign: 'right' }}>
                  {SORT_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </G>
              
              <G label="اتجاه الترتيب">
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: watch('sortOrder') === 'desc' ? '#e3f2fd' : '#f8f9fa', borderRadius: 6, cursor: 'pointer' }}>
                    <input type="radio" value="desc" {...register('sortOrder')} /> تنازلي ↓
                  </label>
                  <label style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: watch('sortOrder') === 'asc' ? '#e3f2fd' : '#f8f9fa', borderRadius: 6, cursor: 'pointer' }}>
                    <input type="radio" value="asc" {...register('sortOrder')} /> تصاعدي ↑
                  </label>
                </div>
              </G>
              
              <G label="عدد النتائج في الصفحة">
                <select className="fc" {...register('limit', { valueAsNumber: true })} style={{ textAlign: 'right' }}>
                  <option value={25}>25 نتيجة</option>
                  <option value={50}>50 نتيجة</option>
                  <option value={100}>100 نتيجة</option>
                  <option value={200}>200 نتيجة</option>
                </select>
              </G>
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
          </Card>
          
          {/* 📊 معاينة سريعة للنتائج */}
          {searchResults && (
            <Card style={{ padding: 16, marginTop: 16 }}>
              <h4 style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700 }}>📊 ملخص النتائج</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 13 }}>
                <div>📦 إجمالي النتائج:</div>
                <div style={{ fontWeight: 700, textAlign: 'left' }}>{searchResults.total}</div>
                <div>📄 الصفحات:</div>
                <div style={{ fontWeight: 700, textAlign: 'left' }}>{searchResults.totalPages}</div>
                <div>⏱️ وقت الاستجابة:</div>
                <div style={{ fontWeight: 700, textAlign: 'left' }}>-</div>
              </div>
            </Card>
          )}
        </div>
      </form>
      
      {/* 📋 جدول النتائج */}
      {searchResults && searchResults.data.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <div style={{ 
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)'
          }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>📋 نتائج البحث ({searchResults.data.length} من {searchResults.total})</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="outline" size="sm" onClick={() => {
                // ✅ تصفية النتائج الحالية محلياً
                const csv = [
                  ['رقم الطلب', 'الزبون', 'النموذج', 'الكمية', 'السعر', 'تاريخ الورود', 'الحالة'].join(','),
                  ...searchResults.data.map((r: any) => [
                    r.ID, r.Customer, r.Pattern, r.Demand, r.Price, r.date_come,
                    [r.Printed ? 'مطبوع' : '', r.Billed ? 'مفوتر' : '', r.Reseved ? 'مُسلَّم' : ''].filter(Boolean).join('/')
                  ].join(','))
                ].join('\n');
                
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'search_results.csv';
                a.click();
                URL.revokeObjectURL(url);
              }}>📥 تصدير سريع (CSV)</Btn>
            </div>
          </div>
          
          <div style={{ overflowX: 'auto', background: '#fff', borderRadius: 12, border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--steel)', color: '#fff' }}>
                  {['🔢', '👤 الزبون', '🎨 النموذج', '📦 الكمية', '💰 السعر', '📥 الورود', '📅 التسليم', '✅ الحالة', '🔗'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searchResults.data.map((order: any, i: number) => (
                  <tr key={order._ID || order.ID || i} 
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/orders/${order.ID}/${order.Year || watch('year')}`)}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{order.ID}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Customer || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Pattern} {order.Pattern2 ? `(${order.Pattern2})` : ''}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{order.Demand || '—'}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{order.Price ? `${order.Price} ر.س` : '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{order.date_come || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Apoent_Delv_date || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ 
                        padding: '3px 8px', borderRadius: 12, fontSize: 11,
                        background: order.Printed ? '#e8f5e9' : order.Billed ? '#fff3e0' : '#f5f5f5',
                        color: order.Printed ? '#2e7d32' : order.Billed ? '#ef6c00' : '#666'
                      }}>
                        {order.Printed ? '🖨️' : order.Billed ? '🧾' : '⏳'} {order.Printed ? 'مطبوع' : order.Billed ? 'مفوتر' : 'قيد المعالجة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button style={{ 
                        background: 'none', border: 'none', cursor: 'pointer', 
                        fontSize: 16, color: 'var(--steel)', padding: 4 
                      }} title="عرض التفاصيل">👁️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 📄 Pagination */}
          {searchResults.totalPages > 1 && (
            <div style={{ 
              display: 'flex', justifyContent: 'center', gap: 4, marginTop: 16 
            }}>
              {Array.from({ length: searchResults.totalPages }, (_, i) => i + 1).slice(
                Math.max(0, searchResults.page - 3), 
                Math.min(searchResults.totalPages, searchResults.page + 2)
              ).map(page => (
                <button
                  key={page}
                  onClick={() => {
                    setValue('page', page);
                    handleSubmit(onSearch)();
                  }}
                  style={{
                    width: 32, height: 32, borderRadius: 6, border: 'none',
                    background: page === searchResults.page ? 'var(--steel)' : '#fff',
                    color: page === searchResults.page ? '#fff' : 'var(--ink)',
                    cursor: 'pointer', fontWeight: page === searchResults.page ? 700 : 400,
                    border: page === searchResults.page ? 'none' : '1px solid var(--border)'
                  }}
                >{page}</button>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* 📂 Modal: البحوث المحفوظة */}
      {showSavedModal && (
        <div onClick={() => setShowSavedModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl'
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 16, padding: 24, width: 520, maxWidth: '95vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, textAlign: 'right' }}>📂 البحوث المحفوظة</h3>
            
            {savedSearches.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                لا توجد بحوث محفوظة — احفظ بحثك الحالي للوصول إليه لاحقاً
              </p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                {savedSearches.map(search => (
                  <div key={search.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderBottom: '1px solid var(--border)',
                    background: '#fafafa', borderRadius: 8, marginBottom: 8
                  }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{search.name}</div>
                      <small style={{ color: 'var(--muted)' }}>{new Date(search.createdAt).toLocaleDateString('ar-SA')}</small>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => onLoadSavedSearch(search)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#27ae60', fontSize: 16 }}>📥</button>
                      <button onClick={() => onDeleteSavedSearch(search.id)} 
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e74c3c', fontSize: 16 }}>🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <SectionDiv label="💾 حفظ البحث الحالي" />
            <div style={{ display: 'flex', gap: 8 }}>
              <input 
                className="fc" 
                value={newSearchName} 
                onChange={(e) => setNewSearchName(e.target.value)}
                placeholder="اسم البحث..."
                style={{ flex: 1, textAlign: 'right' }}
                onKeyDown={(e) => e.key === 'Enter' && onSaveSearch()}
              />
              <Btn variant="primary" type="button" onClick={onSaveSearch} disabled={!newSearchName.trim()}>حفظ</Btn>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="outline" type="button" onClick={() => setShowSavedModal(false)}>إغلاق</Btn>
            </div>
          </div>
        </div>
      )}
      
      {/* ⏳ Loading Overlay */}
      {isSearching && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(255,255,255,0.9)', 
          zIndex: 800, display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 12
        }}>
          <div style={{ 
            width: 40, height: 40, border: '4px solid var(--border)', 
            borderTopColor: 'var(--steel)', borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>جاري البحث في قاعدة البيانات...</div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      
    </div>
  );
}
