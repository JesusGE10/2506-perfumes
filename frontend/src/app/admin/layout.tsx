'use client';
/**
 * Admin layout — sidebar navigation + auth guard.
 *
 * - Redirects to /admin/login if no valid JWT is found.
 * - Renders a fixed sidebar with navigation links.
 * - Wraps all /admin/* pages.
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import styles from './admin.module.css';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/orders', label: 'Pedidos', icon: '🛍️' },
  { href: '/admin/products', label: 'Productos', icon: '🧴' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { token, logout, isAuthenticated } = useAuthStore();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Skip auth check on login page
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
        <div className={styles.sidebarBrand}>
          <span className={styles.brandIcon}>✦</span>
          <span className={styles.brandText}>Admin Panel</span>
        </div>

        <nav className={styles.sidebarNav}>
          {NAV_ITEMS.map((item) => (
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

        <div className={styles.sidebarFooter}>
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
