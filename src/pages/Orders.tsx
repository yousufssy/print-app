import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders, useDeleteOrder } from '../hooks/useApi';
import { StatusBadge, getOrderStatus, Loading, Btn, Card } from '../components/ui';
import type { OrderListItem } from '../types';

// ── Confirm Delete Modal ───────────────────────────────
function DeleteModal({
  order,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  order: OrderListItem;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.45)',
        zIndex: 500,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="fade-up"
        style={{
          background: '#fff', borderRadius: 16,
          padding: 28, width: 420, maxWidth: '92vw',
          boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        }}
      >
        {/* Icon + title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(192,57,43,.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26,
          }}>
            🗑
          </div>
          <h3 style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)', textAlign: 'center' }}>
            تأكيد الحذف
          </h3>
        </div>

        {/* Order info */}
        <div style={{
          background: 'var(--paper)', borderRadius: 10,
          padding: '12px 16px', marginBottom: 20,
          border: '1px solid var(--border)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>رقم الطلب</span>
            <span style={{
              fontWeight: 700, color: 'var(--blue)',
              background: 'rgba(26,82,118,.08)',
              padding: '2px 8px', borderRadius: 4, fontSize: 13,
            }}>
              {order.ID}
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>الزبون</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{order.Customer || '—'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>المطبوعة</span>
            <span style={{ fontSize: 13, color: 'var(--steel)' }}>{order.Eng_Name || '—'}</span>
          </div>
        </div>

        <p style={{ fontSize: 13, color: 'var(--muted)', textAlign: 'center', marginBottom: 22, lineHeight: 1.6 }}>
          هذا الإجراء <strong style={{ color: 'var(--red)' }}>لا يمكن التراجع عنه</strong>. سيتم حذف الطلب وجميع بياناته نهائياً.
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              border: '1.5px solid var(--border)',
              background: 'transparent', color: 'var(--steel)',
              fontFamily: 'Cairo', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', transition: 'all .18s',
            }}
          >
            إلغاء
          </button>
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 9,
              border: 'none',
              background: isDeleting ? '#e88' : 'var(--red)',
              color: '#fff',
              fontFamily: 'Cairo', fontSize: 13, fontWeight: 700,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'all .18s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            }}
          >
            {isDeleting ? (
              <>
                <span style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,.4)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin .7s linear infinite',
                  display: 'inline-block',
                }} />
                جاري الحذف...
              </>
            ) : '🗑 حذف نهائي'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status filter pills ───────────────────────────────
const STATUSES = [
  { value: '',          label: 'الكل'       },
  { value: 'new',       label: 'جديد'       },
  { value: 'printed',   label: 'مطبوعة'     },
  { value: 'billed',    label: 'لها فاتورة' },
  { value: 'delivered', label: 'مستلمة'     },
];

// ── Main page ─────────────────────────────────────────
export default function OrdersPage() {
  const navigate    = useNavigate();
  const deleteOrder = useDeleteOrder();

  const [Year,        setYear]        = useState(String(new Date().getFullYear()));
  const [q,           setQ]           = useState('');
  const [status,      setStatus]      = useState('');
  const [page,        setPage]        = useState(1);
  const [search,      setSearch]      = useState('');
  const [toDelete,    setToDelete]    = useState<OrderListItem | null>(null);

  const { data, isLoading } = useOrders({ Year, q: search, page, status });

  const handleSearch = useCallback((val: string) => {
    setQ(val);
    const t = setTimeout(() => { setSearch(val); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, []);

  const confirmDelete = () => {
    if (!toDelete) return;
    deleteOrder.mutate(
      { id: toDelete.ID, Year: toDelete.Year },
      { onSettled: () => setToDelete(null) }
    );
  };

  const Years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div>
      {/* Delete confirm modal */}
      {toDelete && (
        <DeleteModal
          order={toDelete}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
          isDeleting={deleteOrder.isPending}
        />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>
          📋 أوامر الطباعة
          {data && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginRight: 8 }}>
              ({data.total.toLocaleString('ar')} سجل)
            </span>
          )}
        </h1>
        <Btn variant="primary" onClick={() => navigate('/orders/new')}>➕ طلب جديد</Btn>
      </div>

      <Card noPad>
        {/* Filters */}
        <div style={{
          padding: '14px 16px',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 300 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>
              🔎
            </span>
            <input
              className="fc"
              value={q}
              onChange={e => handleSearch(e.target.value)}
              placeholder="بحث برقم الأمر أو الزبون..."
              style={{ paddingLeft: 32 }}
            />
          </div>

          {/* Year */}
          <select
            className="fc"
            value={Year}
            onChange={e => { setYear(e.target.value); setPage(1); }}
            style={{ width: 100 }}
          >
            {Years.map(y => <option key={y}>{y}</option>)}
          </select>

          {/* Status pills */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {STATUSES.map(s => (
              <button
                key={s.value}
                onClick={() => { setStatus(s.value); setPage(1); }}
                style={{
                  padding: '6px 12px', borderRadius: 7,
                  fontSize: 12, fontWeight: 600,
                  border: `1.5px solid ${status === s.value ? 'var(--red)' : 'var(--border)'}`,
                  background: status === s.value ? 'var(--red)' : 'transparent',
                  color: status === s.value ? '#fff' : 'var(--steel)',
                  cursor: 'pointer', transition: '.18s', fontFamily: 'Cairo',
                }}
              >
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
                    <th key={h} style={{
                      padding: '11px 12px', fontWeight: 600,
                      fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data?.data?.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>
                      لا توجد نتائج
                    </td>
                  </tr>
                )}
                {data?.data?.map( o => (
                  <tr
                    key={`${o.ID}-${o.Year}`}
                    onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fdf8f0'}
                    onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                  >
                    {/* Order ID */}
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        fontWeight: 700, color: 'var(--blue)',
                        background: 'rgba(26,82,118,.08)',
                        padding: '2px 7px', borderRadius: 4,
                      }}>
                        {o.ID}
                      </span>
                    </td>

                    <td style={{ padding: '10px 12px' }}>{o.Year}</td>

                    <td style={{ padding: '10px 12px', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.Customer || '—'}
                    </td>

                    <td style={{ padding: '10px 12px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {o.Eng_Name || '—'}
                    </td>

                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{o.date_come || '—'}</td>
                    <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>{o.Apoent_Delv_date || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>{Number(o.Demand || 0).toLocaleString('ar')}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{o.Clr_qunt || '—'}</td>
                    <td style={{ padding: '10px 12px' }}><StatusBadge status={getOrderStatus(o)} /></td>

                    {/* Actions — stopPropagation so row click doesn't fire */}
                    <td style={{ padding: '10px 12px' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                        <Btn size="sm" onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}>
                          ✏️ تعديل
                        </Btn>
                        <button
                          onClick={() => setToDelete(o)}
                          title="حذف الطلب"
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 7,
                            border: '1.5px solid rgba(192,57,43,.25)',
                            background: 'rgba(192,57,43,.06)',
                            color: 'var(--red)',
                            fontSize: 14, cursor: 'pointer',
                            transition: 'all .18s',
                            flexShrink: 0,
                          }}
                          onMouseEnter={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'var(--red)';
                            (e.currentTarget as HTMLButtonElement).style.color = '#fff';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--red)';
                          }}
                          onMouseLeave={e => {
                            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(192,57,43,.06)';
                            (e.currentTarget as HTMLButtonElement).style.color = 'var(--red)';
                            (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(192,57,43,.25)';
                          }}
                        >
                          🗑
                        </button>
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
          <div style={{
            display: 'flex', gap: 6, justifyContent: 'flex-end',
            padding: '12px 16px', alignItems: 'center',
            borderTop: '1px solid var(--border)',
          }}>
            {page > 1 && <Btn size="sm" onClick={() => setPage(p => Number(p) - 1)}>‹ السابق</Btn>}
            {Array.from({ length: Math.min(5, data.last_page) }, (_, i) => {
              const p = Math.max(1, Math.min(Number(page) - 2, Number(data.last_page) - 4)) + i;
              return (
                <button key={p} onClick={() => setPage(p)} style={{
                  padding: '5px 10px', borderRadius: 7,
                  border: `1.5px solid ${p === page ? 'var(--red)' : 'var(--border)'}`,
                  background: p === page ? 'var(--red)' : '#fff',
                  color: p === page ? '#fff' : 'var(--steel)',
                  fontFamily: 'Cairo', fontSize: 12, cursor: 'pointer',
                }}>
                  {p}
                </button>
              );
            })}
            {page < data.last_page && <Btn size="sm" onClick={() => setPage(p => Number(p) + 1)}>التالي ›</Btn>}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>
              صفحة {page} من {data.last_page}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}
