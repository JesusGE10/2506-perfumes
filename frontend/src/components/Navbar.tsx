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
          <Link 
            href="/" 
            className={styles.brand} 
            onClick={(e) => { 
                if (pathname === '/') {
                  e.preventDefault(); 
                  window.scrollTo({ top: 0, behavior: 'smooth' }); 
                }
            }}
          >
            <img src="/logo-crema.png" alt="Logo" className={styles.brandIconObj} />
            <span className={styles.brandName}>Perfumes 2506</span>
          </Link>

          {/* Desktop Links */}
          <ul className={styles.links}>
            <li><Link href="/catalogo?tag=novedades">Lo más nuevo</Link></li>
            <li><Link href="/catalogo?tag=mujeres">Mujeres</Link></li>
            <li><Link href="/catalogo?tag=hombres">Hombres</Link></li>
            <li><Link href="/catalogo?sort=ventas_desc">Los mas vendidos</Link></li>
            <li><Link href="/catalogo">Catálogo</Link></li>
          </ul>

          {/* Right actions */}
          <div className={styles.actions}>
            <button className={styles.cartBtn} aria-label="Buscar" onClick={() => {}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </button>

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
            <Link href="/catalogo?tag=novedades" onClick={() => setMenuOpen(false)}>Lo más nuevo</Link>
            <Link href="/catalogo?tag=mujeres" onClick={() => setMenuOpen(false)}>Mujeres</Link>
            <Link href="/catalogo?tag=hombres" onClick={() => setMenuOpen(false)}>Hombres</Link>
            <Link href="/catalogo?sort=ventas_desc" onClick={() => setMenuOpen(false)}>Los mas vendidos</Link>
            <Link href="/catalogo" onClick={() => setMenuOpen(false)}>Catálogo</Link>
          </div>
        )}
      </nav>

      {/* Cart Sidebar */}
      <CartSidebar open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}
