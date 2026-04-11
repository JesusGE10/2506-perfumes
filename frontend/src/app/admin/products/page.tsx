'use client';
/**
 * Admin products page — /admin/products
 *
 * Features:
 * - Tabla con todas las presentaciones (stock semáforo desde adminSettingsStore)
 * - Filas expandibles mostrando sub-filas por presentación
 * - Búsqueda y filtro por estado (activo/inactivo)
 * - Inline toggle activo/inactivo
 * - Botones: "Nuevo producto" + "Importar Excel"
 * - Inline edición de stock directamente en la tabla
 * - Confirmación modal para eliminar producto
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import { useAdminSettingsStore } from '@/store/adminSettingsStore';
import type { PerfumeSummaryResponse, PaginatedResponse } from '@/lib/types';
import styles from '../admin.module.css';

const PAGE_SIZE = 20;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2 })}`;
}

function StockBadge({ stock, low, critical }: { stock: number; low: number; critical: number }) {
  let label: string;
  let color: string;
  let bg: string;

  if (stock === 0) {
    label = 'AGOTADO'; color = '#dc2626'; bg = '#fee2e2';
  } else if (stock <= critical) {
    label = `${stock} u — CRÍTICO`; color = '#dc2626'; bg = '#fecaca';
  } else if (stock < low) {
    label = `${stock} u — BAJO`; color = '#d97706'; bg = '#fef3c7';
  } else {
    label = `${stock} u`; color = '#16a34a'; bg = '#dcfce7';
  }

  return (
    <span style={{
      padding: '2px 9px', borderRadius: 999, fontSize: '0.7rem',
      fontWeight: 700, color, background: bg,
    }}>
      {label}
    </span>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '28px 32px',
        maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
      }}>
        <p style={{ marginBottom: 24, lineHeight: 1.6, fontSize: '0.9rem' }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid #d9d4cd',
            background: '#fff', cursor: 'pointer', fontWeight: 600,
          }}>Cancelar</button>
          <button onClick={onConfirm} style={{
            padding: '10px 20px', borderRadius: 8, border: 'none',
            background: '#dc2626', color: '#fff', cursor: 'pointer', fontWeight: 700,
          }}>🗑 Eliminar</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: '0.88rem', fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminProductsPage() {
  const { stockLowThreshold: stockLow, stockCriticalThreshold: stockCritical } = useAdminSettingsStore();

  const [products, setProducts] = useState<PerfumeSummaryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActivo, setFilterActivo] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ id: string; nombre: string } | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Import state
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (search) params.set('q', search);
      if (filterActivo === 'active') params.set('activo', 'true');
      if (filterActivo === 'inactive') params.set('activo', 'false');

      const data = await adminFetch<PaginatedResponse<PerfumeSummaryResponse>>(
        `/admin/products?${params.toString()}`
      );
      setProducts(data.items);
      setTotal(data.total);
    } catch (err: any) {
      showToast(err.message ?? 'Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, filterActivo]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Debounced search
  function handleSearchChange(v: string) {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => {
      setSearch(v);
      setPage(1);
    }, 400);
  }

  function toggleExpand(id: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleToggleActive(product: PerfumeSummaryResponse) {
    try {
      await adminFetch(`/admin/products/${product.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activo: !product.activo }),
      });
      showToast(`Producto ${!product.activo ? 'activado' : 'desactivado'}`);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message ?? 'Error al actualizar', 'error');
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    try {
      await adminFetch(`/admin/products/${deleteModal.id}`, { method: 'DELETE' });
      showToast('Producto eliminado');
      setDeleteModal(null);
      fetchProducts();
    } catch (err: any) {
      showToast(err.message ?? 'Error al eliminar', 'error');
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const result = await adminFetch<{ created: number; updated: number; skipped: number; errors: string[] }>(
        '/admin/products/import', { method: 'POST', body: form }
      );
      showToast(`Importación: ${result.created} creados, ${result.updated} actualizados, ${result.skipped} omitidos`);
      if (result.errors.length > 0) {
        console.warn('Import errors:', result.errors);
      }
      fetchProducts();
    } catch (err: any) {
      showToast(err.message ?? 'Error al importar', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {deleteModal && (
        <ConfirmModal
          message={`¿Eliminar "${deleteModal.nombre}"? Esta acción no se puede deshacer y eliminará todas las presentaciones asociadas.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteModal(null)}
        />
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Productos</h1>
          <p className={styles.pageSubtitle}>{total} producto{total !== 1 ? 's' : ''} en catálogo</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {/* Hidden file input for Excel import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv"
            style={{ display: 'none' }}
            onChange={handleImport}
            id="import-file-input"
          />
          <button
            id="btn-import-excel"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            style={{
              padding: '10px 18px', borderRadius: 8,
              border: '1.5px solid #d9d4cd',
              background: importing ? '#f4f1ed' : '#faf9f7',
              color: '#5a4a3a', fontWeight: 700,
              fontSize: '0.82rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 7,
            }}
          >
            📊 {importing ? 'Importando...' : 'Importar Excel'}
          </button>
          <Link
            href="/admin/products/nuevo"
            id="btn-nuevo-producto"
            style={{
              padding: '10px 18px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #b8761e 0%, #d4943a 100%)',
              color: '#fff', fontWeight: 700, fontSize: '0.82rem',
              textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 7,
              boxShadow: '0 4px 12px rgba(184,118,30,0.3)',
            }}
          >
            + Nuevo producto
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          id="products-search"
          type="text"
          placeholder="Buscar por nombre o descripción..."
          onChange={e => handleSearchChange(e.target.value)}
          style={{
            flex: 1, minWidth: 200, padding: '10px 14px', borderRadius: 8,
            border: '1px solid #d9d4cd', background: '#faf9f7',
            fontSize: '0.85rem', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'inactive'] as const).map(f => (
            <button
              key={f}
              onClick={() => { setFilterActivo(f); setPage(1); }}
              style={{
                padding: '10px 16px', borderRadius: 8, border: '1.5px solid',
                borderColor: filterActivo === f ? '#b8761e' : '#d9d4cd',
                background: filterActivo === f ? '#fdf5e8' : '#faf9f7',
                color: filterActivo === f ? '#b8761e' : '#5a4a3a',
                fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
              }}
            >
              {f === 'all' ? 'Todos' : f === 'active' ? '● Activos' : '○ Inactivos'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className={styles.adminCard} style={{ padding: 0 }}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Producto</th>
                <th>Marca</th>
                <th>Género</th>
                <th>Stock total</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)' }}>
                    <div className={styles.spinner} style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>🧴</div>
                      <p>No se encontraron productos.</p>
                    </div>
                  </td>
                </tr>
              ) : products.flatMap(product => {
                const totalStock = product.presentaciones.reduce((acc, p) => acc + p.stock, 0);
                const minPrice = product.presentaciones.length > 0
                  ? Math.min(...product.presentaciones.map(p => Number(p.precio)))
                  : 0;
                const isExpanded = expandedRows.has(product.id);
                const mainImageUrl = product.imagen_principal;

                return [
                  // Main row
                  <tr
                    key={product.id}
                    id={`product-row-${product.id}`}
                    onClick={() => toggleExpand(product.id)}
                    style={{ cursor: 'pointer', background: isExpanded ? '#faf6f0' : undefined }}
                  >
                    <td style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                      {isExpanded ? '▾' : '▸'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {/* Product thumbnail */}
                        <div style={{
                          width: 36, height: 36, borderRadius: 8, overflow: 'hidden',
                          background: '#f0ede8', flexShrink: 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {mainImageUrl
                            ? <img src={mainImageUrl} alt={product.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ fontSize: '1.1rem' }}>🧴</span>
                          }
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{product.nombre}</div>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                            desde {formatCurrency(minPrice)} · {product.presentaciones.length} presentación{product.presentaciones.length !== 1 ? 'es' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: '0.82rem' }}>{product.marca.nombre}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.82rem' }}>{product.genero}</td>
                    <td>
                      <StockBadge stock={totalStock} low={stockLow} critical={stockCritical} />
                    </td>
                    <td>
                      <button
                        id={`toggle-active-${product.id}`}
                        onClick={e => { e.stopPropagation(); handleToggleActive(product); }}
                        style={{
                          padding: '4px 12px', borderRadius: 999, border: 'none',
                          background: product.activo ? '#d1f2d3' : '#f8d7da',
                          color: product.activo ? '#166327' : '#721c24',
                          fontWeight: 700, fontSize: '0.7rem', cursor: 'pointer',
                        }}
                      >
                        {product.activo ? '● Activo' : '○ Inactivo'}
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionGroup} onClick={e => e.stopPropagation()}>
                        <Link
                          href={`/admin/products/${product.id}/editar`}
                          id={`edit-product-${product.id}`}
                          className={styles.btnView}
                          style={{ fontSize: '0.72rem' }}
                        >
                          ✏️ Editar
                        </Link>
                        <Link
                          href={`/catalogo/${product.slug}`}
                          className={styles.btnView}
                          id={`view-product-${product.id}`}
                          target="_blank"
                          style={{ fontSize: '0.72rem' }}
                        >
                          👁 Ver
                        </Link>
                        <button
                          id={`delete-product-${product.id}`}
                          className={styles.btnDiscard}
                          onClick={() => setDeleteModal({ id: product.id, nombre: product.nombre })}
                          style={{ fontSize: '0.72rem', padding: '5px 12px' }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>,

                  // Expanded presentation rows
                  ...(isExpanded ? product.presentaciones.map(pres => (
                    <tr key={`${product.id}-pres-${pres.id}`} style={{ background: '#f9f7f4' }}>
                      <td />
                      <td colSpan={2} style={{ paddingLeft: 56, fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        └ {pres.tamano_ml}ml — {formatCurrency(Number(pres.precio))}
                      </td>
                      <td colSpan={2}>
                        <StockBadge stock={pres.stock} low={stockLow} critical={stockCritical} />
                      </td>
                      <td colSpan={2} style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                        <Link
                          href={`/admin/products/${product.id}/editar`}
                          style={{ color: '#b8761e', textDecoration: 'none', fontWeight: 600 }}
                        >
                          Editar stock →
                        </Link>
                      </td>
                    </tr>
                  )) : []),
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            ← Anterior
          </button>
          <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
            Página {page} de {totalPages}
          </span>
          <button className={styles.pageBtn} onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Siguiente →
          </button>
        </div>
      )}
    </>
  );
}
