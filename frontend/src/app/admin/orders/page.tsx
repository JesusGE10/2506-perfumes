'use client';
/**
 * Admin orders list — table with status filters and confirm/discard actions.
 *
 * - Shows a warning banner when there are PENDIENTE orders.
 * - Allows filtering by status via tab pills.
 * - Confirm/Discard buttons on each PENDIENTE row.
 * - Links to the full order detail view.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import type { PedidoResponse, PaginatedResponse, EstadoPedidoEnum } from '@/lib/types';
import styles from '../admin.module.css';

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
  const cls = {
    pendiente:  styles.statusPendiente,
    confirmado: styles.statusConfirmado,
    enviado:    styles.statusEnviado,
    entregado:  styles.statusEntregado,
    cancelado:  styles.statusCancelado,
  }[estado] ?? '';

  return (
    <span className={`${styles.statusBadge} ${cls}`}>
      {STATUS_LABELS[estado] ?? estado}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<PedidoResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const pageSize = 20;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(page), size: String(pageSize) });
      if (filterStatus) params.set('estado', filterStatus);
      const data = await adminFetch<PaginatedResponse<PedidoResponse>>(
        `/admin/orders?${params.toString()}`
      );
      setOrders(data.items);
      setTotal(data.total);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar pedidos');
    } finally {
      setLoading(false);
    }
  }, [page, filterStatus]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const pendingCount = orders.filter(o => o.estado === 'pendiente').length;
  const totalPages = Math.ceil(total / pageSize);

  async function handleConfirm(orderId: string) {
    if (!confirm('¿Confirmar este pedido? El stock será decrementado.')) return;
    setActionLoading(orderId);
    try {
      await adminFetch(`/admin/orders/${orderId}/confirm`, { method: 'POST' });
      await fetchOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDiscard(orderId: string) {
    if (!confirm('¿Descartar este pedido? Se marcará como CANCELADO.')) return;
    setActionLoading(orderId);
    try {
      await adminFetch(`/admin/orders/${orderId}/discard`, { method: 'POST' });
      await fetchOrders();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Pedidos</h1>
          <p className={styles.pageSubtitle}>{total} pedido{total !== 1 ? 's' : ''} en total</p>
        </div>
      </div>

      {/* Pending alert */}
      {pendingCount > 0 && (
        <div className={styles.pendingAlert} id="pending-alert">
          ⚠️ Tienes <strong>{pendingCount}</strong> pedido{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} sin confirmar.
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

      {/* Error */}
      {error && (
        <div style={{ color: 'var(--color-error)', marginBottom: 16 }}>{error}</div>
      )}

      {/* Table */}
      <div className={styles.adminCard} style={{ padding: 0 }}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
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
                  <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)' }}>
                    Cargando...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div className={styles.emptyState}>
                      <div className={styles.emptyIcon}>📭</div>
                      <p>No hay pedidos con este estado.</p>
                    </div>
                  </td>
                </tr>
              ) : orders.map(order => (
                <tr key={order.id} id={`order-row-${order.id}`}>
                  <td style={{ fontWeight: 600 }}>{order.cliente_nombre}</td>
                  <td>{order.cliente_telefono}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(Number(order.total))}</td>
                  <td>{METODO_LABELS[order.metodo_pago] ?? order.metodo_pago}</td>
                  <td><StatusBadge estado={order.estado} /></td>
                  <td style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>
                    {formatDate(order.created_at)}
                  </td>
                  <td>
                    <div className={styles.actionGroup}>
                      {order.estado === 'pendiente' && (
                        <>
                          <button
                            id={`confirm-${order.id}`}
                            className={styles.btnConfirm}
                            onClick={() => handleConfirm(order.id)}
                            disabled={actionLoading === order.id}
                          >
                            {actionLoading === order.id ? '...' : '✓ Confirmar'}
                          </button>
                          <button
                            id={`discard-${order.id}`}
                            className={styles.btnDiscard}
                            onClick={() => handleDiscard(order.id)}
                            disabled={actionLoading === order.id}
                          >
                            ✕ Descartar
                          </button>
                        </>
                      )}
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className={styles.btnView}
                        id={`view-${order.id}`}
                      >
                        👁 Ver
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
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
