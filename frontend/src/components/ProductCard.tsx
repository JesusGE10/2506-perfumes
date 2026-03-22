'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import type { PerfumeSummaryResponse } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import styles from './ProductCard.module.css';

interface Props {
  product: PerfumeSummaryResponse;
}

export default function ProductCard({ product }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);

  const cheapest = product.presentaciones.sort((a, b) => Number(a.precio) - Number(b.precio))[0];
  const lowestPrice = cheapest ? Number(cheapest.precio) : null;
  const inStock = product.presentaciones.some((p) => Number(p.stock) > 0);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!cheapest || !inStock) return;
    addItem(product, cheapest, 1);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  return (
    <Link href={`/catalogo/${product.slug}`} className={styles.card}>
      {/* Image */}
      <div className={styles.imageWrapper}>
        {product.imagen_principal ? (
          <Image
            src={product.imagen_principal}
            alt={product.nombre}
            fill
            className={styles.image}
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          />
        ) : (
          <Image 
            src="/logo-crema.png" 
            alt="Perfumes 2506" 
            fill 
            className={styles.imagePlaceholderImg} 
            sizes="(max-width:640px) 50vw, (max-width:1024px) 33vw, 25vw"
          />
        )}
        <div className={styles.badges}>
          {product.es_nuevo && <span className="badge badge-new">Nuevo</span>}
          {product.destacado && <span className="badge badge-primary">Destacado</span>}
          {product.es_arabe && <span className={`badge ${styles.arabBadge}`}>Árabe</span>}
        </div>
      </div>

      {/* Info */}
      <div className={styles.info}>
        <h3 className={styles.name}>{product.nombre}</h3>
        {lowestPrice !== null && (
          <p className={styles.price}>${lowestPrice.toFixed(2)}</p>
        )}
      </div>

      {/* CTA Button */}
      <button
        className={`${styles.addBtn} ${added ? styles.added : ''}`}
        onClick={handleAdd}
        disabled={!inStock}
        aria-label="Agregar al carrito"
      >
        {added ? '✓ Agregado' : inStock ? 'Agregar al carrito' : 'Sin stock'}
      </button>
    </Link>
  );
}
