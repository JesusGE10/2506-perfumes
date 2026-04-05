'use client';
/**
 * Admin orders list — enhanced with:
 * - Pending summary card (count + total amount), WITHOUT "Ver pedidos" link (user is already here)
 * - Expandable row preview triggered by clicking anywhere on the row
 * - Preview includes shipping cost breakdown and discount
 * - WhatsApp contact button per order
 * - Confirm/Discard action buttons for PENDIENTE orders (inline modal confirm)
 * - Status filter tabs + pagination
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api';
import type { PedidoResponse, PaginatedResponse, EstadoPedidoEnum, OrdersSummary } from '@/lib/types';
import styles from '../admin.module.css';
import Link from 'next/link';

const STATUS_LABELS: Record<string, string> = {
  pendiente: 'Pendiente',
  confirmado: 'Confirmado',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const METODO_LABELS: Record<string, string> = {
  transferencia: 'Transferencia',
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
};

const FILTER_TABS = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: '⚠️ Pendientes' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'enviado', label: 'Enviados' },
  { value: 'entregado', label: 'Entregados' },
  { value: 'cancelado', label: 'Cancelados' },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(n: number) {
  return `$${Number(n).toFixed(2)}`;
}

function StatusBadge({ estado }: { estado: string }) {
  const cls = ({
    pendiente:  styles.statusPendiente,
    confirmado: styles.statusConfirmado,
    enviado:    styles.statusEnviado,
    entregado:  styles.statusEntregado,
    cancelado:  styles.statusCancelado,
  } as Record<string, string>)[estado] ?? '';
  return <span className={`${styles.statusBadge} ${cls}`}>{STATUS_LABELS[estado] ?? estado}</span>;
}

function whatsappUrl(phone: string, orderId: string): string {
  const phoneClean = phone.replace(/\D/g, '');
  const msg = encodeURIComponent(
    `Hola 👋, te contactamos de Perfumería 2506 en relación a tu pedido #${orderId.slice(0, 8).toUpperCase()}. ¿Cómo podemos ayudarte?`
  );
  return `https://wa.me/${phoneClean}?text=${msg}`;
}

/** Expandable order preview with shipping and discount lines */
function OrderItemsPreview({ order }: { order: PedidoResponse }) {
  const subtotal = Number(order.subtotal);
  const shipping = Number(order.costo_envio);
  const discount = Number(order.descuento_total);
  const total = Number(order.total);

  return (
    <div style={{
      background: 'linear-gradient(180deg, #faf9f7 0%, #f6f3ef 100%)',
      borderTop: '1px solid #e8e3dc',
      padding: '14px 20px',
    }}>
      <div style={{
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12,
      }}>
        Detalle del pedido
      </div>
      <table style={{ width: '100%', fontSize: '0.8rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ color: 'var(--color-text-muted)' }}>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Producto</th>
            <th style={{ textAlign: 'left', padding: '4px 8px', fontWeight: 600 }}>Tamaño</th>
            <th style={{ textAlign: 'center', padding: '4px 8px', fontWeight: 600 }}>Cant.</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Precio unit.</th>
            <th style={{ textAlign: 'right', padding: '4px 8px', fontWeight: 600 }}>Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map(item => {
            const unit = Number(item.precio_unitario);
            const disc = Number(item.descuento);
            const line = (unit - disc) * item.cantidad;
            return (
              <tr key={item.id} style={{ borderTop: '1px solid #f0ede8' }}>
                <td style={{ padding: '6px 8px', fontWeight: 600 }}>{item.perfume_nombre ?? '—'}</td>
                <td style={{ padding: '6px 8px' }}>{item.tamano_ml ? `${item.tamano_ml}ml` : '—'}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center' }}>×{item.cantidad}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', color: 'var(--color-text-muted)' }}>{formatCurrency(unit)}</td>
                <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700 }}>{formatCurrency(line)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ borderTop: '2px solid #e8e3dc', color: 'var(--color-text-muted)' }}>
            <td colSpan={4} style={{ padding: '6px 8px', textAlign: 'right', fontSize: '0.78rem' }}>Subtotal productos</td>
            <td style={{ padding: '6px 8px', textAlign: 'right', fontSize: '0.78rem' }}>{formatCurrency(subtotal)}</td>
          </tr>
          {shipping > 0 && (
            <tr style={{ color: 'var(--color-text-muted)' }}>
              <td colSpan={4} style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.78rem' }}>🚚 Envío</td>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.78rem' }}>+{formatCurrency(shipping)}</td>
            </tr>
          )}
          {discount > 0 && (
            <tr style={{ color: '#dc2626' }}>
              <td colSpan={4} style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.78rem' }}>🏷️ Descuento aplicado</td>
              <td style={{ padding: '4px 8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 700 }}>−{formatCurrency(discount)}</td>
            </tr>
          )}
          <tr style={{ borderTop: '1px solid #d9d4cd' }}>
            <td colSpan={4} style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 700, fontSize: '0.85rem' }}>Total</td>
            <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 800, color: '#b8761e', fontSize: '0.95rem' }}>{formatCurrency(total)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/** Inline confirmation modal (avoids window.confirm blocking issues) */
function ConfirmModal({
  message, onConfirm, onCancel, loading, confirmLabel, danger,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
  confirmLabel: string;
  danger?: boolean;
}) {
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
      onClick={onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, padding: '28px 32px',
          maxWidth: 420, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        }}
      >
        <p style={{ fontSize: '0.95rem', color: '#1a1410', marginBottom: 24, lineHeight: 1.5 }}>{message}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 8, border: '1px solid #d9d4cd',
              background: '#faf9f7', color: '#6b5c4a', cursor: 'pointer', fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '8px 20px', borderRadius: 8, border: 'none',
              background: danger ? '#dc2626' : '#16a34a', color: '#fff',
              cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700,
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<PedidoResponse[]>([]);
  const [summary, setSummary] = useState<OrdersSummary | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Modal state
  const [modal, setModal] = useState<{
    type: 'confirm' | 'discard';
    orderId: string;
    loading: boolean;
  } | null>(null);

  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (filterStatus) params.set('estado', filterStatus);
      const [data, sum] = await Promise.all([
        adminFetch<PaginatedResponse<PedidoResponse>>(`/admin/orders?${params.toString()}`),
        adminFetch<OrdersSummary>('/admin/orders/summary'),
      ]);
      setOrders(data.items);
      setTotal(data.total);
      setSummary(sum);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const totalPages = Math.ceil(total / pageSize);

  function openConfirm(orderId: string, type: 'confirm' | 'discard') {
    setModal({ type, orderId, loading: false });
  }

  async function executeAction() {
    if (!modal) return;
    setModal(m => m ? { ...m, loading: true } : null);
    try {
      const endpoint = modal.type === 'confirm'
        ? `/admin/orders/${modal.orderId}/confirm`
        : `/admin/orders/${modal.orderId}/discard`;
      await adminFetch(endpoint, { method: 'POST' });
      setModal(null);
      await fetchOrders();
    } catch (err: any) {
      setModal(null);
      setError(`Error: ${err.message}`);
    }
  }

  function toggleExpand(id: string) {
    setExpandedId(prev => (prev === id ? null : id));
  }

  function handleRowClick(e: React.MouseEvent, orderId: string) {
    const target = e.target as HTMLElement;
    const isActionEl = target.closest('a, button');
    if (!isActionEl) toggleExpand(orderId);
  }

  return (
    <>
      {/* Modal */}
      {modal && (
        <ConfirmModal
          message={
            modal.type === 'confirm'
              ? '¿Confirmar este pedido? El stock será decrementado inmediatamente.'
              : '¿Descartar este pedido? Se marcará como CANCELADO y el stock no se afectará.'
          }
          confirmLabel={modal.type === 'confirm' ? '✓ Confirmar pedido' : '✕ Descartar pedido'}
          danger={modal.type === 'discard'}
          loading={modal.loading}
          onConfirm={executeAction}
          onCancel={() => setModal(null)}
        />
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pedidos</h1>
          <p className={styles.pageSubtitle}>{total} pedido{total !== 1 ? 's' : ''} en total</p>
        </div>
      </div>

      {/* Pending summary card — WITHOUT "Ver pedidos" link (user is already here) */}
      {summary && summary.pending_count > 0 && (
        <div id="pending-summary-card" style={{
          display: 'flex', alignItems: 'center',
          background: 'linear-gradient(135deg, #b8761e 0%, #d4943a 100%)',
          borderRadius: 12, padding: '16px 24px', marginBottom: 20,
          boxShadow: '0 4px 16px rgba(184,118,30,0.25)',
          color: '#fff', gap: 12,
        }}>
          <span style={{ fontSize: '1.4rem' }}>⚑</span>
          <div style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3 }}>
            Tienes <strong>{summary.pending_count}</strong> pedido{summary.pending_count !== 1 ? 's' : ''} pendiente{summary.pending_count !== 1 ? 's' : ''}
            {' '}➜ <strong>${Number(summary.pending_total).toFixed(2)}</strong> por confirmar
          </div>
        </div>
      )}

      {/* Status filter tabs */}
      <div className={styles.filterTabs}>
        {FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            id={`filter-${tab.value || 'all'}`}
            className={`${styles.filterTab} ${filterStatus === tab.value ? styles.filterTabActive : ''}`}
            onClick={() => { setFilterStatus(tab.value); setPage(1); }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && <div style={{ color: 'var(--color-error)', marginBottom: 16, padding: '10px 14px', background: '#fee2e2', borderRadius: 8 }}>{error}</div>}

      {/* Table */}
      <div className={styles.adminCard} style={{ padding: 0, overflow: 'hidden' }}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 32 }}></th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Total</th>
                <th>Pago</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    Cargando...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📭</div>
                      <p>No hay pedidos con este estado.</p>
                    </div>
                  </td>
                </tr>
              ) : orders.flatMap(order => {
                const isExpanded = expandedId === order.id;
                const rows = [
                  <tr
                    key={order.id}
                    id={`order-row-${order.id}`}
                    style={{ cursor: 'pointer', userSelect: 'none' }}
                    onClick={(e) => handleRowClick(e, order.id)}
                  >
                    <td>
                      <span style={{
                        display: 'inline-block',
                        fontSize: '0.7rem', color: 'var(--color-text-muted)',
                        transition: 'transform 200ms',
                        transform: isExpanded ? 'rotate(90deg)' : 'none',
                        pointerEvents: 'none',
                      }}>▶</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{order.cliente_nombre}</td>
                    <td style={{ fontSize: '0.8rem' }}>{order.cliente_telefono}</td>
                    <td style={{ fontWeight: 700 }}>{formatCurrency(Number(order.total))}</td>
                    <td style={{ fontSize: '0.78rem' }}>{METODO_LABELS[order.metodo_pago] ?? order.metodo_pago}</td>
                    <td><StatusBadge estado={order.estado} /></td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.78rem' }}>
                      {formatDate(order.created_at)}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        {/* WhatsApp */}
                        <a
                          href={whatsappUrl(order.cliente_telefono, order.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          id={`whatsapp-${order.id}`}
                          title={`Contactar a ${order.cliente_nombre}`}
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            padding: '6px 10px', borderRadius: 6,
                            background: '#25D366', color: '#fff',
                            fontSize: '0.72rem', fontWeight: 700,
                            textDecoration: 'none',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                          </svg>
                          WA
                        </a>

                        {/* Confirm/Discard — only for PENDIENTE */}
                        {order.estado === 'pendiente' && (
                          <>
                            <button
                              id={`confirm-${order.id}`}
                              className={styles.btnConfirm}
                              onClick={(e) => { e.stopPropagation(); openConfirm(order.id, 'confirm'); }}
                              title="Confirmar pedido"
                            >
                              ✓
                            </button>
                            <button
                              id={`discard-${order.id}`}
                              className={styles.btnDiscard}
                              onClick={(e) => { e.stopPropagation(); openConfirm(order.id, 'discard'); }}
                              title="Cancelar pedido"
                            >
                              ✕
                            </button>
                          </>
                        )}

                        <Link href={`/admin/orders/${order.id}`} className={styles.btnView} id={`view-${order.id}`} title="Ver detalle">
                          👁
                        </Link>
                      </div>
                    </td>
                  </tr>
                ];

                if (isExpanded) {
                  rows.push(
                    <tr key={`${order.id}-preview`}>
                      <td colSpan={8} style={{ padding: 0 }}>
                        <OrderItemsPreview order={order} />
                      </td>
                    </tr>
                  );
                }

                return rows;
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
