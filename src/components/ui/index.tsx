import React from 'react';

// ── Spinner ───────────────────────────────────────────
export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      border: '2px solid var(--border)',
      borderTopColor: 'var(--red)',
      borderRadius: '50%',
      animation: 'spin .7s linear infinite',
      flexShrink: 0,
    }} />
  );
}

export function Loading({ text = 'جاري التحميل...' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 40, color: 'var(--muted)' }}>
      <Spinner /> {text}
    </div>
  );
}

// ── Button ────────────────────────────────────────────
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md';
}

export function Btn({ variant = 'outline', size = 'md', style, children, ...props }: BtnProps) {
  const base: React.CSSProperties = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: size === 'sm' ? '5px 10px' : '8px 15px',
    borderRadius: 8, fontFamily: 'Cairo', cursor: 'pointer',
    fontSize: size === 'sm' ? 11.5 : 13, fontWeight: 600,
    border: 'none', transition: 'all .2s',
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: 'var(--red)', color: '#fff', boxShadow: '0 3px 10px rgba(192,57,43,.3)' },
    outline: { background: 'transparent', border: '1.5px solid var(--border)', color: 'var(--steel)' },
    ghost:   { background: 'transparent', color: 'var(--muted)' },
    danger:  { background: '#e74c3c', color: '#fff' },
    success: { background: 'var(--green)', color: '#fff' },
  };
  return (
    <button style={{ ...base, ...variants[variant], ...style }} {...props}>
      {children}
    </button>
  );
}

// ── Card ──────────────────────────────────────────────
interface CardProps { title?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; noPad?: boolean; }

export function Card({ title, action, children, noPad }: CardProps) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 18, boxShadow: '0 2px 10px rgba(0,0,0,.04)' }}>
      {title && (
        <div style={{ padding: '13px 20px', background: 'linear-gradient(135deg, var(--steel) 0%, var(--steel-l) 100%)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#fff', fontSize: 13.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>{title}</span>
          {action}
        </div>
      )}
      <div style={noPad ? undefined : { padding: '18px 20px' }}>
        {children}
      </div>
    </div>
  );
}

// ── Status Badge ──────────────────────────────────────
const statusMap: Record<string, { label: string; bg: string; color: string }> = {
  delivered: { label: 'مستلمة',     bg: 'rgba(44,62,80,.1)',   color: 'var(--steel)' },
  billed:    { label: 'لها فاتورة', bg: 'rgba(30,132,73,.1)',  color: 'var(--green)' },
  printed:   { label: 'مطبوعة',     bg: 'rgba(214,137,16,.12)',color: 'var(--warn)'  },
  new:       { label: 'جديد',       bg: 'rgba(26,82,118,.1)',  color: 'var(--blue)'  },
};

export function getOrderStatus(o: { Reseved?: string; Billed?: string; Printed?: string }) {
  if (o.Reseved && o.Reseved !== '0' && o.Reseved !== '') return 'delivered';
  if (o.Billed === 'True') return 'billed';
  if (o.Printed === 'True') return 'printed';
  return 'new';
}

export function StatusBadge({ status }: { status: string }) {
  const s = statusMap[status] ?? statusMap.new;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
      {s.label}
    </span>
  );
}

// ── Stat Card ─────────────────────────────────────────
export function StatCard({ label, value, icon, accent }: { label: string; value: number | string; icon: string; accent: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: 18,
      border: '1px solid var(--border)',
      borderRight: `4px solid ${accent}`,
      position: 'relative', overflow: 'hidden',
      transition: 'transform .2s, box-shadow .2s',
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.08)'; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = ''; }}
    >
      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 7 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1 }}>{typeof value === 'number' ? value.toLocaleString('ar') : value}</div>
      <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 30, opacity: .07 }}>{icon}</div>
    </div>
  );
}

// ── Form Group ────────────────────────────────────────
export function FormGroup({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--steel)' }}>
        {label} {required && <span style={{ color: 'var(--red)' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

// ── Section Divider ───────────────────────────────────
export function SectionDiv({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', letterSpacing: 1, textTransform: 'uppercase', background: '#fff', padding: '0 7px' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} className="fade-up" style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>{title}</h3>
        {children}
        {footer && <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>{footer}</div>}
      </div>
    </div>
  );
}

// ── Checkbox Item ─────────────────────────────────────
export function CheckItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 11px', border: `1.5px solid ${checked ? 'var(--red)' : 'var(--border)'}`, borderRadius: 7, cursor: 'pointer', fontSize: 12.5, background: checked ? 'rgba(192,57,43,.04)' : 'transparent', transition: '.18s' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 14, height: 14, accentColor: 'var(--red)', cursor: 'pointer' }} />
      {label}
    </label>
  );
}
