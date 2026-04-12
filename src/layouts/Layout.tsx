import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/services';
import styles from './Layout.module.css';

const NAV = [
  { to: '/',           icon: '📊', label: 'لوحة التحكم'    },
  { to: '/orders',     icon: '📋', label: 'أوامر الطباعة'  },
  { to: '/production', icon: '⚙️', label: 'متابعة الإنتاج' },
  { to: '/delivery',   icon: '🚚', label: 'التسليم والفوترة' },
];

const USER_NAV = [
  { to: '/orders/new', icon: '➕', label: 'طلب جديد' },
];

const ADMIN_NAV = [
  { to: '/users', icon: '👥', label: 'إدارة المستخدمين' },
];

export default function Layout() {
  const { user, clearAuth, isAdmin } = useAuthStore();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await authApi.logout(); } catch {}
    clearAuth();
    navigate('/login');
  };

  return (
    <div className={styles.shell}>
      {/* SIDEBAR */}
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>🖨</div>
          <div>
            <div className={styles.logoText}>نظام المطبعة</div>
            <div className={styles.logoSub}>إدارة الإنتاج</div>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navLabel}>الرئيسية</div>

          {/* Main nav — visible to all */}
          {NAV.map(n => (
            <NavLink key={n.to} to={n.to} end={n.to === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.navIcon}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}

          {/* New order — admin & user only */}
          {user?.role !== 'reader' && USER_NAV.map(n => (
            <NavLink key={n.to} to={n.to}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`}>
              <span className={styles.navIcon}>{n.icon}</span>
              {n.label}
            </NavLink>
          ))}

          {/* Admin section */}
          {isAdmin() && (
            <>
              <div className={styles.navLabel} style={{ marginTop: 8 }}>الإدارة</div>
              {ADMIN_NAV.map(n => (
                <NavLink key={n.to} to={n.to}
                  className={({ isActive }) =>
                    `${styles.navItem} ${isActive ? styles.active : ''}`}>
                  <span className={styles.navIcon}>{n.icon}</span>
                  {n.label}
                </NavLink>
              ))}
            </>
          )}
        </nav>

        <div className={styles.sidebarFooter}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>{user?.full_name?.charAt(0) ?? 'م'}</div>
            <div>
              <div className={styles.userName}>{user?.full_name}</div>
              <div className={styles.userRole}>
                {user?.role === 'admin'
                  ? '🔑 مدير'
                  : user?.role === 'reader'
                  ? '👁 قارئ'
                  : '👤 مستخدم'}
              </div>
            </div>
          </div>
          <button className={styles.logoutBtn} onClick={handleLogout} disabled={loggingOut}>
            🚪 تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className={styles.main}>
        <div className="fade-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
