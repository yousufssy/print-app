import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/services';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { token, setAuth } = useAuthStore();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');

  if (token) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await authApi.login(form);
      setAuth(res.user, res.token);
      toast.success(`مرحباً ${res.user.full_name}`);
      navigate('/');
    } catch (err: any) {
      const msg = err.response?.data?.errors?.username?.[0]
               || err.response?.data?.message
               || 'خطأ في الاتصال بالخادم';
      setError(msg);
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--steel)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: .04,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      <div className="fade-up" style={{
        background: '#fff', borderRadius: 20, padding: '44px 40px',
        width: 420, maxWidth: '95vw',
        boxShadow: '0 30px 80px rgba(0,0,0,.35)', position: 'relative',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64, height: 64, background: 'var(--red)',
            borderRadius: 16, display: 'inline-flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 30, marginBottom: 14,
            boxShadow: '0 8px 24px rgba(192,57,43,.35)',
          }}>🖨</div>
          <h1 style={{ fontSize: 22, fontWeight: 900 }}>نظام إدارة المطبعة</h1>
          <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 4 }}>يرجى تسجيل الدخول للمتابعة</p>
        </div>

        {error && (
          <div style={{
            background: '#fdf0ef', border: '1px solid #f5c6c2',
            color: 'var(--red)', borderRadius: 8, padding: '10px 14px',
            fontSize: 13, marginBottom: 18, textAlign: 'center',
          }}>⚠️ {error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 5 }}>
              اسم المستخدم
            </label>
            <input className="fc" type="text" value={form.username} autoFocus required
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="أدخل اسم المستخدم" />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--steel)', marginBottom: 5 }}>
              كلمة المرور
            </label>
            <input className="fc" type="password" value={form.password} required
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} style={{
            width: '100%', padding: 13,
            background: loading ? '#aaa' : 'var(--red)',
            color: '#fff', border: 'none', borderRadius: 9,
            fontFamily: 'Cairo', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(192,57,43,.35)',
            transition: 'all .2s',
          }}>
            {loading ? '⏳ جاري الدخول...' : '🔐 تسجيل الدخول'}
          </button>
        </form>

        <div style={{
          textAlign: 'center', marginTop: 20, fontSize: 12,
          color: 'var(--muted)', borderTop: '1px solid var(--border)',
          paddingTop: 16, lineHeight: 1.8,
        }}>
          <strong style={{ color: 'var(--steel)' }}>بيانات تجريبية:</strong><br />
          admin / admin123 &nbsp;|&nbsp; user1 / user123
        </div>
      </div>
    </div>
  );
}
