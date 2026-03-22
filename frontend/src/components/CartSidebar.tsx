'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCartStore } from '@/store/cartStore';
import styles from './CartSidebar.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function CartSidebar({ open, onClose }: Props) {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const clearCart = useCartStore((s) => s.clearCart);
  const totalPrice = useCartStore((s) => s.totalPrice());

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Use empty array on first render (server) to prevent hydration mismatch
  const cartItems = mounted ? items : [];
  const currentTotal = mounted ? totalPrice : 0;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className={styles.backdrop}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Panel */}
      <aside className={`${styles.panel} ${open ? styles.open : ''}`} aria-label="Carrito de compras">
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.clearBtn}
            onClick={clearCart}
            title="Vaciar carrito"
            aria-label="Vaciar carrito"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14H6L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
          <h2 className={styles.title}>Carrito</h2>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Cerrar">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Items */}
        <div className={styles.items}>
          {cartItems.length === 0 ? (
            <div className={styles.empty}>
              <p>Tu carrito está vacío.</p>
              <button className={`btn btn-secondary btn-sm ${styles.shopBtn}`} onClick={onClose}>
                Ver productos
              </button>
            </div>
          ) : (
            cartItems.map((item) => (
              <div key={item.presentacion.id} className={styles.item}>
                {/* Thumbnail */}
                <div className={styles.thumbnail}>
                  {item.perfume.imagen_principal ? (
                    <Image
                      src={item.perfume.imagen_principal}
                      alt={item.perfume.nombre}
                      fill
                      sizes="80px"
                      className={styles.thumbImg}
                    />
                  ) : (
                    <div className={styles.thumbPlaceholder}>✦</div>
                  )}
                </div>

                {/* Info + controls */}
                <div className={styles.itemInfo}>
                  <div className={styles.itemTop}>
                    <div>
                      <p className={styles.itemName}>{item.perfume.nombre}</p>
                      <p className={styles.itemSub}>{item.presentacion.tamano_ml}ml</p>
                    </div>
                    <p className={styles.itemPrice}>
                      ${(item.presentacion.precio * item.cantidad).toFixed(2)}
                    </p>
                  </div>

                  {/* Qty stepper */}
                  <div className={styles.qty}>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.presentacion.id, item.cantidad - 1)}
                    >
                      −
                    </button>
                    <span className={styles.qtyNum}>{item.cantidad}</span>
                    <button
                      className={styles.qtyBtn}
                      onClick={() => updateQuantity(item.presentacion.id, item.cantidad + 1)}
                      disabled={item.cantidad >= item.presentacion.stock}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className={styles.footer}>
            <div className={styles.subtotal}>
              <span>Subtotal</span>
              <strong>${totalPrice.toFixed(2)}</strong>
            </div>
            <Link
              href="/checkout"
              className={`btn btn-primary ${styles.checkoutBtn}`}
              onClick={onClose}
            >
              Finalizar Compra
            </Link>
            <button
              className={`btn btn-secondary ${styles.continueBtn}`}
              onClick={onClose}
            >
              Seguir comprando
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
