import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../hooks/useApi';
import { StatCard, StatusBadge, getOrderStatus, Loading, Card } from '../components/ui';

export default function DashboardPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const { data, isLoading } = useDashboard(year);
  const navigate = useNavigate();

  const years: string[] = data?.years ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 900 }}>📊 لوحة التحكم</h1>
        <select className="fc" value={year} onChange={e => setYear(e.target.value)} style={{ width: 110 }}>
          {years.length ? years.map(y => <option key={y}>{y}</option>)
            : Array.from({ length: 10 }, (_, i) => String(new Date().getFullYear() - i)).map(y => <option key={y}>{y}</option>)
          }
        </select>
      </div>

      {isLoading ? <Loading /> : (
        <>
          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
            <StatCard label="إجمالي الطلبات" value={data?.total ?? 0} icon="📋" accent="var(--red)" />
            <StatCard label="مطبوعة"          value={data?.printed ?? 0} icon="🖨" accent="var(--gold)" />
            <StatCard label="لها فاتورة"      value={data?.billed ?? 0} icon="🧾" accent="var(--blue)" />
            <StatCard label="مستلمة"          value={data?.delivered ?? 0} icon="✅" accent="var(--green)" />
          </div>

          {/* Recent Orders */}
          <Card title="⏱ آخر الطلبات" action={
            <button onClick={() => navigate('/orders')} style={{ color: 'rgba(255,255,255,.6)', fontSize: 12, background: 'none', border: 'none', cursor: 'pointer' }}>
              عرض الكل ←
            </button>
          } noPad>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead style={{ background: 'var(--steel)', color: '#fff' }}>
                  <tr>
                    {['رقم الأمر','الزبون','المطبوعة','تاريخ الورود','الكمية','الحالة'].map(h => (
                      <th key={h} style={{ padding: '11px 12px', fontWeight: 600, fontSize: 11.5, textAlign: 'right', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data?.recent?.map((o:any) => (
                    <tr key={o.row_id} onClick={() => navigate(`/orders/${o.ID}/${o.Year}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#fdf8f0'}
                      onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = ''}
                    >
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontWeight: 700, color: 'var(--blue)', background: 'rgba(26,82,118,.08)', padding: '2px 7px', borderRadius: 4, fontSize: 12 }}>{o.ID}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{o.Customer || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{o.Eng_Name || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{o.date_come || '—'}</td>
                      <td style={{ padding: '10px 12px' }}>{Number(o.Demand || 0).toLocaleString('ar')}</td>
                      <td style={{ padding: '10px 12px' }}><StatusBadge status={getOrderStatus(o)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
