import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useApi';
import { Loading, Btn, Card, StatCard } from '../components/ui';
import type { OrderListItem } from '../types';

// ── Delivery status helpers ───────────────────────────
type DelivStatus = 'delivered' | 'billed' | 'pending';

function getDelivStatus(o: OrderListItem): DelivStatus {
  if (o.Reseved && o.Reseved !== '0' && o.Reseved !== '') return 'delivered';
  if (o.Billed === 'True') return 'billed';
  return 'pending';
}

const DELIV_STATUS_MAP: Record<DelivStatus, { label: string; bg: string; color: string }> = {
  delivered: { label: 'مُسلَّم',     bg: 'rgba(30,132,73,.1)',   color: 'var(--green)' },
  billed:    { label: 'لها فاتورة', bg: 'rgba(26,82,118,.1)',   color: 'var(--blue)'  },
  pending:   { label: 'لم يُسلَّم', bg: 'rgba(214,137,16,.12)', color: 'var(--warn)'  },
};

function DelivBadge({ status }: { status: DelivStatus }) {
  const s = DELIV_STATUS_MAP[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 9px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── Bill badge ────────────────────────────────────────
function BillBadge({ billed }: { billed?: string }) {
  const issued = billed === 'True';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 12, fontWeight: 600,
      color: issued ? 'var(--green)' : 'var(--muted)',
    }}>
      {issued ? '✅ صادرة' : '⏳ معلقة'}
    </span>
  );
}

// ── Filter pill ───────────────────────────────────────
function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      padding: '5px 13px', borderRadius: 20,
      fontFamily: 'Cairo', fontSize: 11.5, fontWeight: 600,
      cursor: 'pointer', transition: 'all .18s',
      border: `1.5px solid ${active ? 'var(--steel)' : 'var(--border)'}`,
      background: active ? 'var(--steel)' : 'white',
      color: active ? 'white' : 'var(--muted)',
    }}>
      {label}
    </button>
  );
}

// ── Filters config ────────────────────────────────────
const FILTERS: { value: DelivStatus | 'all'; label: string }[] = [
  { value: 'all',       label: 'الكل'         },
  { value: 'delivered', label: 'مُسلَّم'      },
  { value: 'billed',    label: 'لها فاتورة'  },
  { value: 'pending',   label: 'لم يُسلَّم'  },
];

// ── Main page ─────────────────────────────────────────
export default function DeliveryPage() {
  const navigate = useNavigate();

  const [year,   setYear]   = useState(String(new Date().getFullYear()));
  const [q,      setQ]      = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<DelivStatus | 'all'>('all');
  const [page,   setPage]   = useState(1);

  // Map local filter → API status param
  const apiStatus =
    filter === 'delivered' ? 'delivered' :
    filter === 'billed'    ? 'billed'    :
    filter === 'pending'   ? 'new'       : '';

  const { data, isLoading } = useOrders({ year, q: search, page, status: apiStatus });

  const handleSearch = useCallback((val: string) => {
    setQ(val);
    const t = setTimeout(() => { setSearch(val); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, []);

  const handleFilterChange = (val: DelivStatus | 'all') => {
    setFilter(val);
    setPage(1);
  };

  const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

  // Client-side re-filter (for pending which maps to 'new' but may include non-pending)
  const rows = (data?.data ?? []).filter(o => {
    if (filter === 'all') return true;
    return getDelivStatus(o) === filter;
  });

  // Derive counts from current full dataset for stat cards
  const allRows = data?.data ?? [];
  const deliveredCount = allRows.filter(o => getDelivStatus(o) === 'delivered').length;
  const billedCount    = allRows.filter(o => getDelivStatus(o) === 'billed').length;
  const pendingCount   = allRows.filter(o => getDelivStatus(o) === 'pending').length;

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>
          🚚 التسليم والفوترة
          {data && (
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--muted)', marginRight: 8 }}>
              ({data.total.toLocaleString('ar')} سجل)
            </span>
          )}
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="fc" value={year} onChange={e => { setYear(e.target.value); setPage(1); }} style={{ width: 90 }}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <Btn variant="primary" onClick={() => navigate('/orders/new')}>➕ طلب جديد</Btn>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="إجمالي الطلبات"  value={data?.total ?? 0} icon="📋" accent="var(--blue)"  />
        <StatCard label="مُسلَّم"          value={deliveredCount}    icon="✅" accent="var(--green)" />
        <StatCard label="لها فاتورة"      value={billedCount}       icon="🧾" accent="var(--gold)"  />
        <StatCard label="في الانتظار"     value={pendingCount}      icon="⏳" accent="var(--warn)"  />
      </div>

      {/* Main table card */}
      <Card title="🚚 سجل التسليم والفوترة" noPad>

        {/* Filters + search */}
        <div style={{
          padding: '12px 16px',
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
              placeholder="بحث برقم الطلب أو الزبون..."
              style={{ paddingLeft: 32 }}
            />
          </div>

          {/* Status filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <FilterPill
                key={f.value}
                label={f.label}
                active={filter === f.value}
                onClick={() => handleFilterChange(f.value)}
              />
            ))}
          </div>
        </div>

        {/* Table */}
        {isLoading ? <Loading /> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead style={{ background: 'var(--steel)', color: '#fff' }}>
                <tr>
                  {[
                    'رقم الطلب', 'الزبون', 'المطبوعة',
                    'الكمية المطلوبة', 'الكمية المُسلَّمة',
                    'الفاتورة', 'موعد التسليم', 'الحالة', 'إجراء',
                  ].map(h => (
                    <th key={h} style={{
                      padding: '11px 13px', fontWeight: 600,
                      fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap',
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: 'var(--muted)', fontSize: 13 }}>
                      لا توجد سجلات مطابقة
                    </td>
                  </tr>
                )}
                {rows.map(o => {
                  const status = getDelivStatus(o);
                  // Delivered qty: use Reseved if available, else full Demand if billed, else 0
                  const deliveredQty =
                    o.Reseved && o.Reseved !== '0' ? Number(o.Reseved) :
                    o.Billed === 'True'            ? Number(o.Demand || 0) :
                    0;

                  return (
                    <tr
                      key={`${o.ID}-${o.Year}`}
                      onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fdf8f0'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                    >
                      {/* Order number */}
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{
                          fontWeight: 700, color: 'var(--blue)',
                          background: 'rgba(26,82,118,.08)',
                          padding: '2px 8px', borderRadius: 4,
                        }}>
                          {o.ID}
                        </span>
                      </td>

                      {/* Customer */}
                      <td style={{
                        padding: '10px 13px',
                        maxWidth: 180, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {o.Customer || '—'}
                      </td>

                      {/* Product name */}
                      <td style={{
                        padding: '10px 13px',
                        maxWidth: 160, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        fontWeight: 600,
                      }}>
                        {o.Eng_Name || '—'}
                      </td>

                      {/* Requested qty */}
                      <td style={{ padding: '10px 13px' }}>
                        {Number(o.Demand || 0).toLocaleString('ar')}
                      </td>

                      {/* Delivered qty */}
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{
                          fontWeight: 700,
                          color: deliveredQty > 0 ? 'var(--green)' : 'var(--muted)',
                        }}>
                          {deliveredQty.toLocaleString('ar')}
                        </span>
                      </td>

                      {/* Bill */}
                      <td style={{ padding: '10px 13px' }}>
                        <BillBadge billed={o.Billed} />
                      </td>

                      {/* Delivery date */}
                      <td style={{ padding: '10px 13px', whiteSpace: 'nowrap', color: 'var(--muted)', fontSize: 12 }}>
                        {o.Apoent_Delv_date || '—'}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '10px 13px' }}>
                        <DelivBadge status={status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '10px 13px' }} onClick={e => e.stopPropagation()}>
                        <Btn size="sm" onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}>
                          عرض
                        </Btn>
                      </td>
                    </tr>
                  );
                })}
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
            {page > 1 && (
              <Btn size="sm" onClick={() => setPage(p => p - 1)}>‹ السابق</Btn>
            )}
            {Array.from({ length: Math.min(5, data.last_page) }, (_, i) => {
              const p = Math.max(1, Math.min(page - 2, data.last_page - 4)) + i;
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
            {page < data.last_page && (
              <Btn size="sm" onClick={() => setPage(p => p + 1)}>التالي ›</Btn>
            )}
            <span style={{ fontSize: 12, color: 'var(--muted)', marginRight: 4 }}>
              صفحة {page} من {data.last_page}
            </span>
          </div>
        )}
      </Card>

      {/* Summary card */}
      <Card title="📊 ملخص الفوترة">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* Delivered */}
          <div style={{
            borderRight: '4px solid var(--green)',
            background: 'rgba(30,132,73,.04)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>إجمالي المُسلَّم</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--green)' }}>
              {deliveredCount.toLocaleString('ar')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>طلب مكتمل التسليم</div>
          </div>

          {/* Billed */}
          <div style={{
            borderRight: '4px solid var(--blue)',
            background: 'rgba(26,82,118,.04)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>فواتير صادرة</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--blue)' }}>
              {billedCount.toLocaleString('ar')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>طلب له فاتورة</div>
          </div>

          {/* Pending */}
          <div style={{
            borderRight: '4px solid var(--warn)',
            background: 'rgba(214,137,16,.05)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>في الانتظار</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--warn)' }}>
              {pendingCount.toLocaleString('ar')}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>طلب لم يُسلَّم بعد</div>
          </div>

        </div>
      </Card>
    </div>
  );
}
