import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrders } from '../hooks/useApi';
import { Loading, Btn, Card, StatCard } from '../components/ui';

// ── Types ─────────────────────────────────────────────
type MachineStatus = 'busy' | 'idle' | 'issue';

interface Machine {
  id: number;
  name: string;
  status: MachineStatus;
  orderId?: string;
  efficiency?: number;
}

// ── Constants ─────────────────────────────────────────
const MACHINES: Machine[] = [
  { id: 1, name: 'آلة 1 – هايدلبرغ', status: 'busy',  orderId: undefined, efficiency: 83 },
  { id: 2, name: 'آلة 2 – رولاند',   status: 'busy',  orderId: undefined, efficiency: 95 },
  { id: 3, name: 'آلة 3 – KBA',      status: 'idle',  orderId: undefined, efficiency: 91 },
  { id: 4, name: 'آلة 4 – مان',      status: 'issue', orderId: undefined, efficiency: 0  },
  { id: 5, name: 'آلة 5 – ريابي',    status: 'busy',  orderId: undefined, efficiency: 78 },
];

const MACHINE_STATUS_LABEL: Record<MachineStatus, string> = {
  busy:  'يعمل',
  idle:  'انتظار',
  issue: 'معطلة',
};

const MACHINE_STATUS_COLOR: Record<MachineStatus, string> = {
  busy:  'var(--warn)',
  idle:  'var(--green)',
  issue: 'var(--red)',
};

const DOT_COLOR: Record<MachineStatus, string> = {
  busy:  'var(--warn)',
  idle:  'var(--green)',
  issue: 'var(--red)',
};

// Production-specific status derived from Order fields
type ProdStatus = 'printing' | 'almost_done' | 'halted' | 'waiting';

function getProdStatus(o: {
  Printed?: string;
  Reseved?: string;
  Machin_Print?: string;
}): ProdStatus {
  if (o.Reseved && o.Reseved !== '0' && o.Reseved !== '') return 'almost_done';
  if (o.Printed === 'True') return 'almost_done';
  if (!o.Machin_Print || o.Machin_Print.trim() === '') return 'waiting';
  return 'printing';
}

const PROD_STATUS_MAP: Record<ProdStatus, { label: string; bg: string; color: string }> = {
  printing:    { label: 'يطبع',       bg: 'rgba(214,137,16,.12)', color: 'var(--warn)'  },
  almost_done: { label: 'شبه منتهي', bg: 'rgba(30,132,73,.1)',   color: 'var(--green)' },
  halted:      { label: 'توقف',       bg: 'rgba(192,57,43,.1)',   color: 'var(--red)'   },
  waiting:     { label: 'انتظار',     bg: 'rgba(26,82,118,.1)',   color: 'var(--blue)'  },
};

function ProdStatusBadge({ status }: { status: ProdStatus }) {
  const s = PROD_STATUS_MAP[status];
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

// ── Progress Bar ──────────────────────────────────────
function ProgressBar({ pct, status }: { pct: number; status: ProdStatus }) {
  const color =
    status === 'halted'      ? 'var(--red)'   :
    pct >= 80                ? 'var(--green)'  :
                               'var(--warn)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ background: '#eee', borderRadius: 4, height: 6, width: 120 }}>
        <div style={{ background: color, height: '100%', borderRadius: 4, width: `${pct}%`, transition: 'width .5s ease' }} />
      </div>
      <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>{pct}%</span>
    </div>
  );
}

// ── Machine Dot ───────────────────────────────────────
function MachineDot({ status }: { status: MachineStatus }) {
  return (
    <span style={{
      display: 'inline-block',
      width: 8, height: 8,
      borderRadius: '50%',
      background: DOT_COLOR[status],
      flexShrink: 0,
    }} />
  );
}

// ── Filter Pill ───────────────────────────────────────
function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
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

// ── Main Page ─────────────────────────────────────────
const FILTERS: { value: ProdStatus | 'all'; label: string }[] = [
  { value: 'all',        label: 'الكل'         },
  { value: 'printing',  label: 'يطبع'          },
  { value: 'almost_done', label: 'شبه منتهي'  },
  { value: 'halted',    label: 'توقف / مشكلة' },
  { value: 'waiting',   label: 'انتظار'        },
];

export default function ProductionPage() {
  const navigate = useNavigate();
  const [year,    setYear]    = useState(String(new Date().getFullYear()));
  const [q,       setQ]       = useState('');
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState<ProdStatus | 'all'>('all');
  const [lastUpd, setLastUpd] = useState(() => new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }));

  // Fetch only "printed" (active production) orders — no status filter so we get all active
  const { data, isLoading } = useOrders({ year, q: search, page: 1, status: 'printed' });

  const handleSearch = useCallback((val: string) => {
    setQ(val);
    const t = setTimeout(() => setSearch(val), 400);
    return () => clearTimeout(t);
  }, []);

  const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

  // Derive production status and apply local filter
  const rows = (data?.data ?? [])
    .map(o => ({ ...o, prodStatus: getProdStatus(o) }))
    .filter(o => filter === 'all' || o.prodStatus === filter);

  // Stats
  const activeMachines = MACHINES.filter(m => m.status === 'busy').length;
  const avgEfficiency  = Math.round(
    MACHINES.filter(m => m.efficiency! > 0).reduce((acc, m) => acc + m.efficiency!, 0) /
    MACHINES.filter(m => m.efficiency! > 0).length
  );
  const issueCount = MACHINES.filter(m => m.status === 'issue').length;

  const handleRefresh = () => {
    setLastUpd(new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }));
  };

  return (
    <div>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>
          ⚙️ متابعة الإنتاج
          <span style={{
            marginRight: 10, fontSize: 11, fontWeight: 600,
            background: 'var(--red)', color: 'white',
            padding: '2px 10px', borderRadius: 20,
          }}>مباشر</span>
        </h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <select className="fc" value={year} onChange={e => setYear(e.target.value)} style={{ width: 90 }}>
            {years.map(y => <option key={y}>{y}</option>)}
          </select>
          <Btn variant="outline" onClick={handleRefresh}>🔄 تحديث</Btn>
          <Btn variant="primary" onClick={() => navigate('/orders/new')}>➕ طلب جديد</Btn>
        </div>
      </div>

      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="آلات تعمل الآن"    value={`${activeMachines} / ${MACHINES.length}`} icon="🏭" accent="var(--warn)"  />
        <StatCard label="كفاءة الإنتاج"     value={`${avgEfficiency}%`}                       icon="📈" accent="var(--blue)" />
        <StatCard label="طلبات قيد الإنتاج" value={data?.total ?? 0}                          icon="⚙️" accent="var(--green)"/>
        <StatCard label="مشاكل نشطة"        value={issueCount}                                icon="⚠️" accent="var(--red)"  />
      </div>

      {/* Production Table Card */}
      <Card
        title="⚙️ جدول متابعة الإنتاج"
        action={
          <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 11 }}>
            آخر تحديث: {lastUpd}
          </span>
        }
        noPad
      >
        {/* Filter + Search bar */}
        <div style={{
          padding: '12px 16px',
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center',
          borderBottom: '1px solid var(--border)',
        }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 280 }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }}>🔎</span>
            <input
              className="fc"
              value={q}
              onChange={e => handleSearch(e.target.value)}
              placeholder="بحث برقم الطلب أو الزبون..."
              style={{ paddingLeft: 32 }}
            />
          </div>
          {/* Filters */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <FilterPill
                key={f.value}
                label={f.label}
                active={filter === f.value}
                onClick={() => setFilter(f.value as ProdStatus | 'all')}
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
                  {['رقم الطلب', 'المطبوعة', 'الزبون', 'الآلة', 'التقدم', 'الكمية المطلوبة', 'الألوان', 'الحالة', 'إجراء'].map(h => (
                    <th key={h} style={{ padding: '11px 13px', fontWeight: 600, fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: 36, color: 'var(--muted)', fontSize: 13 }}>
                      لا توجد طلبات إنتاج حالياً
                    </td>
                  </tr>
                )}
                {rows.map(o => {
                  // Rough progress: if printed → 90%, else 40–65% based on having a machine assigned
                  const pct = o.prodStatus === 'almost_done' ? 90 : o.Machin_Print ? 65 : 15;
                  return (
                    <tr
                      key={`${o.ID}-${o.Year}`}
                      onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fdf8f0'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                    >
                      {/* Order Number */}
                      <td style={{ padding: '10px 13px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--blue)', background: 'rgba(26,82,118,.08)', padding: '2px 8px', borderRadius: 4 }}>
                          {o.ID}
                        </span>
                      </td>
                      {/* Product */}
                      <td style={{ padding: '10px 13px', fontWeight: 600, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.Eng_Name || '—'}
                      </td>
                      {/* Customer */}
                      <td style={{ padding: '10px 13px', fontSize: 11.5, color: 'var(--muted)', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {o.Customer || '—'}
                      </td>
                      {/* Machine */}
                      <td style={{ padding: '10px 13px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--steel)' }}>
                          <MachineDot status={o.Machin_Print ? 'busy' : 'idle'} />
                          {o.Machin_Print || '—'}
                        </div>
                      </td>
                      {/* Progress */}
                      <td style={{ padding: '10px 13px' }}>
                        <ProgressBar pct={pct} status={o.prodStatus} />
                      </td>
                      {/* Quantity */}
                      <td style={{ padding: '10px 13px' }}>
                        {Number(o.Demand || 0).toLocaleString('ar')}
                      </td>
                      {/* Colors */}
                      <td style={{ padding: '10px 13px', textAlign: 'center' }}>
                        {o.Clr_qunt || '—'}
                      </td>
                      {/* Status */}
                      <td style={{ padding: '10px 13px' }}>
                        <ProdStatusBadge status={o.prodStatus} />
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
      </Card>

      {/* Machines Status Card */}
      <Card title="🏭 حالة الآلات">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
          {MACHINES.map(m => (
            <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--steel)', fontWeight: 600 }}>
                <MachineDot status={m.status} />
                {m.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                {MACHINE_STATUS_LABEL[m.status]}
                {m.orderId ? ` • طلب ${m.orderId}` : ''}
              </div>
              {m.efficiency !== undefined && m.efficiency > 0 ? (
                <div style={{ fontSize: 11, color: MACHINE_STATUS_COLOR[m.status], marginTop: 2, fontWeight: 600 }}>
                  كفاءة: {m.efficiency}%
                </div>
              ) : (
                <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2, fontWeight: 600 }}>
                  معطلة – صيانة
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
