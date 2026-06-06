'use client';
/**
 * Formulario de creación de nueva promoción — /admin/promotions/nuevo
 *
 * Campos: nombre, tipo, descuento_porcentaje | descuento_fijo,
 *         fecha_inicio, fecha_fin, activa (toggle).
 * Validación: al menos uno de los dos descuentos es obligatorio.
 * Al guardar → redirige a /admin/promotions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import styles from '../../admin.module.css';

type TipoPromocion = 'individual' | 'global' | 'paquete';

interface PromocionForm {
  nombre: string;
  tipo: TipoPromocion;
  descuento_porcentaje: string;
  descuento_fijo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
}

const today = new Date().toISOString().split('T')[0];
const EMPTY_FORM: PromocionForm = {
  nombre: '',
  tipo: 'global',
  descuento_porcentaje: '',
  descuento_fijo: '',
  fecha_inicio: today,
  fecha_fin: '',
  activa: true,
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #d9d4cd', background: '#faf9f7',
  fontSize: '0.88rem', color: '#1a1410', outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '0.76rem', fontWeight: 700,
  color: '#6b5c4a', marginBottom: 6,
};

/* ── Toast ──────────────────────────────────────────────────────────────────── */
function ErrorBanner({ message }: { message: string }) {
  return (
    <div style={{
      background: '#fdf0f0', border: '1px solid #f5c6cb',
      borderRadius: 8, padding: '12px 16px',
      fontSize: '0.85rem', color: '#721c24', marginBottom: 20,
    }}>
      ⚠️ {message}
    </div>
  );
}

export default function NewPromocionPage() {
  const router = useRouter();
  const [form, setForm] = useState<PromocionForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function setField<K extends keyof PromocionForm>(key: K, value: PromocionForm[K]) {
    setForm(f => ({ ...f, [key]: value }));
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Client-side validation
    const hasDescuento = form.descuento_porcentaje !== '' || form.descuento_fijo !== '';
    if (!hasDescuento) {
      setError('Debes especificar al menos un tipo de descuento (porcentaje o monto fijo).');
      return;
    }
    if (!form.fecha_fin) {
      setError('La fecha de fin es obligatoria.');
      return;
    }
    if (form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        nombre: form.nombre,
        tipo: form.tipo,
        fecha_inicio: form.fecha_inicio,
        fecha_fin: form.fecha_fin,
        activa: form.activa,
        descuento_porcentaje: form.descuento_porcentaje !== '' ? parseFloat(form.descuento_porcentaje) : null,
        descuento_fijo: form.descuento_fijo !== '' ? parseFloat(form.descuento_fijo) : null,
      };

      await adminFetch('/admin/promotions', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      router.push('/admin/promotions');
    } catch (err: any) {
      setError(err.message ?? 'Error al crear la promoción');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Link
              href="/admin/promotions"
              style={{ color: 'var(--color-text-muted)', textDecoration: 'none', fontSize: '0.82rem' }}
            >
              ← Promociones
            </Link>
          </div>
          <h1 className={styles.pageTitle}>Nueva Promoción</h1>
          <p className={styles.pageSubtitle}>Configura el descuento, tipo y vigencia</p>
        </div>
      </div>

      <div className={styles.adminCard} style={{ maxWidth: 700 }}>
        {error && <ErrorBanner message={error} />}

        <form id="create-promocion-form" onSubmit={handleSubmit}>
          {/* Nombre */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Nombre <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="promo-nombre"
              type="text"
              value={form.nombre}
              onChange={e => setField('nombre', e.target.value)}
              placeholder="Ej. Verano 2026, Black Friday, Descuento Oud"
              style={inputStyle}
              required
              maxLength={200}
            />
          </div>

          {/* Tipo */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Tipo de promoción <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {(['individual', 'global', 'paquete'] as TipoPromocion[]).map(tipo => {
                const meta = {
                  individual: { label: '🎯 Individual', desc: 'Aplica a productos específicos' },
                  global:     { label: '🌐 Global',     desc: 'Aplica a todo el catálogo' },
                  paquete:    { label: '📦 Paquete',    desc: 'Descuento en conjunto de productos' },
                };
                const isSelected = form.tipo === tipo;
                return (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => setField('tipo', tipo)}
                    style={{
                      flex: '1 1 140px', padding: '12px 16px', borderRadius: 10,
                      border: `2px solid ${isSelected ? '#b8761e' : '#d9d4cd'}`,
                      background: isSelected ? '#fdf5e8' : '#fff',
                      cursor: 'pointer', textAlign: 'left', transition: 'all 200ms',
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? '#b8761e' : '#1a1410', marginBottom: 2 }}>
                      {meta[tipo].label}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: '#8a7a6a' }}>{meta[tipo].desc}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Descuentos */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Descuento (al menos uno)</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...labelStyle, fontWeight: 500, color: '#8a7a6a', fontSize: '0.72rem' }}>
                  Porcentaje (%)
                </label>
                <input
                  id="promo-descuento-pct"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={form.descuento_porcentaje}
                  onChange={e => setField('descuento_porcentaje', e.target.value)}
                  placeholder="Ej. 20"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontWeight: 500, color: '#8a7a6a', fontSize: '0.72rem' }}>
                  Monto fijo ($)
                </label>
                <input
                  id="promo-descuento-fijo"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.descuento_fijo}
                  onChange={e => setField('descuento_fijo', e.target.value)}
                  placeholder="Ej. 5.00"
                  style={inputStyle}
                />
              </div>
            </div>
            <p style={{ fontSize: '0.73rem', color: '#8a7a6a', marginTop: 6 }}>
              Puedes establecer ambos; el sistema aplicará el que corresponda según el contexto.
            </p>
          </div>

          {/* Vigencia */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Vigencia</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div>
                <label style={{ ...labelStyle, fontWeight: 500, color: '#8a7a6a', fontSize: '0.72rem' }}>
                  Fecha inicio <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="promo-fecha-inicio"
                  type="date"
                  value={form.fecha_inicio}
                  onChange={e => setField('fecha_inicio', e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ ...labelStyle, fontWeight: 500, color: '#8a7a6a', fontSize: '0.72rem' }}>
                  Fecha fin <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="promo-fecha-fin"
                  type="date"
                  value={form.fecha_fin}
                  onChange={e => setField('fecha_fin', e.target.value)}
                  min={form.fecha_inicio}
                  style={inputStyle}
                  required
                />
              </div>
            </div>
          </div>

          {/* Estado activa */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div
                role="checkbox"
                aria-checked={form.activa}
                id="promo-activa-toggle"
                onClick={() => setField('activa', !form.activa)}
                style={{
                  width: 44, height: 24, borderRadius: 999, cursor: 'pointer',
                  background: form.activa ? '#16a34a' : '#d9d4cd',
                  position: 'relative', transition: 'background 250ms',
                  flexShrink: 0,
                }}
              >
                <div style={{
                  position: 'absolute', top: 3, left: form.activa ? 23 : 3,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'left 250ms',
                }} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#1a1410' }}>
                  {form.activa ? '✓ Promoción activa' : 'Promoción inactiva'}
                </div>
                <div style={{ fontSize: '0.73rem', color: '#8a7a6a' }}>
                  {form.activa ? 'Se aplicará automáticamente en las fechas configuradas' : 'No se aplicará aunque esté dentro del período de vigencia'}
                </div>
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: '1px solid #f0ede8' }}>
            <Link
              href="/admin/promotions"
              style={{
                padding: '10px 24px', borderRadius: 10, border: '1.5px solid #d9d4cd',
                background: '#fff', color: '#5a4a3a', fontWeight: 600, cursor: 'pointer',
                fontSize: '0.88rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
            >
              Cancelar
            </Link>
            <button
              id="btn-submit-promocion"
              type="submit"
              disabled={saving}
              style={{
                padding: '10px 28px', borderRadius: 10, border: 'none',
                background: saving ? '#d9d4cd' : 'linear-gradient(135deg, #b8761e, #d4943a)',
                color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '0.88rem', boxShadow: saving ? 'none' : '0 4px 12px rgba(184,118,30,0.3)',
                transition: 'all 200ms',
              }}
            >
              {saving ? 'Creando...' : '✓ Crear Promoción'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
