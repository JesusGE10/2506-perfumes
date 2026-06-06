'use client';
/**
 * Página de gestión de Promociones — /admin/promotions
 *
 * - Lista todas las promociones con filtro activas/todas
 * - Muestra estado, tipo, descuento y vigencia
 * - Botones para activar/desactivar, editar y eliminar
 * - Botón para crear nueva promoción (→ /admin/promotions/nuevo)
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import styles from '../admin.module.css';

export interface Promocion {
  id: string;
  nombre: string;
  tipo: 'individual' | 'global' | 'paquete';
  descuento_porcentaje: number | null;
  descuento_fijo: number | null;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
  created_at: string;
}

/* ── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: '0.88rem', fontWeight: 600, display: 'flex', gap: 10, alignItems: 'center',
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

/* ── Tipo badge ──────────────────────────────────────────────────────────────── */
const TIPO_META = {
  individual: { label: 'Individual', bg: '#e8f0fd', color: '#1e4bb8', icon: '🎯' },
  global:     { label: 'Global',     bg: '#fdf5e8', color: '#b8761e', icon: '🌐' },
  paquete:    { label: 'Paquete',    bg: '#f0fdf4', color: '#16a34a', icon: '📦' },
};

function TipoBadge({ tipo }: { tipo: Promocion['tipo'] }) {
  const meta = TIPO_META[tipo] ?? { label: tipo, bg: '#f4f1ed', color: '#6b5c4a', icon: '??' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.73rem', fontWeight: 700,
      background: meta.bg, color: meta.color,
      border: `1px solid ${meta.color}33`,
    }}>
      {meta.icon} {meta.label}
    </span>
  );
}

/* ── Vigencia badge ──────────────────────────────────────────────────────────── */
function VigenciaStatus({ inicio, fin, activa }: { inicio: string; fin: string; activa: boolean }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(inicio);
  const end = new Date(fin);

  let label = '';
  let color = '';
  let bg = '';

  if (!activa) {
    label = 'Desactivada'; color = '#6b5c4a'; bg = '#f4f1ed';
  } else if (today < start) {
    label = 'Programada'; color = '#1e6bb8'; bg = '#e8f0fd';
  } else if (today > end) {
    label = 'Vencida'; color = '#dc2626'; bg = '#fef2f2';
  } else {
    label = 'Activa'; color = '#16a34a'; bg = '#f0fdf4';
  }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.73rem', fontWeight: 700,
      background: bg, color,
      border: `1px solid ${color}33`,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0,
      }} />
      {label}
    </span>
  );
}

/* ── Formatters ─────────────────────────────────────────────────────────────── */
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDescuento(promo: Promocion): string {
  if (promo.descuento_porcentaje !== null) return `${Number(promo.descuento_porcentaje).toFixed(0)}% dto.`;
  if (promo.descuento_fijo !== null) return `$${Number(promo.descuento_fijo).toFixed(2)} dto.`;
  return '—';
}

/* ── Página principal ────────────────────────────────────────────────────────── */
export default function AdminPromotionsPage() {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [filterActiva, setFilterActiva] = useState<'todas' | 'activas'>('todas');
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  const fetchPromociones = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const url = filterActiva === 'activas' ? '/admin/promotions?only_active=true' : '/admin/promotions';
      const data = await adminFetch<Promocion[]>(url);
      setPromociones(data);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar las promociones');
    } finally {
      setLoading(false);
    }
  }, [filterActiva]);

  useEffect(() => { fetchPromociones(); }, [fetchPromociones]);

  async function handleToggleActiva(promo: Promocion) {
    setTogglingId(promo.id);
    try {
      await adminFetch<Promocion>(`/admin/promotions/${promo.id}`, {
        method: 'PUT',
        body: JSON.stringify({ activa: !promo.activa }),
      });
      showToast(`"${promo.nombre}" ${!promo.activa ? 'activada' : 'desactivada'}`);
      fetchPromociones();
    } catch (err: any) {
      showToast(err.message ?? 'Error al cambiar estado', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  async function handleDelete(promo: Promocion) {
    if (!confirm(`¿Eliminar la promoción "${promo.nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(promo.id);
    try {
      await adminFetch(`/admin/promotions/${promo.id}`, { method: 'DELETE' });
      showToast(`Promoción "${promo.nombre}" eliminada`);
      fetchPromociones();
    } catch (err: any) {
      showToast(err.message ?? 'Error al eliminar la promoción', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  // Counts for filter badges
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const countActivas = promociones.filter(p => {
    const s = new Date(p.fecha_inicio), e = new Date(p.fecha_fin);
    return p.activa && s <= today && e >= today;
  }).length;

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Promociones</h1>
          <p className={styles.pageSubtitle}>
            {loading ? 'Cargando...' : `${promociones.length} promoción${promociones.length !== 1 ? 'es' : ''}`}
            {!loading && countActivas > 0 && (
              <span style={{ marginLeft: 8, color: '#16a34a', fontWeight: 700 }}>· {countActivas} activa{countActivas !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <Link
          id="btn-new-promocion"
          href="/admin/promotions/nuevo"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #b8761e 0%, #d4943a 100%)',
            color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(184,118,30,0.3)',
            textDecoration: 'none', transition: 'all 200ms',
          }}
        >
          + Nueva Promoción
        </Link>
      </div>

      {/* Filter tabs */}
      <div className={styles.filterTabs} style={{ marginBottom: 20 }}>
        <button
          className={`${styles.filterTab} ${filterActiva === 'todas' ? styles.filterTabActive : ''}`}
          onClick={() => setFilterActiva('todas')}
        >
          Todas
        </button>
        <button
          className={`${styles.filterTab} ${filterActiva === 'activas' ? styles.filterTabActive : ''}`}
          onClick={() => setFilterActiva('activas')}
        >
          Solo activas
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className={styles.spinner} />
        </div>
      ) : error ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>
          <button
            onClick={fetchPromociones}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#b8761e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      ) : promociones.length === 0 ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: '2rem', marginBottom: 12 }}>🎁</p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>
            {filterActiva === 'activas' ? 'No hay promociones activas en este momento.' : 'No hay promociones registradas.'}
          </p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>
            Crea una con el botón &quot;Nueva Promoción&quot;.
          </p>
        </div>
      ) : (
        <div className={styles.adminCard} style={{ padding: 0 }}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Descuento</th>
                  <th>Vigencia</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {promociones.map(promo => (
                  <tr key={promo.id}>
                    <td style={{ fontWeight: 600, maxWidth: 200 }}>
                      {promo.nombre}
                    </td>
                    <td>
                      <TipoBadge tipo={promo.tipo} />
                    </td>
                    <td style={{ fontWeight: 700, color: '#b8761e' }}>
                      {formatDescuento(promo)}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                      {formatDate(promo.fecha_inicio)} → {formatDate(promo.fecha_fin)}
                    </td>
                    <td>
                      <VigenciaStatus inicio={promo.fecha_inicio} fin={promo.fecha_fin} activa={promo.activa} />
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        {/* Toggle activa */}
                        <button
                          id={`btn-toggle-promo-${promo.id.slice(0, 8)}`}
                          onClick={() => handleToggleActiva(promo)}
                          disabled={togglingId === promo.id}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: '1.5px solid',
                            borderColor: promo.activa ? '#fca5a5' : '#bbf7d0',
                            background: promo.activa ? '#fef2f2' : '#f0fdf4',
                            color: promo.activa ? '#dc2626' : '#16a34a',
                            fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer',
                            opacity: togglingId === promo.id ? 0.5 : 1,
                            transition: 'all 150ms', whiteSpace: 'nowrap',
                          }}
                        >
                          {togglingId === promo.id ? '...' : promo.activa ? '✕ Desactivar' : '✓ Activar'}
                        </button>

                        {/* Edit */}
                        <Link
                          id={`btn-edit-promo-${promo.id.slice(0, 8)}`}
                          href={`/admin/promotions/${promo.id}/editar`}
                          style={{
                            padding: '6px 12px', borderRadius: 8, border: '1.5px solid #d9d4cd',
                            background: '#fff', color: '#5a4a3a', fontWeight: 600,
                            fontSize: '0.75rem', cursor: 'pointer', textDecoration: 'none',
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            transition: 'all 150ms',
                          }}
                        >
                          ✏️ Editar
                        </Link>

                        {/* Delete */}
                        <button
                          id={`btn-delete-promo-${promo.id.slice(0, 8)}`}
                          onClick={() => handleDelete(promo)}
                          disabled={deletingId === promo.id}
                          style={{
                            padding: '6px 12px', borderRadius: 8,
                            border: '1.5px solid #fca5a5',
                            background: '#fef2f2', color: '#dc2626',
                            fontWeight: 600, fontSize: '0.75rem',
                            cursor: deletingId === promo.id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === promo.id ? 0.5 : 1,
                            transition: 'all 150ms',
                          }}
                        >
                          {deletingId === promo.id ? '...' : '🗑'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
