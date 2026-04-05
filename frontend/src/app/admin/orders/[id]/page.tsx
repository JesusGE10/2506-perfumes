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
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
              padding: '6px 14px', borderRadius: 20,
              background: '#f0ede8', color: '#6b5c4a',
              fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none',
              border: '1px solid #e0d9d0', transition: 'background 150ms',
            }}
          >
            ‹ Volver a pedidos
          </Link>
          <h1 className={styles.pageTitle}>Pedido #{order.id.slice(0, 8).toUpperCase()}</h1>
          <div style={{ marginTop: 8 }}>
            <StatusBadge estado={order.estado} />
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: 10 }}>
              {formatDate(order.created_at)}
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.actionGroup}>
          {/* WhatsApp contact */}
          <a
            id="whatsapp-contact-btn"
            href={`https://wa.me/${order.cliente_telefono.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola 👋, te contactamos de Perfumería 2506 sobre tu pedido #${order.id.slice(0,8).toUpperCase()}. ¿Cómo podemos ayudarte?`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 18px', borderRadius: 8,
              background: '#25D366', color: '#fff',
              fontSize: '0.85rem', fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            Contactar por WhatsApp
          </a>

          {/* Confirm/Discard — only for PENDIENTE */}
          {order.estado === 'pendiente' && (
            <>
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
            </>
          )}
        </div>
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
