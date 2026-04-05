'use client';
/**
 * Admin dashboard — comprehensive analytics overview.
 *
 * Sections:
 * 1. Banner de pedidos pendientes
 * 2. KPI Cards: 12 métricas (ingresos, pedidos, promociones)
 * 3. Gráficos de barras con DatePicker (ventas por género, ingresos por género, pedidos por período)
 * 4. Tabla ranking top/bottom productos
 * 5. Carritos abandonados
 * 6. Estadísticas detalladas de promociones activas
 * 7. Lista de stock bajo con imágenes
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';
import { adminFetch } from '@/lib/api';
import type {
  DashboardMetrics,
  TopProductsResponse,
  GenderSalesItem,
  AbandonedCartItem,
  PromotionStat,
  OrdersByPeriodItem,
  LowStockItem,
} from '@/lib/types';
import styles from '../admin.module.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(n: number) {
  return `$${Number(n).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' });
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgoStr() {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 10);
}

const GENDER_LABELS: Record<string, string> = { hombre: 'Hombre', mujer: 'Mujer', unisex: 'Unisex' };
const GENDER_COLORS: Record<string, string> = { hombre: '#4a90d9', mujer: '#e07ab1', unisex: '#9b6dca' };

// Default stock thresholds — overridden by adminSettingsStore when available
const DEFAULT_LOW = 15;
const DEFAULT_CRITICAL = 5;

function getStockThresholds(): { low: number; critical: number } {
  try {
    const raw = localStorage.getItem('admin-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        low: parsed?.state?.stockLowThreshold ?? DEFAULT_LOW,
        critical: parsed?.state?.stockCriticalThreshold ?? DEFAULT_CRITICAL,
      };
    }
  } catch { /* SSR or missing */ }
  return { low: DEFAULT_LOW, critical: DEFAULT_CRITICAL };
}

function getStockLabel(stock: number, low: number, critical: number) {
  if (stock === 0) return { label: 'AGOTADO', color: '#dc2626', bg: '#fee2e2' };
  if (stock <= critical) return { label: `${stock} UNIDADES`, color: '#dc2626', bg: '#fecaca' };
  if (stock < low) return { label: `${stock} UNIDADES`, color: '#d97706', bg: '#fef3c7' };
  return { label: `${stock} UNIDADES`, color: '#16a34a', bg: '#dcfce7' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  id, label, value, sub, colorClass,
}: {
  id: string; label: string; value: string; sub?: string; colorClass?: 'gold' | 'green' | 'warning' | 'blue' | 'purple';
}) {
  const colorMap = {
    gold: '#b8761e',
    green: '#16a34a',
    warning: '#d97706',
    blue: '#2563eb',
    purple: '#7c3aed',
  };
  const color = colorClass ? colorMap[colorClass] : '#1a1410';
  return (
    <div className={styles.metricCard} id={id}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricValue} style={{ color, fontSize: '1.5rem', fontWeight: 800 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SectionCard({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div className={styles.adminCard} style={{ marginBottom: 24, ...style }}>
      <div className={styles.detailSectionTitle} style={{ marginBottom: 20 }}>{title}</div>
      {children}
    </div>
  );
}

function KpiSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{
        fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'var(--color-text-muted)',
        marginBottom: 10, paddingLeft: 2,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

/** DateRange picker for charts */
function DateRangePicker({
  dateFrom, dateTo, minDate, onChange,
}: {
  dateFrom: string; dateTo: string; minDate: string;
  onChange: (from: string, to: string) => void;
}) {
  function handleFrom(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val > dateTo) onChange(val, val);
    else onChange(val, dateTo);
  }
  function handleTo(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val < dateFrom) onChange(val, val);
    else onChange(dateFrom, val);
  }
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.78rem' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>Desde</span>
      <input
        type="date"
        value={dateFrom}
        min={minDate}
        max={dateTo}
        onChange={handleFrom}
        style={{
          border: '1px solid #d9d4cd', borderRadius: 6, padding: '4px 8px',
          fontSize: '0.78rem', background: '#faf9f7', color: '#1a1410', cursor: 'pointer',
        }}
      />
      <span style={{ color: 'var(--color-text-muted)' }}>hasta</span>
      <input
        type="date"
        value={dateTo}
        min={dateFrom}
        max={todayStr()}
        onChange={handleTo}
        style={{
          border: '1px solid #d9d4cd', borderRadius: 6, padding: '4px 8px',
          fontSize: '0.78rem', background: '#faf9f7', color: '#1a1410', cursor: 'pointer',
        }}
      />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ opacity: 0.5 }}>
      <div className={styles.metricsGrid}>
        {[...Array(12)].map((_, i) => (
          <div key={i} className={styles.metricCard} style={{ height: 86, background: '#f4f1ed', animation: 'pulse 1.5s ease infinite' }} />
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [topProducts, setTopProducts] = useState<TopProductsResponse | null>(null);
  const [abandonedCarts, setAbandonedCarts] = useState<AbandonedCartItem[]>([]);
  const [promoStats, setPromoStats] = useState<PromotionStat[]>([]);

  // Charts with date ranges
  const [genderSales, setGenderSales] = useState<GenderSalesItem[]>([]);
  const [ordersByPeriod, setOrdersByPeriod] = useState<OrdersByPeriodItem[]>([]);
  const [genderDateFrom, setGenderDateFrom] = useState(monthAgoStr());
  const [genderDateTo, setGenderDateTo] = useState(todayStr());
  const [ordersDateFrom, setOrdersDateFrom] = useState(monthAgoStr());
  const [ordersDateTo, setOrdersDateTo] = useState(todayStr());
  const [genderLoading, setGenderLoading] = useState(false);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [productsTab, setProductsTab] = useState<'top' | 'bottom'>('top');
  const [stockThresholds] = useState(getStockThresholds);

  // Admin creation date for min date limit
  const [adminCreatedAt, setAdminCreatedAt] = useState('2020-01-01');

  // Load gender sales with date range
  const loadGenderSales = useCallback(async (from: string, to: string) => {
    setGenderLoading(true);
    try {
      const data = await adminFetch<GenderSalesItem[]>(
        `/admin/metrics/sales-by-gender?date_from=${from}&date_to=${to}`
      );
      setGenderSales(data);
    } catch { /* silent */ } finally {
      setGenderLoading(false);
    }
  }, []);

  // Load orders by period with date range
  const loadOrdersByPeriod = useCallback(async (from: string, to: string) => {
    setOrdersLoading(true);
    try {
      const data = await adminFetch<OrdersByPeriodItem[]>(
        `/admin/metrics/orders-by-period?date_from=${from}&date_to=${to}`
      );
      setOrdersByPeriod(data);
    } catch { /* silent */ } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      try {
        // Try to get admin creation date from localStorage
        try {
          const raw = localStorage.getItem('admin-auth');
          if (raw) {
            const parsed = JSON.parse(raw);
            const created = parsed?.state?.user?.created_at;
            if (created) setAdminCreatedAt(created.slice(0, 10));
          }
        } catch { /* ignore */ }

        const [m, tp, ac, ps] = await Promise.all([
          adminFetch<DashboardMetrics>('/admin/metrics/dashboard'),
          adminFetch<TopProductsResponse>('/admin/metrics/top-products'),
          adminFetch<AbandonedCartItem[]>('/admin/metrics/abandoned-carts'),
          adminFetch<PromotionStat[]>('/admin/metrics/promotions-stats'),
        ]);
        setMetrics(m);
        setTopProducts(tp);
        setAbandonedCarts(ac);
        setPromoStats(ps);

        // Load charts
        await Promise.all([
          loadGenderSales(monthAgoStr(), todayStr()),
          loadOrdersByPeriod(monthAgoStr(), todayStr()),
        ]);
      } catch (err: any) {
        setError(err.message ?? 'Error al cargar métricas');
      } finally {
        setLoading(false);
      }
    }
    loadAll();
  }, [loadGenderSales, loadOrdersByPeriod]);

  const handleGenderDateChange = (from: string, to: string) => {
    setGenderDateFrom(from);
    setGenderDateTo(to);
    loadGenderSales(from, to);
  };

  const handleOrdersDateChange = (from: string, to: string) => {
    setOrdersDateFrom(from);
    setOrdersDateTo(to);
    loadOrdersByPeriod(from, to);
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !metrics) return <p style={{ color: 'var(--color-error)' }}>{error || 'Sin datos'}</p>;

  const pendingCount = metrics.orders.by_status['pendiente'] ?? 0;
  const activePromos = promoStats.filter(p => p.activa);

  const genderChartData = genderSales.map(g => ({
    name: GENDER_LABELS[g.genero] ?? g.genero,
    vendidos: g.total_vendido,
    ingresos: g.ingreso,
    fill: GENDER_COLORS[g.genero] ?? '#888',
  }));

  return (
    <>
      {/* ── Header ── */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Dashboard</h1>
          <p className={styles.pageSubtitle}>Resumen general de tu tienda</p>
        </div>
      </div>

      {/* ── Banner de pedidos pendientes ── */}
      {pendingCount > 0 && (
        <div className={styles.pendingAlert} id="dashboard-pending-alert">
          <span>
            ⚑ Tienes <strong>{pendingCount}</strong> pedido{pendingCount !== 1 ? 's' : ''} pendiente{pendingCount !== 1 ? 's' : ''}{' '}
            ➜ <strong>{formatCurrency(metrics.orders.pending_total)}</strong> por confirmar.
          </span>
          <Link href="/admin/orders" style={{
            color: '#92400e', fontWeight: 700, textDecoration: 'none',
            padding: '4px 12px', borderRadius: 20, background: 'rgba(255,255,255,0.5)',
            fontSize: '0.8rem', transition: 'background 150ms',
          }}>
            Ver pedidos →
          </Link>
        </div>
      )}

      {/* ── KPI Grid — Ingresos ── */}
      <KpiSection title="💰 Ingresos (pedidos confirmados)">
        <div className={styles.metricsGrid}>
          <KpiCard id="metric-revenue-today"  label="Ingresos de hoy"    value={formatCurrency(metrics.revenue.today)}       colorClass="gold" />
          <KpiCard id="metric-revenue-week"   label="Ingresos esta semana" value={formatCurrency(metrics.revenue.this_week)}  colorClass="gold" />
          <KpiCard id="metric-revenue-month"  label="Ingresos este mes"   value={formatCurrency(metrics.revenue.this_month)}  colorClass="gold" />
          <KpiCard id="metric-ticket-promedio" label="Ticket promedio del mes" value={formatCurrency(metrics.ticket_promedio_mes ?? 0)} colorClass="blue"
            sub={metrics.orders.this_month > 0 ? `${metrics.orders.this_month} pedidos confirmados` : 'Sin pedidos confirmados este mes'} />
        </div>
      </KpiSection>


      {/* ── KPI Grid — Pedidos ── */}
      <KpiSection title="📦 Pedidos">
        <div className={styles.metricsGrid}>
          <KpiCard id="metric-orders-today"     label="Pedidos hoy"       value={String(metrics.orders.today)} />
          <KpiCard id="metric-orders-week"      label="Pedidos esta semana" value={String(metrics.orders.this_week)} />
          <KpiCard id="metric-orders-month"     label="Pedidos este mes"  value={String(metrics.orders.this_month)} />
          <KpiCard id="metric-orders-pending"   label="Pendientes"        value={String(pendingCount)}
            colorClass={pendingCount > 0 ? 'warning' : undefined}
            sub={pendingCount > 0 ? formatCurrency(metrics.orders.pending_total) : undefined} />
          <KpiCard id="metric-orders-confirmed" label="Confirmados"       value={String(metrics.orders.by_status['confirmado'] ?? 0)}  colorClass="green" />
          <KpiCard id="metric-orders-cancelled" label="Cancelados"        value={String(metrics.orders.by_status['cancelado'] ?? 0)} />
        </div>
      </KpiSection>

      {/* ── KPI Grid — Promociones activas ── */}
      <KpiSection title="🏷️ Promociones activas">
        <div className={styles.metricsGrid}>
          <KpiCard id="metric-promos-count"   label="Promociones activas" value={String(metrics.promotions.active_count)} colorClass="purple" />
          <KpiCard id="metric-promos-revenue" label="Ingresos por promos" value={formatCurrency(metrics.promotions.active_revenue)} colorClass="purple" />
          <KpiCard id="metric-promos-orders"  label="Pedidos con promo"   value={String(metrics.promotions.active_orders)} colorClass="purple" />
        </div>
      </KpiSection>

      {/* ── Gráficos: Ventas e Ingresos por Género ── */}
      <SectionCard title="📊 Ventas e ingresos por género">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Pedidos confirmados en el rango seleccionado
          </p>
          <DateRangePicker
            dateFrom={genderDateFrom} dateTo={genderDateTo} minDate={adminCreatedAt}
            onChange={handleGenderDateChange}
          />
        </div>
        {genderLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>Cargando...</div>
        ) : genderChartData.every(d => d.vendidos === 0) ? (
          <div className={styles.emptyState} style={{ padding: '24px' }}>
            <div className={styles.emptyIcon}>📈</div>
            <p>No hay ventas confirmadas en este período.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Unidades vendidas
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={genderChartData} barSize={44} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} uds.`, 'Vendidos']} />
                  <Bar dataKey="vendidos" radius={[5, 5, 0, 0]}>
                    {genderChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                Ingresos generados ($)
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={genderChartData} barSize={44} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Ingresos']} />
                  <Bar dataKey="ingresos" radius={[5, 5, 0, 0]}>
                    {genderChartData.map((entry, i) => <Cell key={i} fill={entry.fill} opacity={0.8} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </SectionCard>

      {/* ── Gráfico: Pedidos e ingresos por período ── */}
      <SectionCard title="📅 Pedidos e ingresos diarios">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', margin: 0 }}>
            Solo pedidos confirmados
          </p>
          <DateRangePicker
            dateFrom={ordersDateFrom} dateTo={ordersDateTo} minDate={adminCreatedAt}
            onChange={handleOrdersDateChange}
          />
        </div>
        {ordersLoading ? (
          <div style={{ textAlign: 'center', padding: 24, color: 'var(--color-text-muted)' }}>Cargando...</div>
        ) : ordersByPeriod.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '24px' }}>
            <div className={styles.emptyIcon}>📅</div>
            <p>No hay pedidos confirmados en este período.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={ordersByPeriod} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0ede8" />
              <XAxis dataKey="dia" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
              <YAxis yAxisId="left" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip
                labelFormatter={(v) => `Día: ${v}`}
                formatter={(value, name) =>
                  name === 'ingresos' ? [formatCurrency(Number(value)), 'Ingresos'] : [`${value}`, 'Pedidos']
                }
              />
              <Legend formatter={(v) => v === 'pedidos' ? 'Pedidos' : 'Ingresos ($)'} />
              <Line yAxisId="left" type="monotone" dataKey="pedidos" stroke="#b8761e" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="ingresos" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </SectionCard>

      {/* ── Top/Bottom Products ── */}
      <SectionCard title="🏆 Rotación de productos">
        <div className={styles.filterTabs} style={{ marginBottom: 16 }}>
          <button
            id="tab-top-products"
            className={`${styles.filterTab} ${productsTab === 'top' ? styles.filterTabActive : ''}`}
            onClick={() => setProductsTab('top')}
          >↑ Mayor rotación</button>
          <button
            id="tab-bottom-products"
            className={`${styles.filterTab} ${productsTab === 'bottom' ? styles.filterTabActive : ''}`}
            onClick={() => setProductsTab('bottom')}
          >↓ Menor rotación</button>
        </div>
        {!topProducts || (productsTab === 'top' ? topProducts.top : topProducts.bottom).length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '24px' }}>
            <div className={styles.emptyIcon}>📦</div>
            <p>Sin datos de ventas aún.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Género</th>
                  <th>Uds. vendidas</th>
                  {productsTab === 'top' && <th>Ingreso generado</th>}
                </tr>
              </thead>
              <tbody>
                {(productsTab === 'top' ? topProducts.top : topProducts.bottom).map((p, idx) => (
                  <tr key={p.perfume_id}>
                    <td style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.perfume_nombre}</td>
                    <td style={{ textTransform: 'capitalize' }}>{GENDER_LABELS[p.genero ?? ''] ?? p.genero ?? '—'}</td>
                    <td>
                      <span style={{
                        padding: '2px 10px', borderRadius: 999,
                        background: p.total_vendido === 0 ? '#fee2e2' : '#dcfce7',
                        color: p.total_vendido === 0 ? '#dc2626' : '#16a34a',
                        fontWeight: 700, fontSize: '0.78rem',
                      }}>
                        {p.total_vendido} uds.
                      </span>
                    </td>
                    {productsTab === 'top' && (
                      <td style={{ fontWeight: 600, color: '#16a34a' }}>
                        {formatCurrency((p as any).ingreso_generado ?? 0)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Abandoned Carts ── */}
      <SectionCard title="🛒 Productos más abandonados en carritos">
        {abandonedCarts.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '24px' }}>
            <div className={styles.emptyIcon}>✅</div>
            <p>No hay carritos abandonados registrados.</p>
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Producto</th>
                  <th>Tamaño</th>
                  <th>Veces abandonado</th>
                </tr>
              </thead>
              <tbody>
                {abandonedCarts.map((item, idx) => (
                  <tr key={item.presentacion_id}>
                    <td style={{ color: 'var(--color-text-muted)', fontWeight: 700 }}>#{idx + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.perfume_nombre}</td>
                    <td>{item.tamano_ml}ml</td>
                    <td>
                      <span style={{
                        padding: '2px 10px', borderRadius: 999,
                        background: '#fef3c7', color: '#92400e',
                        fontWeight: 700, fontSize: '0.78rem',
                      }}>
                        {item.veces_abandonado}×
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      {/* ── Estadísticas Detalladas de Promociones ── */}
      {promoStats.length > 0 && (
        <SectionCard title="🏷️ Estadísticas de promociones">
          {/* Resumen de activas */}
          {activePromos.length > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #f3e8ff 0%, #ede9fe 100%)',
              border: '1px solid #c4b5fd', borderRadius: 10, padding: '14px 18px', marginBottom: 20,
            }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7c3aed', marginBottom: 10 }}>
                Resumen de promociones activas ({activePromos.length})
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#7c3aed' }}>Total ventas</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#5b21b6' }}>
                    {activePromos.reduce((s, p) => s + p.pedidos_count, 0)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#7c3aed' }}>Total ingresos</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#5b21b6' }}>
                    {formatCurrency(activePromos.reduce((s, p) => s + p.ingreso_neto, 0))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', color: '#7c3aed' }}>Total descuentos</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#dc2626' }}>
                    −{formatCurrency(activePromos.reduce((s, p) => s + p.descuento_otorgado, 0))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla detallada */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Promoción</th>
                  <th>Tipo</th>
                  <th>Estado</th>
                  <th>Período</th>
                  <th>Pedidos</th>
                  <th>Descuento otorgado</th>
                  <th>Ingreso neto</th>
                </tr>
              </thead>
              <tbody>
                {promoStats.map(p => (
                  <tr key={p.promocion_id}>
                    <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                    <td style={{ textTransform: 'capitalize', fontSize: '0.78rem' }}>{p.tipo}</td>
                    <td>
                      <span style={{
                        padding: '2px 9px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                        background: p.activa ? '#dcfce7' : '#f3f4f6',
                        color: p.activa ? '#16a34a' : '#6b7280',
                      }}>
                        {p.activa ? '● Activa' : '● Inactiva'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.76rem', color: 'var(--color-text-muted)' }}>
                      {formatDate(p.fecha_inicio)}{p.fecha_fin ? ` → ${formatDate(p.fecha_fin)}` : ' · Sin fin'}
                    </td>
                    <td style={{ fontWeight: 600 }}>{p.pedidos_count}</td>
                    <td style={{ color: '#dc2626', fontWeight: 600 }}>−{formatCurrency(p.descuento_otorgado)}</td>
                    <td style={{ color: '#16a34a', fontWeight: 600 }}>{formatCurrency(p.ingreso_neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}

      {/* ── Low Stock ── */}
      <div className={styles.adminCard}>
        <div className={styles.detailSectionTitle} style={{ marginBottom: 16 }}>
          ⚠️ Productos con stock bajo
          <span style={{ fontSize: '0.7rem', fontWeight: 400, color: 'var(--color-text-muted)', marginLeft: 8 }}>
            (umbral configurado: &lt;{stockThresholds.low} unidades)
          </span>
        </div>
        {metrics.low_stock.length === 0 ? (
          <div className={styles.emptyState} style={{ padding: '24px' }}>
            <div className={styles.emptyIcon}>✅</div>
            <p>Todos los productos tienen stock suficiente.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.low_stock.map(item => {
              const { label, color, bg } = getStockLabel(item.stock, stockThresholds.low, stockThresholds.critical);
              return (
                <div key={item.presentacion_id}
                  id={`low-stock-${item.presentacion_id}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 8, background: '#faf9f7',
                    border: '1px solid #f0ede8', gap: 12,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {item.imagen_url ? (
                      <img
                        src={item.imagen_url}
                        alt={item.perfume_nombre}
                        width={36} height={36}
                        style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #e8e3dc' }}
                        loading="lazy"
                      />
                    ) : (
                      <div style={{
                        width: 36, height: 36, borderRadius: 6, background: '#ede8e0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1rem',
                      }}>🧴</div>
                    )}
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.perfume_nombre}</span>
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: 6, fontSize: '0.78rem' }}>
                        {item.tamano_ml}ml
                      </span>
                    </div>
                  </div>
                  <span style={{
                    padding: '3px 12px', borderRadius: 999, fontSize: '0.72rem', fontWeight: 800,
                    color, background: bg, letterSpacing: '0.04em',
                  }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
