'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useCartStore } from '@/store/cartStore';
import styles from './page.module.css';

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const totalPrice = useCartStore((s) => s.totalPrice());

  if (items.length === 0) {
    return (
      <div className={`container section ${styles.empty}`}>
        <span className={styles.emptyIcon}>◎</span>
        <h2>Tu carrito está vacío</h2>
        <p className="text-muted">Explora nuestro catálogo y añade fragancias a tu carrito.</p>
        <Link href="/productos" className="btn btn-primary btn-lg">
          Ver catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="container section">
      <div className={styles.header}>
        <h1>Tu Carrito</h1>
        <p className="text-muted">{items.length} {items.length === 1 ? 'producto' : 'productos'}</p>
      </div>

      <div className={styles.layout}>
        {/* Items */}
        <div className={styles.items}>
          {items.map((item) => (
            <div key={item.presentacion.id} className={`card ${styles.item}`}>
              {/* Image */}
              <div className={styles.itemImage}>
                {item.perfume.imagen_principal ? (
                  <Image
                    src={item.perfume.imagen_principal}
                    alt={item.perfume.nombre}
                    fill
                    className={styles.itemImg}
                    sizes="100px"
                  />
                ) : (
                  <div className={styles.itemImgPlaceholder}>✦</div>
                )}
              </div>

              {/* Info */}
              <div className={styles.itemInfo}>
                <p className={styles.itemBrand}>{item.perfume.marca.nombre}</p>
                <Link href={`/productos/${item.perfume.slug}`} className={styles.itemName}>
                  {item.perfume.nombre}
                </Link>
                <p className={styles.itemSize}>{item.presentacion.tamano_ml}ml</p>
              </div>

              {/* Controls */}
              <div className={styles.itemControls}>
                <div className={styles.qty}>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.presentacion.id, item.cantidad - 1)}
                  >−</button>
                  <span>{item.cantidad}</span>
                  <button
                    className={styles.qtyBtn}
                    onClick={() => updateQuantity(item.presentacion.id, item.cantidad + 1)}
                    disabled={item.cantidad >= item.presentacion.stock}
                  >+</button>
                </div>
                <p className={styles.itemPrice}>
                  ${(item.presentacion.precio * item.cantidad).toFixed(2)}
                </p>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeItem(item.presentacion.id)}
                  aria-label="Eliminar"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className={`card ${styles.summary}`}>
          <h3 className={styles.summaryTitle}>Resumen del Pedido</h3>
          <div className={styles.summaryLines}>
            {items.map((item) => (
              <div key={item.presentacion.id} className={styles.summaryLine}>
                <span className="text-muted">
                  {item.perfume.nombre} {item.presentacion.tamano_ml}ml × {item.cantidad}
                </span>
                <span>${(item.presentacion.precio * item.cantidad).toFixed(2)}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <div className={styles.summaryTotal}>
            <span>Subtotal</span>
            <strong>${totalPrice.toFixed(2)}</strong>
          </div>
          <p className={styles.shippingNote}>
            El costo de envío se calcula en el checkout según tu zona.
          </p>
          <Link href="/checkout" className={`btn btn-primary ${styles.checkoutBtn}`}>
            Proceder al Checkout
          </Link>
          <Link href="/catalogo" className={`btn btn-ghost ${styles.continueBtn}`}>
            Seguir comprando
          </Link>
        </div>
      </div>
    </div>
  );
}
