// 📁 pages/AdvancedSearchPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { advancedSearchApi } from '../api/searchService'; // تحديث المسار
import type { 
  AdvancedSearchFilters, 
  AdvancedSearchResult, 
  SavedSearch,
  Customer 
} from '../types/search';
import { Btn, FormGroup, SectionDiv, Card } from '../components/ui';

// ── ثوابت المسارات والإعدادات ──────────────────────────────────────────────
const SEARCH_PATH = '/orders/search';
const DEFAULT_YEAR = new Date().getFullYear().toString();

// ── مكونات فرعية قابلة لإعادة الاستخدام ───────────────────────────────────

// 🔽 بطاقة فلتر قابلة للطي
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
        aria-expanded={open}
        aria-controls={`filter-${title}`}
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
        }} aria-hidden="true">▼</span>
      </button>
      
      {open && (
        <div id={`filter-${title}`} style={{ padding: '12px 16px 16px', background: '#fafafa' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// 🎨 مجموعة حقول مُعاد استخدامها
export function FilterGroup({ 
  label, 
  children, 
  hint 
}: { 
  label: string; 
  children: React.ReactNode; 
  hint?: string;
}) {
  return (
    <FormGroup label={label}>
      {children}
      {hint && (
        <small style={{ 
          color: 'var(--muted)', 
          fontSize: 11, 
          display: 'block', 
          marginTop: 2 
        }}>
          {hint}
        </small>
      )}
    </FormGroup>
  );
}

// ── الصفحة الرئيسية ──────────────────────────────────────────────────────

export default function AdvancedSearchPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 🎣 Form state
  const { register, handleSubmit, reset, watch, setValue, control } = useForm<AdvancedSearchFilters>({
    defaultValues: {
      year: DEFAULT_YEAR,
      sortBy: 'ID',
      sortOrder: 'desc',
      limit: 50
    }
  });

  // ✅ useWatch لعرض الفلاتر النشطة بدون re-render غير ضروري
  const allFilters = useWatch({ control });
  const sortOrder = allFilters.sortOrder; // ✅ استخراج القيمة مرة واحدة
  
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
  
  // 📊 بيانات مساعدة للقوائم — مع تحسينات الأداء والأخطاء
  const { 
    data: customers = [], 
    isLoading: isLoadingCustomers 
  } = useQuery<Customer[]>({
    queryKey: ['customers'],
    queryFn: async () => {
      const res = await fetch('/api/customers');
      if (!res.ok) throw new Error('فشل تحميل قائمة العملاء');
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 دقائق
    retry: 1,
    onError: (err) => console.error('Error loading customers:', err)
  });
  
  // 📋 ثوابت القوائم
  const UNIT_TYPES = useMemo(() => 
    ['علبة', 'كرتون', 'بروشور', 'استيكر', 'غلاف', 'وراقة دحابة'], []);
  
  const SORT_OPTIONS = useMemo(() => [
    { value: 'ID', label: '🔢 رقم الطلب' },
    { value: 'date_come', label: '📥 تاريخ الورود' },
    { value: 'Apoent_Delv_date', label: '📅 موعد التسليم' },
    { value: 'Demand', label: '📦 الكمية' },
    { value: 'Price', label: '💰 السعر' },
    { value: 'Customer', label: '👤 الزبون' },
  ], []);
  
  // 🔍 حساب عدد الفلاتر النشطة — بدون re-render في كل keystroke
  useEffect(() => {
    const subscription = watch((values) => {
      const count = Object.entries(values || {}).filter(([key, v]) => {
        if (v === undefined || v === '' || v === null) return false;
        if (key === 'year' && String(v) === DEFAULT_YEAR) return false;
        if (['sortBy', 'sortOrder', 'limit', 'page'].includes(key)) return false;
        return true;
      }).length;
      setActiveFiltersCount(count);
    });
    return () => subscription.unsubscribe(); // ✅ تنظيف الاشتراك
  }, [watch]);
  
  // 💾 تحميل البحوث المحفوظة من التخزين المحلي
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedOrderSearches');
      if (saved) setSavedSearches(JSON.parse(saved));
    } catch (e) { 
      console.warn('Failed to load saved searches', e); 
    }
  }, []);
  
  // 🔍 تنفيذ البحث
  const onSearch = useCallback(async (filters: AdvancedSearchFilters) => {
    setIsSearching(true);
    try {
      // ✅ تحديث URL بارامترز للمشاركة — مسار موحد
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      navigate(`${SEARCH_PATH}?${params.toString()}`, { replace: true });
      
      // ✅ تنفيذ البحث عبر API
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
    
    // 🔐 تحقق أمان: منع تصدير كميات ضخمة
    if (searchResults.total > 10000) {
      alert('⚠️ عدد النتائج كبير جداً، يُفضل تطبيق فلاتر إضافية قبل التصدير');
      return;
    }
    
    setIsExporting(true);
    try {
      const filters = watch();
      const blob = await advancedSearchApi.export(filters, exportFormat);
      
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
      year: DEFAULT_YEAR,
      sortBy: 'ID',
      sortOrder: 'desc',
      limit: 50
    });
    setSearchResults(null);
    navigate(SEARCH_PATH, { replace: true }); // ✅ مسار موحد
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
  
  // 🗺️ خريطة تسميات الحقول للـ Tags
  const FILTER_LABELS = useMemo(() => ({
    customer: '👤 الزبون',
    orderId: '🔢 رقم الطلب',
    pattern: '🎨 النموذج',
    dateComeFrom: '📅 من تاريخ',
    dateComeTo: '📅 إلى تاريخ',
    isPrinted: '🖨️ مطبوع',
    isBilled: '🧾 مفوتر',
    hasVouchers: '🧾 له إيصالات'
  }), []);
  
  return (
    <div style={{ 
      direction: 'rtl', 
      padding: 20, 
      maxWidth: 1400, 
      margin: '0 auto', 
      fontFamily: 'Cairo, sans-serif' 
    }}>
      
      {/* 📍 Header */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 16, 
        marginBottom: 24,
        paddingBottom: 16, 
        borderBottom: '1px solid var(--border)'
      }}>
        <button 
          onClick={() => navigate('/orders')} 
          aria-label="العودة لقائمة الطلبات"
          style={{ 
            background: 'none', 
            border: 'none', 
            fontSize: 20, 
            cursor: 'pointer', 
            color: 'var(--ink)' 
          }}
        >←</button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>🔍 البحث المتقدم في الطلبات</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0' }}>
            ابحث عبر جميع حقول النظام مع خيارات تصفية متقدمة
          </p>
        </div>
        
        {/* 📊 إحصائيات سريعة */}
        {searchResults && (
          <div style={{ 
            marginRight: 'auto', 
            display: 'flex', 
            gap: 16, 
            background: '#f8f9fa', 
            padding: '8px 16px', 
            borderRadius: 8 
          }}>
            <span><b>{searchResults.total}</b> نتيجة</span>
            <span aria-hidden="true">•</span>
            <span>صفحة <b>{searchResults.page}</b> من <b>{searchResults.totalPages}</b></span>
          </div>
        )}
      </header>
      
      {/* 🎛️ شريط الأدوات العلوي */}
      <nav style={{ 
        display: 'flex', 
        gap: 8, 
        marginBottom: 20, 
        flexWrap: 'wrap',
        background: '#fff', 
        padding: 12, 
        borderRadius: 12, 
        border: '1px solid var(--border)'
      }}>
        <Btn 
          variant="primary" 
          type="button" 
          onClick={handleSubmit(onSearch)} 
          disabled={isSearching}
          aria-busy={isSearching}
        >
          {isSearching ? '⏳ جاري البحث...' : '🔍 تنفيذ البحث'} 
          {activeFiltersCount > 0 && `(${activeFiltersCount})`}
        </Btn>
        
        <Btn variant="outline" type="button" onClick={onReset}>🗑️ إعادة تعيين</Btn>
        
        <Btn 
          variant="outline" 
          type="button" 
          onClick={() => setShowSavedModal(true)}
          aria-haspopup="dialog"
        >
          📂 البحوث المحفوظة {savedSearches.length > 0 && `(${savedSearches.length})`}
        </Btn>
        
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} aria-hidden="true" />
        
        <label htmlFor="export-format" className="sr-only">تنسيق التصدير</label>
        <select 
          id="export-format"
          value={exportFormat} 
          onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel' | 'pdf')}
          style={{ 
            padding: '8px 12px', 
            borderRadius: 6, 
            border: '1px solid var(--border)', 
            background: '#fff' 
          }}
        >
          <option value="csv">📄 CSV</option>
          <option value="excel">📊 Excel</option>
          <option value="pdf">📕 PDF</option>
        </select>
        <Btn 
          variant="outline" 
          type="button" 
          onClick={onExport} 
          disabled={isExporting || !searchResults?.data?.length}
          aria-busy={isExporting}
        >
          {isExporting ? '⏳...' : '📤 تصدير'}
        </Btn>
        
        <div style={{ width: 1, background: 'var(--border)', margin: '0 4px' }} aria-hidden="true" />
        
        <Btn 
          variant="outline" 
          type="button" 
          onClick={() => {
            const filters = watch();
            navigator.clipboard.writeText(JSON.stringify(filters, null, 2));
            alert('✅ تم نسخ إعدادات البحث للحافظة');
          }}
          aria-label="نسخ إعدادات البحث الحالية"
        >
          📋 نسخ الإعدادات
        </Btn>
      </nav>
      
      {/* 🔄 عرض الفلاتر النشطة كـ Tags */}
      {activeFiltersCount > 0 && (
        <div style={{ 
          display: 'flex', 
          gap: 8, 
          marginBottom: 16, 
          flexWrap: 'wrap',
          padding: '8px 12px', 
          background: '#e3f2fd', 
          borderRadius: 8 
        }} role="list" aria-label="الفلاتر النشطة">
          {Object.entries(allFilters).map(([key, value]) => {
            if (value === undefined || value === '' || value === null) return null;
            if (['year', 'sortBy', 'sortOrder', 'limit'].includes(key)) return null;
            if (key === 'year' && value === DEFAULT_YEAR) return null;
            
            return (
              <span 
                key={key} 
                role="listitem"
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6,
                  padding: '4px 10px', 
                  background: '#fff', 
                  borderRadius: 16,
                  fontSize: 12, 
                  border: '1px solid #bbdefb'
                }}
              >
                {FILTER_LABELS[key as keyof typeof FILTER_LABELS] || key}: 
                <b>{String(value)}</b>
                <button 
                  onClick={() => setValue(key as keyof AdvancedSearchFilters, undefined)} 
                  aria-label={`إزالة فلتر ${key}`}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer', 
                    fontSize: 14, 
                    color: '#666',
                    padding: 0,
                    lineHeight: 1
                  }}
                >✕</button>
              </span>
            );
          })}
        </div>
      )}
      
      {/* 📋 نموذج البحث المتقدم */}
      <form onSubmit={handleSubmit(onSearch)} style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 380px', 
        gap: 20 
      }}>
        
        {/* 🎛️ أعمدة الفلاتر */}
        <section aria-label="خيارات التصفية">
          {/* 🔍 بحث نصي عام */}
          <FilterCard title="🔍 بحث نصي سريع" defaultOpen={true}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FilterGroup label="كلمة مفتاحية" hint="ابحث في جميع الحقول النصية">
                <input 
                  className="fc" 
                  {...register('query')} 
                  placeholder="اكتب للبحث..." 
                  style={{ textAlign: 'right' }} 
                  aria-label="كلمة مفتاحية للبحث"
                />
              </FilterGroup>
              <FilterGroup label="اسم الزبون">
                <input 
                  className="fc" 
                  {...register('customer')} 
                  list="search-customers" 
                  placeholder="ابحث بالاسم..." 
                  style={{ textAlign: 'right' }}
                  aria-label="اسم الزبون"
                />
                <datalist id="search-customers">
                  {customers.map((c) => (
                    <option key={c._ID} value={c.Customer} />
                  ))}
                </datalist>
              </FilterGroup>
            </div>
          </FilterCard>
          
          {/* 📋 بيانات الطلب */}
          <FilterCard title="📋 بيانات الطلب الأساسية" badge={activeFiltersCount}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <FilterGroup label="رقم الطلب">
                <input 
                  className="fc" 
                  type="number" 
                  {...register('orderId')} 
                  placeholder="4085" 
                  style={{ textAlign: 'right' }}
                  aria-label="رقم الطلب"
                />
              </FilterGroup>
              <FilterGroup label="رقم التسلسل">
                <input 
                  className="fc" 
                  type="number" 
                  {...register('serialNumber')} 
                  style={{ textAlign: 'right' }}
                  aria-label="رقم التسلسل"
                />
              </FilterGroup>
              <FilterGroup label="المرجع">
                <input 
                  className="fc" 
                  {...register('reference')} 
                  style={{ textAlign: 'right' }}
                  aria-label="المرجع"
                />
              </FilterGroup>
              <FilterGroup label="سنة العمل">
                <input 
                  className="fc" 
                  type="number" 
                  {...register('year')} 
                  min="2020" 
                  max="2030" 
                  style={{ textAlign: 'right' }}
                  aria-label="سنة العمل"
                />
              </FilterGroup>
              <FilterGroup label="من تاريخ الورود">
                <input 
                  className="fc" 
                  type="date" 
                  {...register('dateComeFrom')} 
                  style={{ textAlign: 'right' }}
                  aria-label="من تاريخ الورود"
                />
              </FilterGroup>
              <FilterGroup label="إلى تاريخ الورود">
                <input 
                  className="fc" 
                  type="date" 
                  {...register('dateComeTo')} 
                  style={{ textAlign: 'right' }}
                  aria-label="إلى تاريخ الورود"
                />
              </FilterGroup>
            </div>
          </FilterCard>
          
          {/* 🎨 مواصفات المطبوعة */}
          <FilterCard title="🎨 مواصفات المطبوعة">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              <FilterGroup label="اسم النموذج">
                <input 
                  className="fc" 
                  {...register('pattern')} 
                  placeholder="Pattern" 
                  style={{ textAlign: 'right' }}
                  aria-label="اسم النموذج"
                />
              </FilterGroup>
              <FilterGroup label="وصف النموذج">
                <input 
                  className="fc" 
                  {...register('pattern2')} 
                  placeholder="Pattern2" 
                  style={{ textAlign: 'right' }}
                  aria-label="وصف النموذج"
                />
              </FilterGroup>
              <FilterGroup label="نوع المطبوعة">
                <select 
                  className="fc" 
                  {...register('unitType')} 
                  style={{ textAlign: 'right' }}
                  aria-label="نوع المطبوعة"
                >
                  <option value="">-- الكل --</option>
                  {UNIT_TYPES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </FilterGroup>
              <FilterGroup label="الكود">
                <input 
                  className="fc" 
                  {...register('code')} 
                  style={{ textAlign: 'right' }}
                  aria-label="كود المطبوعة"
                />
              </FilterGroup>
              <FilterGroup label="الحد الأدنى للكمية">
                <input 
                  className="fc" 
                  type="number" 
                  {...register('demandMin')} 
                  style={{ textAlign: 'right' }}
                  aria-label="الحد الأدنى للكمية"
                />
              </FilterGroup>
              <FilterGroup label="الحد الأقصى للكمية">
                <input 
                  className="fc" 
                  type="number" 
                  {...register('demandMax')} 
                  style={{ textAlign: 'right' }}
                  aria-label="الحد الأقصى للكمية"
                />
              </FilterGroup>
            </div>
          </FilterCard>
          
          {/* ✅ فلاتر الحالة */}
          <FilterCard title="✅ حالة الطلب والخصائص">
            <fieldset style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(2, 1fr)', 
              gap: 10,
              border: 'none',
              padding: 0,
              margin: 0
            }}>
              <legend className="sr-only">فلاتر حالة الطلب</legend>
              {[
                { key: 'isPrinted', label: '🖨️ مطبوع' },
                { key: 'isBilled', label: '🧾 مفوتر' },
                { key: 'isDelivered', label: '🚚 مُسلَّم' },
                { key: 'hasVouchers', label: '🧾 له إيصالات' },
                { key: 'hasProblems', label: '⚠️ له مشاكل' },
                { key: 'hasCartons', label: '📦 له مواد' },
              ].map(({ key, label }) => (
                <label 
                  key={key} 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 8, 
                    padding: '8px 12px', 
                    background: '#f8f9fa', 
                    borderRadius: 6, 
                    cursor: 'pointer'
                  }}
                >
                  <input 
                    type="checkbox" 
                    {...register(key as keyof AdvancedSearchFilters)} 
                    style={{ width: 16, height: 16 }}
                    aria-label={label}
                  />
                  <span style={{ fontSize: 13 }}>{label}</span>
                </label>
              ))}
            </fieldset>
          </FilterCard>
          
          {/* ⚙️ فلاتر العمليات والمواد */}
          <FilterCard title="⚙️ العمليات والمواد">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <FilterGroup label="نوع العملية">
                <input 
                  className="fc" 
                  {...register('operationType')} 
                  placeholder="طباعة، تقطيع..." 
                  style={{ textAlign: 'right' }}
                  aria-label="نوع العملية"
                />
              </FilterGroup>
              <FilterGroup label="اسم الآلة">
                <input 
                  className="fc" 
                  {...register('machineName')} 
                  style={{ textAlign: 'right' }}
                  aria-label="اسم الآلة"
                />
              </FilterGroup>
              <FilterGroup label="المورد">
                <input 
                  className="fc" 
                  {...register('materialSupplier')} 
                  style={{ textAlign: 'right' }}
                  aria-label="اسم المورد"
                />
              </FilterGroup>
              <FilterGroup label="الحد الأدنى للسعر">
                <input 
                  className="fc" 
                  type="number" 
                  step="0.01" 
                  {...register('priceMin')} 
                  style={{ textAlign: 'right' }}
                  aria-label="الحد الأدنى للسعر"
                />
              </FilterGroup>
            </div>
          </FilterCard>
        </section>
        
        {/* ⚙️ لوحة التحكم الجانبية */}
        <aside style={{ position: 'sticky', top: 20, height: 'fit-content' }}>
          <Card style={{ padding: 16 }}>
            <h4 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 700 }}>⚙️ خيارات العرض</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FilterGroup label="ترتيب النتائج حسب">
                <select 
                  className="fc" 
                  {...register('sortBy')} 
                  style={{ textAlign: 'right' }}
                  aria-label="ترتيب النتائج حسب"
                >
                  {SORT_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </FilterGroup>
              
              <FilterGroup label="اتجاه الترتيب">
                <div style={{ display: 'flex', gap: 8 }} role="radiogroup" aria-label="اتجاه ترتيب النتائج">
                  <label style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    padding: '8px 12px', 
                    background: sortOrder === 'desc' ? '#e3f2fd' : '#f8f9fa', 
                    borderRadius: 6, 
                    cursor: 'pointer' 
                  }}>
                    <input 
                      type="radio" 
                      value="desc" 
                      {...register('sortOrder')} 
                      aria-label="ترتيب تنازلي"
                    /> 
                    تنازلي ↓
                  </label>
                  <label style={{ 
                    flex: 1, 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 6, 
                    padding: '8px 12px', 
                    background: sortOrder === 'asc' ? '#e3f2fd' : '#f8f9fa', 
                    borderRadius: 6, 
                    cursor: 'pointer' 
                  }}>
                    <input 
                      type="radio" 
                      value="asc" 
                      {...register('sortOrder')} 
                      aria-label="ترتيب تصاعدي"
                    /> 
                    تصاعدي ↑
                  </label>
                </div>
              </FilterGroup>
              
              <FilterGroup label="عدد النتائج في الصفحة">
                <select 
                  className="fc" 
                  {...register('limit', { valueAsNumber: true })} 
                  style={{ textAlign: 'right' }}
                  aria-label="عدد النتائج في الصفحة"
                >
                  <option value={25}>25 نتيجة</option>
                  <option value={50}>50 نتيجة</option>
                  <option value={100}>100 نتيجة</option>
                  <option value={200}>200 نتيجة</option>
                </select>
              </FilterGroup>
            </div>
            
            <div style={{ margin: '20px 0', borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <Btn 
                variant="primary" 
                type="submit" 
                style={{ width: '100%', marginBottom: 8 }} 
                disabled={isSearching}
                aria-busy={isSearching}
              >
                {isSearching ? '⏳ جاري البحث...' : '🔍 تنفيذ البحث'}
              </Btn>
              <Btn 
                variant="outline" 
                type="button" 
                onClick={() => setShowSavedModal(true)} 
                style={{ width: '100%' }}
                aria-haspopup="dialog"
              >
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
              <dl style={{ 
                display: 'grid', 
                gridTemplateColumns: '1fr 1fr', 
                gap: 8, 
                fontSize: 13,
                margin: 0 
              }}>
                <dt>📦 إجمالي النتائج:</dt>
                <dd style={{ fontWeight: 700, textAlign: 'left', margin: 0 }}>{searchResults.total}</dd>
                <dt>📄 الصفحات:</dt>
                <dd style={{ fontWeight: 700, textAlign: 'left', margin: 0 }}>{searchResults.totalPages}</dd>
                <dt>⏱️ وقت الاستجابة:</dt>
                <dd style={{ fontWeight: 700, textAlign: 'left', margin: 0 }}>-</dd>
              </dl>
            </Card>
          )}
        </aside>
      </form>
      
      {/* 📋 جدول النتائج */}
      {searchResults && searchResults.data.length > 0 && (
        <section style={{ marginTop: 24 }} aria-label="نتائج البحث">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: 12, 
            paddingBottom: 8, 
            borderBottom: '1px solid var(--border)'
          }}>
            <h3 style={{ margin: 0, fontSize: 16 }}>
              📋 نتائج البحث ({searchResults.data.length} من {searchResults.total})
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  const csv = [
                    ['رقم الطلب', 'الزبون', 'النموذج', 'الكمية', 'السعر', 'تاريخ الورود', 'الحالة'].join(','),
                    ...searchResults.data.map((r) => [
                      r.ID, 
                      r.Customer, 
                      r.Pattern, 
                      r.Demand, 
                      r.Price, 
                      r.date_come,
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
                }}
              >📥 تصدير سريع (CSV)</Btn>
            </div>
          </div>
          
          <div style={{ 
            overflowX: 'auto', 
            background: '#fff', 
            borderRadius: 12, 
            border: '1px solid var(--border)' 
          }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: 12 
            }}>
              <thead>
                <tr style={{ background: 'var(--steel)', color: '#fff' }}>
                  {['🔢', '👤 الزبون', '🎨 النموذج', '📦 الكمية', '💰 السعر', '📥 الورود', '📅 التسليم', '✅ الحالة', '🔗'].map(h => (
                    <th 
                      key={h} 
                      scope="col"
                      style={{ 
                        padding: '10px 12px', 
                        textAlign: 'right', 
                        fontWeight: 600, 
                        whiteSpace: 'nowrap' 
                      }}
                    >
                      <span className="sr-only">{h}</span>
                      <span aria-hidden="true">{h}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {searchResults.data.map((order, i: number) => (
                  <tr 
                    key={order._ID || order.ID || i} 
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/orders/${order.ID}/${order.Year || allFilters.year}`)}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/orders/${order.ID}/${order.Year || allFilters.year}`);
                      }
                    }}
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
                        padding: '3px 8px', 
                        borderRadius: 12, 
                        fontSize: 11,
                        background: order.Printed ? '#e8f5e9' : order.Billed ? '#fff3e0' : '#f5f5f5',
                        color: order.Printed ? '#2e7d32' : order.Billed ? '#ef6c00' : '#666'
                      }}>
                        {order.Printed ? '🖨️' : order.Billed ? '🧾' : '⏳'} 
                        {order.Printed ? 'مطبوع' : order.Billed ? 'مفوتر' : 'قيد المعالجة'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <button 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontSize: 16, 
                          color: 'var(--steel)', 
                          padding: 4 
                        }} 
                        title="عرض التفاصيل"
                        aria-label={`عرض تفاصيل الطلب ${order.ID}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders/${order.ID}/${order.Year || allFilters.year}`);
                        }}
                      >👁️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 📄 Pagination */}
          {searchResults.totalPages > 1 && (
            <nav style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 4, 
              marginTop: 16 
            }} aria-label="ترقيم الصفحات">
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
                  aria-current={page === searchResults.page ? 'page' : undefined}
                  style={{
                    width: 32, 
                    height: 32, 
                    borderRadius: 6, 
                    border: 'none',
                    background: page === searchResults.page ? 'var(--steel)' : '#fff',
                    color: page === searchResults.page ? '#fff' : 'var(--ink)',
                    cursor: 'pointer', 
                    fontWeight: page === searchResults.page ? 700 : 400,
                    border: page === searchResults.page ? 'none' : '1px solid var(--border)'
                  }}
                >{page}</button>
              ))}
            </nav>
          )}
        </section>
      )}
      
      {/* 📂 Modal: البحوث المحفوظة */}
      {showSavedModal && (
        <div 
          onClick={() => setShowSavedModal(false)} 
          style={{
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(0,0,0,0.5)', 
            zIndex: 700,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            direction: 'rtl'
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="saved-searches-title"
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{
              background: '#fff', 
              borderRadius: 16, 
              padding: 24, 
              width: 520, 
              maxWidth: '95vw',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}
          >
            <h3 
              id="saved-searches-title"
              style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginBottom: 16, 
                textAlign: 'right' 
              }}
            >📂 البحوث المحفوظة</h3>
            
            {savedSearches.length === 0 ? (
              <p style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>
                لا توجد بحوث محفوظة — احفظ بحثك الحالي للوصول إليه لاحقاً
              </p>
            ) : (
              <div style={{ maxHeight: 300, overflowY: 'auto', marginBottom: 16 }}>
                {savedSearches.map(search => (
                  <div 
                    key={search.id} 
                    style={{
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '10px 12px', 
                      borderBottom: '1px solid var(--border)',
                      background: '#fafafa', 
                      borderRadius: 8, 
                      marginBottom: 8
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600 }}>{search.name}</div>
                      <small style={{ color: 'var(--muted)' }}>
                        {new Date(search.createdAt).toLocaleDateString('ar-SA')}
                      </small>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button 
                        onClick={() => onLoadSavedSearch(search)} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: '#27ae60', 
                          fontSize: 16,
                          padding: 4
                        }}
                        aria-label={`تحميل البحث ${search.name}`}
                      >📥</button>
                      <button 
                        onClick={() => onDeleteSavedSearch(search.id)} 
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          color: '#e74c3c', 
                          fontSize: 16,
                          padding: 4
                        }}
                        aria-label={`حذف البحث ${search.name}`}
                      >🗑️</button>
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
                aria-label="اسم البحث الجديد"
              />
              <Btn 
                variant="primary" 
                type="button" 
                onClick={onSaveSearch} 
                disabled={!newSearchName.trim()}
              >حفظ</Btn>
            </div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Btn variant="outline" type="button" onClick={() => setShowSavedModal(false)}>إغلاق</Btn>
            </div>
          </div>
        </div>
      )}
      
      {/* ⏳ Loading Overlay */}
      {isSearching && (
        <div 
          style={{
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(255,255,255,0.9)', 
            zIndex: 800, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            flexDirection: 'column', 
            gap: 12
          }}
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <div style={{ 
            width: 40, 
            height: 40, 
            border: '4px solid var(--border)', 
            borderTopColor: 'var(--steel)', 
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} aria-hidden="true" />
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
            جاري البحث في قاعدة البيانات...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}
      
      {/* 🎨 Styles مساعدة للشاشات */}
      <style>{`
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
      
    </div>
  );
}
