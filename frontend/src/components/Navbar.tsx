'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import CartSidebar from '@/components/CartSidebar';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const totalItems = useCartStore((s) => s.totalItems());
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <>
      <nav className={styles.nav}>
        <div className={`container ${styles.inner}`}>
          {/* Brand */}
          <Link href="/" className={styles.brand}>
            <span className={styles.brandIcon}>✦</span>
            <span className={styles.brandName}>Perfumería Fina</span>
          </Link>

          {/* Desktop Links */}
          <ul className={styles.links}>
            <li><Link href="/" className={pathname === '/' ? styles.active : ''}>Fragancias</Link></li>
            <li><Link href="/productos" className={pathname.startsWith('/productos') ? styles.active : ''}>Colecciones</Link></li>
          </ul>

          {/* Right actions */}
          <div className={styles.actions}>
            <button
              className={styles.cartBtn}
              onClick={() => setCartOpen(true)}
              aria-label="Abrir carrito"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 01-8 0"/>
              </svg>
              {mounted && totalItems > 0 && (
                <span className={styles.cartBadge}>{totalItems}</span>
              )}
            </button>

            <button
              className={styles.menuBtn}
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menú"
            >
              <span className={`${styles.burger} ${menuOpen ? styles.open : ''}`} />
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/">Fragancias</Link>
            <Link href="/productos">Colecciones</Link>
            <button
              style={{
                display: 'block', padding: '14px 24px', fontSize: '0.85rem',
                fontWeight: 500, color: 'var(--color-text-muted)', border: 'none',
                borderBottom: '1px solid var(--color-border)', textAlign: 'left',
                background: 'none', width: '100%', cursor: 'pointer',
              }}
              onClick={() => { setMenuOpen(false); setCartOpen(true); }}
            >
              Carrito {mounted && totalItems > 0 && `(${totalItems})`}
            </button>
          </div>
        )}
      </nav>

      {/* Cart Sidebar */}
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
