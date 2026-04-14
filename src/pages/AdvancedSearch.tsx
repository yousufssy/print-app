// 📁 components/AdvancedSearch.tsx
import React, { useState, useEffect } from 'react';
import { OrderSearchFilters } from '../types';
import { Btn, FormGroup, SectionDiv } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: OrderSearchFilters) => void;
  onReset: () => void;
  currentFilters?: OrderSearchFilters;
  customers?: Array<{ Customer: string }>;
  units?: string[];
}

export default function AdvancedSearch({
  isOpen, onClose, onSearch, onReset, 
  currentFilters = {}, customers = [], units = []
}: Props) {
  const [filters, setFilters] = useState<OrderSearchFilters>(currentFilters);
  
  // ✅ مزامنة الفلاتر عند تغييرها من الخارج
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  // ✅ حفظ/استعادة الفلاتر من localStorage
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('orderAdvancedSearch');
      if (saved) {
        try {
          setFilters(prev => ({ ...prev, ...JSON.parse(saved) }));
        } catch (e) { console.warn('Failed to load search filters', e); }
      }
    }
  }, [isOpen]);

  const saveFilters = () => {
    localStorage.setItem('orderAdvancedSearch', JSON.stringify(filters));
  };

  const handleChange = (key: keyof OrderSearchFilters) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value;
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const handleApply = () => {
    saveFilters();
    onSearch(filters);
    onClose();
  };

  const handleClear = () => {
    const empty: OrderSearchFilters = { 
      sortBy: 'ID', sortOrder: 'desc' // ✅ الاحتفاظ بفرز افتراضي
    };
    setFilters(empty);
    localStorage.removeItem('orderAdvancedSearch');
    onReset();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, 
        background: 'rgba(0,0,0,0.5)', 
        zIndex: 600,
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        direction: 'rtl'
      }}
    >
      <div 
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 24,
          width: 720,
          maxWidth: '95vw',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          fontFamily: 'Cairo, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 20,
          paddingBottom: 12,
          borderBottom: '1px solid var(--border)'
        }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>🔍 بحث متقدم في الطلبات</h3>
          <button 
            onClick={onClose}
            style={{ 
              background: 'none', border: 'none', 
              fontSize: 24, cursor: 'pointer', 
              color: 'var(--muted)', lineHeight: 1 
            }}
          >✕</button>
        </div>

        {/* Section 1: البيانات الأساسية */}
        <SectionDiv label="📋 البيانات الأساسية" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          <FormGroup label="رقم الطلب">
            <input 
              className="fc" 
              type="number"
              value={filters.id || ''} 
              onChange={handleChange('id')}
              placeholder="مثال: 4085"
              style={{ textAlign: 'right' }}
            />
          </FormGroup>
          <FormGroup label="اسم الزبون">
            <input 
              className="fc" 
              value={filters.customer || ''} 
              onChange={handleChange('customer')}
              placeholder="ابحث بالاسم..."
              list="search-cust-list"
              style={{ textAlign: 'right' }}
            />
            <datalist id="search-cust-list">
              {customers.map(c => <option key={c.Customer} value={c.Customer} />)}
            </datalist>
          </FormGroup>
          <FormGroup label="نموذج/وصف">
            <input 
              className="fc" 
              value={filters.pattern || ''} 
              onChange={handleChange('pattern')}
              placeholder="اسم النموذج أو الوصف"
              style={{ textAlign: 'right' }}
            />
          </FormGroup>
          <FormGroup label="نوع المطبوعة">
            <select 
              className="fc" 
              value={filters.unit || ''} 
              onChange={handleChange('unit')}
              style={{ textAlign: 'right' }}
            >
              <option value="">-- الكل --</option>
              {units.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </FormGroup>
        </div>

        {/* Section 2: التواريخ */}
        <SectionDiv label="📅 نطاق التواريخ" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          <FormGroup label="من تاريخ">
            <input 
              className="fc" 
              type="date"
              value={filters.dateFrom || ''} 
              onChange={handleChange('dateFrom')}
              style={{ textAlign: 'right' }}
            />
          </FormGroup>
          <FormGroup label="إلى تاريخ">
            <input 
              className="fc" 
              type="date"
              value={filters.dateTo || ''} 
              onChange={handleChange('dateTo')}
              style={{ textAlign: 'right' }}
            />
          </FormGroup>
          <FormGroup label="سنة العمل">
            <input 
              className="fc" 
              type="number"
              value={filters.year || new Date().getFullYear()} 
              onChange={handleChange('year')}
              min="2020" max="2030"
              style={{ textAlign: 'right' }}
            />
          </FormGroup>
        </div>

        {/* Section 3: الحالة والخصائص */}
        <SectionDiv label="⚙️ الحالة والخصائص" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 16 }}>
          <FormGroup label="حالة الطلب">
            <select 
              className="fc" 
              value={filters.status || 'all'} 
              onChange={handleChange('status')}
              style={{ textAlign: 'right' }}
            >
              <option value="all">✓ جميع الحالات</option>
              <option value="pending">⏳ قيد المعالجة</option>
              <option value="printed">🖨️ مطبوع</option>
              <option value="billed">🧾 مفوتر</option>
              <option value="delivered">🚚 مُسلَّم</option>
            </select>
          </FormGroup>
          <FormGroup label="ترتيب حسب">
            <select 
              className="fc" 
              value={filters.sortBy || 'ID'} 
              onChange={handleChange('sortBy')}
              style={{ textAlign: 'right' }}
            >
              <option value="ID">🔢 رقم الطلب</option>
              <option value="date_come">📥 تاريخ الورود</option>
              <option value="Apoent_Delv_date">📅 موعد التسليم</option>
              <option value="Demand">📦 الكمية المطلوبة</option>
            </select>
          </FormGroup>
          
          {/* Checkboxes */}
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 20, paddingTop: 8 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input 
                type="checkbox" 
                checked={!!filters.hasVouchers} 
                onChange={handleChange('hasVouchers')}
                style={{ width: 16, height: 16 }}
              />
              <span>🧾 له إيصالات</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 13 }}>
              <input 
                type="checkbox" 
                checked={!!filters.hasProblems} 
                onChange={handleChange('hasProblems')}
                style={{ width: 16, height: 16 }}
              />
              <span>⚠️ له مشاكل مسجلة</span>
            </label>
          </div>
        </div>

        {/* Footer Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: 10, 
          justifyContent: 'flex-end',
          paddingTop: 16,
          borderTop: '1px solid var(--border)'
        }}>
          <Btn variant="outline" type="button" onClick={handleClear}>
            🗑️ مسح الكل
          </Btn>
          <Btn variant="outline" type="button" onClick={onClose}>
            إلغاء
          </Btn>
          <Btn variant="primary" type="button" onClick={handleApply}>
            🔍 تطبيق البحث
          </Btn>
        </div>
      </div>
    </div>
  );
}