'use client';
/**
 * Admin products page — paginated list with toggle active/inactive.
 *
 * Full CRUD (create, edit) requires the product form which is complex
 * and can be added as a follow-up. This page provides visibility and
 * basic management of existing products.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import apiFetch, { adminFetch } from '@/lib/api';
import type { PerfumeSummaryResponse, PaginatedResponse } from '@/lib/types';
import styles from '../admin.module.css';

function formatCurrency(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<PerfumeSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const pageSize = 20;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      const data = await apiFetch<PaginatedResponse<PerfumeSummaryResponse>>(
        `/products?${params.toString()}`
      );
      setProducts(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const totalPages = Math.ceil(total / pageSize);

  async function handleDelete(productId: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return;
    try {
      await adminFetch(`/admin/products/${productId}`, { method: 'DELETE' });
      await fetchProducts();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Productos</h1>
          <p className={styles.pageSubtitle}>{total} producto{total !== 1 ? 's' : ''} en catálogo</p>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--color-error)', marginBottom: 16 }}>{error}</div>
      )}

      <div className={styles.adminCard} style={{ padding: 0 }}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th>Marca</th>
                <th>Género</th>
                <th>Presentaciones</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    Cargando...
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🧴</div>
                      <p>No hay productos en el catálogo.</p>
                    </div>
                  </td>
                </tr>
              ) : products.map(product => {
                const minPrice = product.presentaciones.length > 0
                  ? Math.min(...product.presentaciones.map(p => p.precio))
                  : 0;
                const totalStock = product.presentaciones.reduce((acc, p) => acc + p.stock, 0);

                return (
                  <tr key={product.id} id={`product-row-${product.id}`}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{product.nombre}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        desde {formatCurrency(minPrice)}
                      </div>
                    </td>
                    <td>{product.marca.nombre}</td>
                    <td style={{ textTransform: 'capitalize' }}>{product.genero}</td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {product.presentaciones.map(p => (
                          <span
                            key={p.id}
                            style={{
                              fontSize: '0.7rem',
                              padding: '2px 7px',
                              borderRadius: 4,
                              background: p.stock === 0 ? '#fdf0f0' : '#f0f9f4',
                              color: p.stock === 0 ? '#c0392b' : '#2d7a4f',
                              border: `1px solid ${p.stock === 0 ? '#f5c6cb' : '#c3e6cb'}`,
                              fontWeight: 600,
                            }}
                          >
                            {p.tamano_ml}ml · {p.stock}u
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          padding: '3px 10px',
                          borderRadius: 999,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          background: product.activo ? '#d1f2d3' : '#f8d7da',
                          color: product.activo ? '#166327' : '#721c24',
                        }}
                      >
                        {product.activo ? '● Activo' : '● Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <Link
                          href={`/catalogo/${product.slug}`}
                          className={styles.btnView}
                          id={`view-product-${product.id}`}
                          target="_blank"
                        >
                          👁 Ver
                        </Link>
                        <button
                          id={`delete-product-${product.id}`}
                          className={styles.btnDiscard}
                          onClick={() => handleDelete(product.id, product.nombre)}
                          style={{ fontSize: '0.72rem', padding: '5px 12px' }}
                        >
                          🗑 Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            ← Anterior
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Página {page} de {totalPages}
          </span>
          <button
            className={styles.pageBtn}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </>
  );
}
