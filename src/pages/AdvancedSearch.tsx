// 📁 pages/AdvancedSearchPage.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { advancedSearchApi } from '../api/searchService';
import type { 
  AdvancedSearchFilters, 
  AdvancedSearchResult, 
  SavedSearch,
  Customer 
} from '../types/search';
import { Btn, FormGroup, SectionDiv, Card } from '../components/ui';

// ── ثوابت المسارات والإعدادات ──────────────────────────────────────────────
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
      Year: DEFAULT_YEAR, // ✅ تغيير من year إلى Year
      sortBy: 'ID',
      sortOrder: 'desc',
      limit: 50
    }
  });

  // ✅ useWatch لعرض الفلاتر النشطة بدون re-render غير ضروري
  const allFilters = useWatch({ control });
  const sortOrder = allFilters.sortOrder;
  
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
    staleTime: 5 * 60 * 1000,
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
  
  // 🔍 حساب عدد الفلاتر النشطة
  useEffect(() => {
    const subscription = watch((values) => {
      const count = Object.entries(values || {}).filter(([key, v]) => {
        if (v === undefined || v === '' || v === null) return false;
        if (key === 'Year' && String(v) === DEFAULT_YEAR) return false; // ✅ تغيير من year
        if (['sortBy', 'sortOrder', 'limit', 'page'].includes(key)) return false;
        return true;
      }).length;
      setActiveFiltersCount(count);
    });
    return () => subscription.unsubscribe();
  }, [watch]);
  
  // 💾 تحميل البحوث المحفوظة
  useEffect(() => {
    try {
      const saved = localStorage.getItem('savedOrderSearches');
      if (saved) setSavedSearches(JSON.parse(saved));
    } catch (e) { 
      console.warn('Failed to load saved searches', e); 
    }
  }, []);
  
  // 🔍 تنفيذ البحث - ✅ إصلاح المسار
  const onSearch = useCallback(async (filters: AdvancedSearchFilters) => {
    setIsSearching(true);
    try {
      // ✅ لا تغيير المسار - البقاء في صفحة البحث
      // فقط تحديث الـ URL params للمشاركة
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== '') params.set(k, String(v));
      });
      
      // ✅ استخدام replace للحفاظ على المسار الحالي
      navigate(`?${params.toString()}`, { replace: true });
      
      // ✅ تنفيذ البحث عبر API
      const result = await advancedSearchApi.search(filters);
      
      // ✅ تحويل last_page إلى totalPages
      setSearchResults({
        ...result,
        totalPages: result.last_page || Math.ceil(result.total / (filters.limit || 50))
      });
      
      // حفظ الفلاتر
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
    const newSearch: SavedSearch = {
      id: Date.now().toString(),
      name: newSearchName,
      filters,
      createdAt: new Date().toISOString()
    };
    
    const updated = [...savedSearches, newSearch];
    setSavedSearches(updated);
    localStorage.setItem('savedOrderSearches', JSON.stringify(updated));
    setNewSearchName('');
    alert('✅ تم حفظ البحث بنجاح');
  };
  
  // 📥 تحميل بحث محفوظ
  const onLoadSavedSearch = (search: SavedSearch) => {
    reset(search.filters);
    setShowSavedModal(false);
    handleSubmit(onSearch)();
  };
  
  // 🗑️ حذف بحث محفوظ
  const onDeleteSavedSearch = (id: string) => {
    if (!confirm('هل تريد حذف هذا البحث؟')) return;
    const updated = savedSearches.filter(s => s.id !== id);
    setSavedSearches(updated);
    localStorage.setItem('savedOrderSearches', JSON.stringify(updated));
  };
  
  // 📤 تصدير النتائج
  const onExport = async () => {
    if (!searchResults?.data.length) {
      alert('⚠️ لا توجد نتائج للتصدير');
      return;
    }
    
    setIsExporting(true);
    try {
      const filters = watch();
      await advancedSearchApi.export(filters, exportFormat);
      alert('✅ تم تصدير النتائج بنجاح');
    } catch (error: any) {
      console.error('Export failed:', error);
      alert('❌ فشل التصدير: ' + (error.message || 'خطأ غير معروف'));
    } finally {
      setIsExporting(false);
    }
  };
  
  // 🔄 إعادة تعيين النموذج
  const onReset = () => {
    reset({
      Year: DEFAULT_YEAR, // ✅ تغيير من year
      sortBy: 'ID',
      sortOrder: 'desc',
      limit: 50
    });
    setSearchResults(null);
    navigate('', { replace: true });
  };
  
  // ⌨️ البحث السريع عند الضغط على Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        handleSubmit(onSearch)();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit, onSearch]);
  
  return (
    <div style={{ 
      maxWidth: 1600, 
      margin: '0 auto', 
      padding: '20px', 
      direction: 'rtl', 
      fontFamily: 'Cairo, sans-serif' 
    }}>
      
      {/* 🎯 Header */}
      <header style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 24 
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            🔍 البحث المتقدم في الطلبات
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>
            ابحث عن الطلبات باستخدام فلاتر متقدمة ومعايير دقيقة
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn 
            variant="outline" 
            type="button" 
            onClick={() => setShowSavedModal(true)}
            title="البحوث المحفوظة"
          >
            📂 البحوث المحفوظة ({savedSearches.length})
          </Btn>
          
          <Btn 
            variant="outline" 
            type="button" 
            onClick={() => navigate('/orders')}
            title="العودة للقائمة الرئيسية"
          >
            ← العودة
          </Btn>
        </div>
      </header>
      
      {/* 📋 نموذج البحث */}
      <form onSubmit={handleSubmit(onSearch)} style={{ marginBottom: 20 }}>
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: 12 
        }}>
          
          {/* 📌 معلومات أساسية */}
          <FilterCard title="📌 معلومات أساسية" badge={activeFiltersCount}>
            
            <FilterGroup label="رقم الطلب">
              <input 
                className="fc" 
                type="number" 
                placeholder="أدخل رقم الطلب..."
                {...register('ID')}
                style={{ textAlign: 'right' }}
              />
            </FilterGroup>
            
            <FilterGroup label="اسم الزبون">
              {isLoadingCustomers ? (
                <input className="fc" disabled placeholder="جاري التحميل..." />
              ) : (
                <select className="fc" {...register('Customer')} style={{ textAlign: 'right' }}>
                  <option value="">-- اختر زبون --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
              )}
            </FilterGroup>
            
            <FilterGroup label="البيان / الطلب">
              <input 
                className="fc" 
                placeholder="مثال: علب كرتون، بروشور..."
                {...register('Demand')}
                style={{ textAlign: 'right' }}
              />
            </FilterGroup>
            
            <FilterGroup label="السنة">
              <input 
                className="fc" 
                type="number" 
                placeholder="2024"
                {...register('Year')} 
                style={{ textAlign: 'right' }}
              />
            </FilterGroup>
            
          </FilterCard>
          
          {/* 📅 تواريخ */}
          <FilterCard title="📅 الفترة الزمنية">
            
            <FilterGroup label="تاريخ الورود من">
              <input className="fc" type="date" {...register('date_from')} />
            </FilterGroup>
            
            <FilterGroup label="تاريخ الورود إلى">
              <input className="fc" type="date" {...register('date_to')} />
            </FilterGroup>
            
          </FilterCard>
          
          {/* ✅ حالة الطلب */}
          <FilterCard title="✅ حالة الطلب">
            
            <FilterGroup label="حالة الطباعة">
              <select className="fc" {...register('Printed')} style={{ textAlign: 'right' }}>
                <option value="">-- الكل --</option>
                <option value="1">مطبوع ✅</option>
                <option value="0">غير مطبوع ❌</option>
              </select>
            </FilterGroup>
            
            <FilterGroup label="حالة الفوترة">
              <select className="fc" {...register('Billed')} style={{ textAlign: 'right' }}>
                <option value="">-- الكل --</option>
                <option value="1">مفوتر ✅</option>
                <option value="0">غير مفوتر ❌</option>
              </select>
            </FilterGroup>
            
          </FilterCard>
          
          {/* ⚙️ إعدادات العرض */}
          <FilterCard title="⚙️ الترتيب والعرض" defaultOpen={false}>
            
            <FilterGroup label="ترتيب حسب">
              <select className="fc" {...register('sortBy')} style={{ textAlign: 'right' }}>
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FilterGroup>
            
            <FilterGroup label="نوع الترتيب">
              <div style={{ display: 'flex', gap: 8, direction: 'rtl' }}>
                <label style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  border: '1px solid var(--border)', 
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: sortOrder === 'desc' ? 'var(--steel)' : '#fff',
                  color: sortOrder === 'desc' ? '#fff' : 'var(--ink)',
                  textAlign: 'center',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}>
                  <input 
                    type="radio" 
                    value="desc" 
                    {...register('sortOrder')} 
                    style={{ display: 'none' }}
                  />
                  ⬇️ تنازلي
                </label>
                
                <label style={{ 
                  flex: 1, 
                  padding: '8px 12px', 
                  border: '1px solid var(--border)', 
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: sortOrder === 'asc' ? 'var(--steel)' : '#fff',
                  color: sortOrder === 'asc' ? '#fff' : 'var(--ink)',
                  textAlign: 'center',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}>
                  <input 
                    type="radio" 
                    value="asc" 
                    {...register('sortOrder')} 
                    style={{ display: 'none' }}
                  />
                  ⬆️ تصاعدي
                </label>
              </div>
            </FilterGroup>
            
            <FilterGroup label="عدد النتائج في الصفحة">
              <select className="fc" {...register('limit')} style={{ textAlign: 'right' }}>
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </FilterGroup>
            
          </FilterCard>
        </div>
        
        {/* 🎮 أزرار التحكم */}
        <div style={{ 
          display: 'flex', 
          gap: 10, 
          justifyContent: 'flex-end', 
          marginTop: 20,
          flexWrap: 'wrap'
        }}>
          <Btn 
            variant="outline" 
            type="button" 
            onClick={onReset}
          >
            🔄 إعادة تعيين
          </Btn>
          
          <Btn 
            variant="primary" 
            type="submit"
            disabled={isSearching}
          >
            {isSearching ? '⏳ جاري البحث...' : '🔍 بحث'}
          </Btn>
        </div>
        
      </form>
      
      {/* 📊 نتائج البحث */}
      {searchResults && (
        <section style={{ 
          background: '#fff', 
          borderRadius: 12, 
          padding: 20, 
          border: '1px solid var(--border)' 
        }}>
          
          {/* 📈 عداد النتائج + تصدير */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: 16,
            paddingBottom: 12,
            borderBottom: '1px solid var(--border)'
          }}>
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700 }}>
                📋 النتائج ({searchResults.total} طلب)
              </h2>
              <small style={{ color: 'var(--muted)' }}>
                الصفحة {searchResults.page} من {searchResults.totalPages || searchResults.last_page}
              </small>
            </div>
            
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select 
                className="fc" 
                value={exportFormat} 
                onChange={(e) => setExportFormat(e.target.value as any)}
                style={{ width: 'auto', padding: '6px 10px', fontSize: 13 }}
              >
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
                <option value="pdf">PDF</option>
              </select>
              
              <Btn 
                variant="outline" 
                type="button" 
                onClick={onExport}
                disabled={isExporting || !searchResults.data.length}
              >
                {isExporting ? '⏳ جاري التصدير...' : `📤 تصدير ${exportFormat.toUpperCase()}`}
              </Btn>
            </div>
          </div>
          
          {/* 📄 الجدول */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse', 
              fontSize: 13 
            }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>رقم الطلب</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>السنة</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>الزبون</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>البيان</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>تاريخ الورود</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>موعد التسليم</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>الكمية</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>السعر</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>الحالة</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {searchResults.data.map((order, idx) => (
                  <tr 
                    key={`${order.ID}-${order.Year}`}
                    style={{ 
                      borderBottom: '1px solid var(--border)',
                      background: idx % 2 === 0 ? '#fff' : '#fafafa',
                      cursor: 'pointer',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#f0f7ff'}
                    onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}
                    onClick={() => navigate(`/orders/${order.ID}/${order.Year || allFilters.Year}`)}
                  >
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{order.ID}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Year}</td>
                    <td style={{ padding: '10px 12px' }}>{order.Customer}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {order.Demand}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12 }}>
                      {order.date_come ? new Date(order.date_come).toLocaleDateString('ar-SA') : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 12 }}>
                      {order.Apoent_Delv_date ? new Date(order.Apoent_Delv_date).toLocaleDateString('ar-SA') : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{order.Demand}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600 }}>
                      {order.Price ? `${order.Price.toLocaleString()} ل.س` : '-'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 8px',
                        borderRadius: 6,
                        fontSize: 11,
                        fontWeight: 600,
                        background: order.Printed ? '#d4edda' : order.Billed ? '#fff3cd' : '#f8d7da',
                        color: order.Printed ? '#155724' : order.Billed ? '#856404' : '#721c24'
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
                          navigate(`/orders/${order.ID}/${order.Year || allFilters.Year}`);
                        }}
                      >👁️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* 📄 Pagination */}
          {(searchResults.totalPages || searchResults.last_page) > 1 && (
            <nav style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              gap: 4, 
              marginTop: 16 
            }} aria-label="ترقيم الصفحات">
              {Array.from({ length: searchResults.totalPages || searchResults.last_page }, (_, i) => i + 1).slice(
                Math.max(0, searchResults.page - 3), 
                Math.min(searchResults.totalPages || searchResults.last_page, searchResults.page + 2)
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
      
      {/* 🎨 Styles */}
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
