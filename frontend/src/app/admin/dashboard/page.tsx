'use client';
/**
 * Admin dashboard — KPI metrics overview.
 *
 * Shows revenue (today, week, month, total), order counts by status,
 * and a low-stock alert list.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import type { DashboardMetrics } from '@/lib/types';
import styles from '../admin.module.css';

function formatCurrency(n: number) {
  return `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await adminFetch<DashboardMetrics>('/admin/metrics/dashboard');
        setMetrics(data);
      } catch (err: any) {
        setError(err.message ?? 'Error al cargar métricas');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className={styles.loadingScreen} style={{ minHeight: 'auto', padding: '60px' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  if (error || !metrics) {
    return <p style={{ color: 'var(--color-error)' }}>{error || 'Sin datos'}</p>;
  }

  const pendingCount = metrics.orders.by_status['pendiente'] ?? 0;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Resumen general de tu tienda</p>
        </div>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div className={styles.pendingAlert} id="dashboard-pending-alert">
          ⚠️ Tienes <strong>{pendingCount}</strong> pedido{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de confirmación.{' '}
          <Link href="/admin/orders?estado=pendiente" style={{ color: '#856404', textDecoration: 'underline' }}>
            Ver ahora →
          </Link>
        </div>
      )}

      {/* Revenue metrics */}
      <div className={styles.metricsGrid}>
        <div className={styles.metricCard} id="metric-revenue-today">
          <div className={styles.metricLabel}>Ingresos de hoy</div>
          <div className={`${styles.metricValue} ${styles.metricValueGold}`}>
            {formatCurrency(metrics.revenue.today)}
          </div>
        </div>
        <div className={styles.metricCard} id="metric-revenue-week">
          <div className={styles.metricLabel}>Esta semana</div>
          <div className={`${styles.metricValue} ${styles.metricValueGold}`}>
            {formatCurrency(metrics.revenue.this_week)}
          </div>
        </div>
        <div className={styles.metricCard} id="metric-revenue-month">
          <div className={styles.metricLabel}>Este mes</div>
          <div className={`${styles.metricValue} ${styles.metricValueGold}`}>
            {formatCurrency(metrics.revenue.this_month)}
          </div>
        </div>
        <div className={styles.metricCard} id="metric-revenue-total">
          <div className={styles.metricLabel}>Total acumulado</div>
          <div className={`${styles.metricValue} ${styles.metricValueGreen}`}>
            {formatCurrency(metrics.revenue.total)}
          </div>
        </div>
      </div>

      {/* Orders metrics */}
      <div className={styles.metricsGrid} style={{ marginTop: 0 }}>
        <div className={styles.metricCard} id="metric-orders-today">
          <div className={styles.metricLabel}>Pedidos hoy</div>
          <div className={styles.metricValue}>{metrics.orders.today}</div>
        </div>
        <div className={styles.metricCard} id="metric-orders-pending">
          <div className={styles.metricLabel}>Pendientes</div>
          <div className={styles.metricValue} style={{ color: pendingCount > 0 ? '#d97706' : '#1a1410' }}>
            {pendingCount}
          </div>
        </div>
        <div className={styles.metricCard} id="metric-orders-confirmed">
          <div className={styles.metricLabel}>Confirmados</div>
          <div className={`${styles.metricValue} ${styles.metricValueGreen}`}>
            {metrics.orders.by_status['confirmado'] ?? 0}
          </div>
        </div>
        <div className={styles.metricCard} id="metric-orders-cancelled">
          <div className={styles.metricLabel}>Cancelados</div>
          <div className={styles.metricValue} style={{ color: '#c0392b' }}>
            {metrics.orders.by_status['cancelado'] ?? 0}
          </div>
        </div>
      </div>

      {/* Low stock */}
      <div className={styles.adminCard} style={{ marginTop: 24 }}>
        <div className={styles.detailSectionTitle}>
          ⚠️ Productos con stock bajo (≤ 5 unidades)
        </div>
        {metrics.low_stock.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '24px' }}>
            <div className={styles.emptyIcon}>✅</div>
            <p>Todos los productos tienen stock suficiente.</p>
          </div>
        ) : (
          metrics.low_stock.map(item => (
            <div key={item.presentacion_id} className={styles.lowStockItem} id={`low-stock-${item.presentacion_id}`}>
              <div>
                <span style={{ fontWeight: 600 }}>{item.perfume_nombre}</span>
                <span style={{ color: 'var(--color-text-muted)', marginLeft: 6, fontSize: '0.82rem' }}>
                  {item.tamano_ml}ml
                </span>
              </div>
              <span className={item.stock === 0 ? styles.stockCritical : styles.stockWarning}>
                {item.stock === 0 ? '⛔ Sin stock' : `${item.stock} u.`}
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
