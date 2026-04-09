import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, useDeleteOrder } from '../hooks/useApi';
import { StatusBadge, getOrderStatus, Loading, Btn, Card } from '../components/ui';
import { useAuthStore } from '../store/authStore';

const STATUSES = [
  { value: '', label: 'الكل' },
  { value: 'new', label: 'جديد' },
  { value: 'printed', label: 'مطبوعة' },
  { value: 'billed', label: 'لها فاتورة' },
  { value: 'delivered', label: 'مستلمة' },
];

export default function OrdersPage() {
  const navigate  = useNavigate();
  const { isAdmin } = useAuthStore();
  const deleteOrder = useDeleteOrder();

  const [year,   setYear]   = useState(String(new Date().getFullYear()));
  const [q,      setQ]      = useState('');
  const [status, setStatus] = useState('');
  const [page,   setPage]   = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useOrders({ year, q: search, page, status });

  const handleSearch = useCallback((val: string) => {
    setQ(val);
    const t = setTimeout(() => { setSearch(val); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, []);

  const handleDelete = async (id: string, year: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('هل تريد حذف هذا الطلب؟')) return;
    deleteOrder.mutate({ id, year });
  };

  const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>📋 أوامر الطباعة
          {data && <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginRight: 8 }}>({data.total.toLocaleString('ar')} سجل)</span>}
        </h1>
        <Btn variant="primary" onClick={() => navigate('/orders/new')}>➕ طلب جديد</Btn>
      </div>

      <Card noPad>
        {/* Filters */}
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔎</span>
            <input className="fc" value={q} onChange={e => handleSearch(e.target.value)}
              placeholder="بحث برقم الأمر أو الزبون..."
              style={{ paddingLeft: 32 }} />
          </div>
          <select className="fc" value={year} onChange={e => { setYear(e.target.value); setPage(1); }} style={{ width: 100 }}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <div style={{ display: 'flex', gap: 4 }}>
            {STATUSES.map(s => (
              <button key={s.value} onClick={() => { setStatus(s.value); setPage(1); }}
                style={{
                  padding: '6px 12px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${status === s.value ? 'var(--red)' : 'var(--border)'}`,
                  background: status === s.value ? 'var(--red)' : 'transparent',
                  color: status === s.value ? '#fff' : 'var(--steel)',
                  cursor: 'pointer', transition: '.18s', fontFamily: 'Cairo',
                }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? <Loading /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead style={{ background: 'var(--steel)', color: '#fff' }}>
                <tr>
                  {['رقم الأمر','السنة','الزبون','المطبوعة','تاريخ الورود','موعد التسليم','الكمية','الألوان','الحالة','إجراء'].map(h => (
                    <th key={h} style={{ padding: '11px 12px', fontWeight: 600, fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>لا توجد نتائج</td></tr>
                )}
                {data?.data?.map(o => (
                  <tr key={o.ID} onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fdf8f0'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontWeight: 700, color: 'var(--blue)', background: 'rgba(26,82,118,.08)', padding: '2px 7px', borderRadius: 4 }}>{o.ID}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>{o.Year}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Customer || '—'}</td>
                    <td style={{ padding: '10px 12px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.Eng_Name || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{o.date_come || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{o.Apoent_Delv_date || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{Number(o.Demand || 0).toLocaleString('ar')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{o.Clr_qunt || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><StatusBadge status={getOrderStatus(o)} /></td>
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <Btn size="sm" onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}>تعديل</Btn>
                        {isAdmin() && (
                          <Btn size="sm" variant="danger" onClick={(e) => handleDelete(o.ID, o.Year, e)}>🗑</Btn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {data && data.last_page > 1 && (
          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', padding: '12px 16px', alignItems: 'center' }}>
            {page > 1 && <Btn size="sm" onClick={() => setPage(p => p - 1)}>‹ السابق</Btn>}
            {Array.from({ length: Math.min(5, data.last_page) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, data.last_page - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: '5px 10px', borderRadius: 7,
                  border: `1.5px solid ${p === page ? 'var(--red)' : 'var(--border)'}`,
                  background: p === page ? 'var(--red)' : '#fff',
                  color: p === page ? '#fff' : 'var(--steel)',
                  fontFamily: 'Cairo', fontSize: 12, cursor: 'pointer',
                }}>{p}</button>
              );
            })}
            {page < data.last_page && <Btn size="sm" onClick={() => setPage(p => p + 1)}>التالي ›</Btn>}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>صفحة {page} من {data.last_page}</span>
          </div>
        )}
      </Card>
    </div>
  );
}
