'use client';
/**
 * Admin layout — sidebar navigation + auth guard + profile footer.
 *
 * - Redirects to /admin/login if no valid JWT is found.
 * - Renders a fixed sidebar with navigation links.
 * - Shows admin name/avatar in sidebar footer.
 * - Wraps all /admin/* pages.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { useAdminSettingsStore } from '@/store/adminSettingsStore';
import { adminFetch } from '@/lib/api';
import type { AdminUser } from '@/lib/types';
import styles from './admin.module.css';

const BASE_NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/orders',    label: 'Pedidos',    icon: '🛍️' },
  { href: '/admin/products',  label: 'Productos',  icon: '🧴' },
  { href: '/admin/ajustes',   label: 'Ajustes',    icon: '⚙️' },
];

const SUPER_ADMIN_NAV = [
  { href: '/admin/users',     label: 'Usuarios',   icon: '👥' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, logout, isAuthenticated } = useAuthStore();
  const { adminNombre, adminFotoPerfil, adminRol, setAdminProfile, setStockThresholds } = useAdminSettingsStore();
  const [checked, setChecked] = useState(false);

  const navItems = adminRol === 'super_admin'
    ? [...BASE_NAV_ITEMS, ...SUPER_ADMIN_NAV]
    : BASE_NAV_ITEMS;

  // Auth guard
  useEffect(() => {
    if (pathname === '/admin/login') {
      setChecked(true);
      return;
    }
    if (!isAuthenticated()) {
      router.replace('/admin/login');
    } else {
      setChecked(true);
    }
  }, [pathname, token]);

  // Load admin profile into store (once authenticated)
  useEffect(() => {
    if (!checked || pathname === '/admin/login') return;
    adminFetch<AdminUser>('/auth/me').then(admin => {
      setAdminProfile(admin.nombre, admin.foto_perfil_url ?? null, admin.rol);
    }).catch(() => { /* silently ignore — layout shouldn't break */ });

    adminFetch<{ stock_low_threshold: number; stock_critical_threshold: number }>('/auth/me/settings')
      .then(s => setStockThresholds(s.stock_low_threshold, s.stock_critical_threshold))
      .catch(() => {});
  }, [checked]);

  // On login page — render children without layout
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!checked) {
    return (
      <div className={styles.loadingScreen}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <div className={styles.adminShell}>
      {/* ── Sidebar ── */}
      <aside className={styles.sidebar}>
        {/* Brand */}
        <div className={styles.sidebarBrand}>
          <span className={styles.brandIcon}>✦</span>
          <span className={styles.brandText}>Admin Panel</span>
        </div>

        {/* Navigation */}
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${pathname.startsWith(item.href) ? styles.navItemActive : ''}`}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Footer — admin profile + logout */}
        <div className={styles.sidebarFooter}>
          {/* Admin profile mini-card */}
          <Link
            href="/admin/ajustes"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
              padding: '10px 12px', borderRadius: 10,
              background: 'rgba(255,255,255,0.07)', textDecoration: 'none',
              border: '1px solid rgba(255,255,255,0.1)',
              transition: 'background 150ms',
            }}
          >
            {/* Avatar */}
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: '#3a2e24', border: '1.5px solid rgba(255,255,255,0.2)',
              overflow: 'hidden', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.85rem',
            }}>
              {adminFotoPerfil
                ? <img src={adminFotoPerfil} alt="Admin" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : '👤'
              }
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {adminNombre}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>Ver ajustes</div>
            </div>
            <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem', marginLeft: 'auto' }}>›</span>
          </Link>

          <button
            id="admin-logout-btn"
            className={styles.logoutBtn}
            onClick={() => {
              logout();
              router.push('/admin/login');
            }}
          >
            <span>🚪</span>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main className={styles.adminMain}>
        {children}
      </main>
    </div>
  );
}
