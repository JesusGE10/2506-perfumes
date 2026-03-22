'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { GeneroEnum } from '@/lib/types';
import styles from './CatalogFilters.module.css';

const GENDER_OPTIONS: { value: GeneroEnum | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'masculino', label: 'Masculino' },
  { value: 'femenino', label: 'Femenino' },
  { value: 'unisex', label: 'Unisex' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name', label: 'Nombre A-Z' },
];

export default function CatalogFilters({ total }: { total: number }) {
  const router = useRouter();
  const params = useSearchParams();

  const updateParam = useCallback(
    (key: string, value: string | undefined) => {
      const next = new URLSearchParams(params.toString());
      if (!value) {
        next.delete(key);
      } else {
        next.set(key, value);
        next.delete('page'); // reset to page 1 on filter change
      }
      router.push(`/productos?${next.toString()}`);
    },
    [params, router]
  );

  const gender = params.get('gender') ?? '';
  const sortBy = params.get('sort_by') ?? 'newest';
  const isArab = params.get('is_arab');
  const q = params.get('q') ?? '';

  return (
    <div className={styles.wrapper}>
      {/* Search */}
      <div className={styles.searchRow}>
        <input
          type="search"
          className="input"
          placeholder="Buscar fragancia..."
          defaultValue={q}
          onChange={(e) => {
            if (e.target.value.length === 0 || e.target.value.length >= 2) {
              updateParam('q', e.target.value || undefined);
            }
          }}
        />
      </div>

      <div className={styles.row}>
        {/* Results count */}
        <p className={styles.count}>
          <span className="text-muted">{total}</span> productos
        </p>

        {/* Sort */}
        <select
          className={`select ${styles.sort}`}
          value={sortBy}
          onChange={(e) => updateParam('sort_by', e.target.value)}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      <div className={styles.chips}>
        {/* Gender */}
        {GENDER_OPTIONS.map((o) => (
          <button
            key={o.value}
            className={`${styles.chip} ${gender === o.value ? styles.active : ''}`}
            onClick={() => updateParam('gender', o.value || undefined)}
          >
            {o.label}
          </button>
        ))}

        {/* Arab divider */}
        <span className={styles.sep}>|</span>

        <button
          className={`${styles.chip} ${isArab === 'true' ? styles.active : ''}`}
          onClick={() => updateParam('is_arab', isArab === 'true' ? undefined : 'true')}
        >
          Árabes
        </button>
      </div>
    </div>
  );
}
