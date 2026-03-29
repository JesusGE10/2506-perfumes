'use client';
/**
 * Admin order detail — full order view with confirm/discard actions.
 * Shows customer info, items, totals, and current status.
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import type { PedidoResponse } from '@/lib/types';
import styles from '../../admin.module.css';

const STATUS_LABELS: Record<string, string> = {
  pendiente:  '⚠️ Pendiente',
  confirmado: '✅ Confirmado',
  enviado:    '🚚 Enviado',
  entregado:  '🎉 Entregado',
  cancelado:  '❌ Cancelado',
};

const METODO_LABELS: Record<string, string> = {
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  pago_movil: 'Pago Móvil',
  zelle: 'Zelle',
};

function StatusBadge({ estado }: { estado: string }) {
  const cls = {
    pendiente:  styles.statusPendiente,
    confirmado: styles.statusConfirmado,
    enviado:    styles.statusEnviado,
    entregado:  styles.statusEntregado,
    cancelado:  styles.statusCancelado,
  }[estado] ?? '';

  return <span className={`${styles.statusBadge} ${cls}`}>{STATUS_LABELS[estado] ?? estado}</span>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatCurrency(n: number | string) {
  return `$${Number(n).toFixed(2)}`;
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [order, setOrder] = useState<PedidoResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await adminFetch<PedidoResponse>(`/admin/orders/${orderId}`);
        setOrder(data);
      } catch (err: any) {
        setError(err.message ?? 'Error al cargar el pedido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [orderId]);

  async function handleConfirm() {
    if (!confirm('¿Confirmar este pedido? El stock será decrementado inmediatamente.')) return;
    setActionLoading(true);
    try {
      const updated = await adminFetch<PedidoResponse>(`/admin/orders/${orderId}/confirm`, {
        method: 'POST',
      });
      setOrder(updated);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDiscard() {
    if (!confirm('¿Descartar este pedido? Se marcará como CANCELADO y el stock no se afectará.')) return;
    setActionLoading(true);
    try {
      const updated = await adminFetch<PedidoResponse>(`/admin/orders/${orderId}/discard`, {
        method: 'POST',
      });
      setOrder(updated);
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className={styles.loadingScreen} style={{ minHeight: 'auto', padding: '60px' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div>
        <p style={{ color: 'var(--color-error)' }}>{error || 'Pedido no encontrado'}</p>
        <Link href="/admin/orders" className="btn btn-ghost" style={{ marginTop: 16 }}>← Volver</Link>
      </div>
    );
  }

  const subtotal = Number(order.subtotal);
  const descuento = Number(order.descuento_total);
  const envio = Number(order.costo_envio);
  const total = Number(order.total);

  return (
    <>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <Link
            href="/admin/orders"
            style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 8 }}
          >
            ← Volver a pedidos
          </Link>
          <h1 className={styles.pageTitle}>Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
          <div style={{ marginTop: 8 }}>
            <StatusBadge estado={order.estado} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 10 }}>
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>

        {/* Action buttons — only for PENDIENTE */}
        {order.estado === 'pendiente' && (
          <div className={styles.actionGroup}>
            <button
              id="confirm-order-btn"
              className={styles.btnConfirm}
              style={{ fontSize: '0.85rem', padding: '10px 20px' }}
              onClick={handleConfirm}
              disabled={actionLoading}
            >
              {actionLoading ? 'Procesando...' : '✓ Confirmar pedido'}
            </button>
            <button
              id="discard-order-btn"
              className={styles.btnDiscard}
              style={{ fontSize: '0.85rem', padding: '10px 20px' }}
              onClick={handleDiscard}
              disabled={actionLoading}
            >
              ✕ Descartar pedido
            </button>
          </div>
        )}
      </div>

      {/* Detail grid */}
      <div className={styles.orderDetail}>
        {/* Customer info */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>👤 Información del cliente</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Nombre</span>
            <span className={styles.detailValue}>{order.cliente_nombre}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Teléfono</span>
            <span className={styles.detailValue}>{order.cliente_telefono}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Dirección</span>
            <span className={styles.detailValue} style={{ textAlign: 'right', maxWidth: '60%' }}>{order.direccion}</span>
          </div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Método de pago</span>
            <span className={styles.detailValue}>{METODO_LABELS[order.metodo_pago] ?? order.metodo_pago}</span>
          </div>
        </div>

        {/* Order totals */}
        <div className={styles.detailSection}>
          <div className={styles.detailSectionTitle}>💰 Resumen financiero</div>
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Subtotal</span>
            <span className={styles.detailValue}>{formatCurrency(subtotal)}</span>
          </div>
          {descuento > 0 && (
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Descuento</span>
              <span className={styles.detailValue} style={{ color: '#2d7a4f' }}>−{formatCurrency(descuento)}</span>
            </div>
          )}
          <div className={styles.detailRow}>
            <span className={styles.detailLabel}>Costo de envío</span>
            <span className={styles.detailValue}>{formatCurrency(envio)}</span>
          </div>
          <div className={styles.detailRow} style={{ borderTop: '1px solid #e8e3dc', marginTop: 8, paddingTop: 12 }}>
            <span className={styles.detailLabel} style={{ fontWeight: 700 }}>TOTAL</span>
            <span className={styles.detailValue} style={{ fontSize: '1.2rem', color: '#b8761e' }}>
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        {/* Items — full width */}
        <div className={styles.detailSection} style={{ gridColumn: '1 / -1' }}>
          <div className={styles.detailSectionTitle}>🧴 Productos del pedido</div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tamaño</th>
                  <th>Cantidad</th>
                  <th>Precio unit.</th>
                  <th>Descuento</th>
                  <th>Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map(item => {
                  const unitPrice = Number(item.precio_unitario);
                  const discount = Number(item.descuento);
                  const lineTotal = (unitPrice - discount) * item.cantidad;
                  return (
                    <tr key={item.id}>
                      <td style={{ fontWeight: 600 }}>{item.perfume_nombre ?? '—'}</td>
                      <td>{item.tamano_ml ? `${item.tamano_ml}ml` : '—'}</td>
                      <td>{item.cantidad}</td>
                      <td>{formatCurrency(unitPrice)}</td>
                      <td>{discount > 0 ? `−${formatCurrency(discount)}` : '—'}</td>
                      <td style={{ fontWeight: 700 }}>{formatCurrency(lineTotal)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
