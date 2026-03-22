'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { PerfumeDetailResponse, PresentacionResponse } from '@/lib/types';
import { useCartStore } from '@/store/cartStore';
import styles from './ProductDetail.module.css';

const TIPO_LABELS: Record<string, string> = {
  salida: 'Notas de Salida',
  corazon: 'Notas de Corazón',
  fondo: 'Notas de Fondo',
};

const GENERO_LABELS: Record<string, string> = {
  masculino: 'Masculino',
  femenino: 'Femenino',
  unisex: 'Unisex',
};

export default function ProductDetail({ product }: { product: PerfumeDetailResponse }) {
  const addItem = useCartStore((s) => s.addItem);
  const [selected, setSelected] = useState<PresentacionResponse | null>(
    product.presentaciones[0] ?? null
  );
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [activeImage, setActiveImage] = useState(
    product.imagenes[0]?.url ?? product.imagen_principal ?? null
  );

  const noteGroups = {
    salida: product.notas.filter((n) => n.tipo === 'salida'),
    corazon: product.notas.filter((n) => n.tipo === 'corazon'),
    fondo: product.notas.filter((n) => n.tipo === 'fondo'),
  };

  const handleAddToCart = () => {
    if (!selected) return;
    addItem(product, selected, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div className={styles.wrapper}>
      {/* Image Gallery */}
      <div className={styles.gallery}>
        <div className={styles.mainImage}>
          {activeImage ? (
            <Image
              src={activeImage}
              alt={product.nombre}
              fill
              className={styles.img}
              priority
              sizes="(max-width:768px) 100vw, 50vw"
            />
          ) : (
            <div className={styles.imgPlaceholder}>
              <span>✦</span>
            </div>
          )}
        </div>
        {product.imagenes.length > 1 && (
          <div className={styles.thumbnails}>
            {product.imagenes.map((img) => (
              <button
                key={img.id}
                className={`${styles.thumb} ${activeImage === img.url ? styles.thumbActive : ''}`}
                onClick={() => setActiveImage(img.url)}
              >
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className={styles.thumbImg}
                  sizes="80px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.badges}>
          {product.es_nuevo && <span className="badge badge-new">Nuevo</span>}
          {product.destacado && <span className="badge badge-primary">Destacado</span>}
          {product.es_arabe && <span className="badge" style={{background:'#4a2070', color:'#fff'}}>Árabe</span>}
        </div>

        <h1 className={styles.name}>{product.nombre}</h1>

        {/* Large main price from lowest presentation */}
        {product.presentaciones.length > 0 && (
          <p className={styles.mainPrice}>
            ${Math.min(...product.presentaciones.map((p) => Number(p.precio))).toFixed(2)}
          </p>
        )}

        {product.descripcion && (
          <p className={styles.description}>{product.descripcion}</p>
        )}

        <div className="divider" />

        {/* Presentation selector */}
        <div className={styles.sizeSection}>
          <label className="form-label">Tamaño / Presentación</label>
          <div className={styles.sizes}>
            {product.presentaciones.map((p) => (
              <button
                key={p.id}
                className={`${styles.sizeBtn} ${selected?.id === p.id ? styles.sizeBtnActive : ''} ${p.stock === 0 ? styles.sizeBtnOut : ''}`}
                onClick={() => { setSelected(p); setQty(1); }}
                disabled={p.stock === 0}
              >
                <span className={styles.sizeMl}>{p.tamano_ml}ml</span>
                <span className={styles.sizePrice}>${Number(p.precio).toFixed(2)}</span>
              </button>
            ))}
          </div>
          {selected && (
            <p className={styles.stockInfo}>
              {selected.stock > 5
                ? <span style={{color:'var(--color-success)'}}>✓ En stock</span>
                : selected.stock > 0
                  ? <span style={{color:'var(--color-warning)'}}>⚠ Solo {selected.stock} disponibles</span>
                  : <span style={{color:'var(--color-error)'}}>✗ Sin stock</span>
              }
            </p>
          )}
        </div>

        {/* Quantity + Add to cart */}
        <div className={styles.addRow}>
          <div className={styles.qty}>
            <button
              className={styles.qtyBtn}
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
            >−</button>
            <span className={styles.qtyNum}>{qty}</span>
            <button
              className={styles.qtyBtn}
              onClick={() => setQty((q) => Math.min(selected?.stock ?? 1, q + 1))}
              disabled={!selected || qty >= (selected?.stock ?? 0)}
            >+</button>
          </div>
          <button
            className={`btn btn-primary ${styles.addBtn} ${added ? styles.addedBtn : ''}`}
            onClick={handleAddToCart}
            disabled={!selected || selected.stock === 0}
          >
            {added ? '✓ Añadido al carrito' : 'Añadir al carrito'}
          </button>
        </div>

        {/* Selected price display */}
        {selected && (
          <p className={styles.totalPrice}>
            Total: <strong>${(Number(selected.precio) * qty).toFixed(2)}</strong>
          </p>
        )}

        <div className="divider" />

        {/* Olfactive notes pyramid */}
        {product.notas.length > 0 && (
          <div className={styles.notes}>
            <h3 className={styles.notesTitle}>Pirámide Olfativa</h3>
            {(['salida', 'corazon', 'fondo'] as const).map((tipo) =>
              noteGroups[tipo].length > 0 ? (
                <div key={tipo} className={styles.noteGroup}>
                  <p className={styles.noteLabel}>{TIPO_LABELS[tipo]}</p>
                  <div className={styles.noteTags}>
                    {noteGroups[tipo].map((n) => (
                      <span key={n.id} className={styles.noteTag}>{n.nombre}</span>
                    ))}
                  </div>
                </div>
              ) : null
            )}
          </div>
        )}
      </div>
    </div>
  );
}
