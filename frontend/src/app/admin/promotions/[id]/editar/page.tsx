'use client';
/**
 * Formulario de edición de promoción — /admin/promotions/[id]/editar
 *
 * Carga la promoción existente, permite editar todos los campos
 * y guarda los cambios via PUT /admin/promotions/{id}.
 * Al guardar → redirige a /admin/promotions
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { adminFetch } from '@/lib/api';
import styles from '../../../admin.module.css';
import type { Promocion } from '../../page';

type TipoPromocion = 'individual' | 'global' | 'paquete';

interface PromocionForm {
  nombre: string;
  descuento_porcentaje: string;
  descuento_fijo: string;
  fecha_inicio: string;
  fecha_fin: string;
  activa: boolean;
}

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

export default function EditPromocionPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const promoId = params.id;

  const [promo, setPromo] = useState<Promocion | null>(null);
  const [form, setForm] = useState<PromocionForm | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchPromo = useCallback(async () => {
    setLoadingData(true);
    try {
      // Fetch all promotions and find by ID (no single-promotion GET endpoint is exposed publicly)
      const all = await adminFetch<Promocion[]>('/admin/promotions');
      const found = all.find(p => p.id === promoId);
      if (!found) {
        setError('Promoción no encontrada.');
        return;
      }
      setPromo(found);
      setForm({
        nombre: found.nombre,
        descuento_porcentaje: found.descuento_porcentaje !== null ? String(found.descuento_porcentaje) : '',
        descuento_fijo: found.descuento_fijo !== null ? String(found.descuento_fijo) : '',
        fecha_inicio: found.fecha_inicio,
        fecha_fin: found.fecha_fin,
        activa: found.activa,
      });
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar la promoción');
    } finally {
      setLoadingData(false);
    }
  }, [promoId]);

  useEffect(() => { fetchPromo(); }, [fetchPromo]);

  function setField<K extends keyof PromocionForm>(key: K, value: PromocionForm[K]) {
    setForm(f => f ? { ...f, [key]: value } : f);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError('');

    const hasDescuento = form.descuento_porcentaje !== '' || form.descuento_fijo !== '';
    if (!hasDescuento) {
      setError('Debes especificar al menos un tipo de descuento.');
      return;
    }
    if (form.fecha_fin < form.fecha_inicio) {
      setError('La fecha de fin debe ser posterior a la fecha de inicio.');
      return;
    }

    setSaving(true);
    try {
      await adminFetch(`/admin/promotions/${promoId}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: form.nombre,
          descuento_porcentaje: form.descuento_porcentaje !== '' ? parseFloat(form.descuento_porcentaje) : null,
          descuento_fijo: form.descuento_fijo !== '' ? parseFloat(form.descuento_fijo) : null,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          activa: form.activa,
        }),
      });
      router.push('/admin/promotions');
    } catch (err: any) {
      setError(err.message ?? 'Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  }

  // Loading state
  if (loadingData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  // Error state (not found)
  if (!form || !promo) {
    return (
      <div className={styles.adminCard} style={{ textAlign: 'center', padding: 48 }}>
        <p style={{ fontSize: '1.5rem', marginBottom: 12 }}>⚠️</p>
        <p style={{ color: '#dc2626', marginBottom: 16 }}>{error || 'Promoción no encontrada'}</p>
        <Link href="/admin/promotions" style={{ color: '#b8761e', fontWeight: 600 }}>← Volver a Promociones</Link>
      </div>
    );
  }

  const TIPO_META = {
    individual: { label: '🎯 Individual', desc: 'Aplica a productos específicos' },
    global:     { label: '🌐 Global',     desc: 'Aplica a todo el catálogo' },
    paquete:    { label: '📦 Paquete',    desc: 'Descuento en conjunto de productos' },
  };

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
          <h1 className={styles.pageTitle}>Editar Promoción</h1>
          <p className={styles.pageSubtitle} style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
            ID: {promoId}
          </p>
        </div>
      </div>

      <div className={styles.adminCard} style={{ maxWidth: 700 }}>
        {error && <ErrorBanner message={error} />}

        <form id="edit-promocion-form" onSubmit={handleSubmit}>
          {/* Nombre */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>
              Nombre <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="edit-promo-nombre"
              type="text"
              value={form.nombre}
              onChange={e => setField('nombre', e.target.value)}
              style={inputStyle}
              required
              maxLength={200}
            />
          </div>

          {/* Tipo (read-only en edición — no se puede cambiar el tipo de una promo existente) */}
          <div style={{ marginBottom: 20 }}>
            <label style={labelStyle}>Tipo de promoción</label>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 10,
              background: '#f4f1ed', border: '1.5px solid #d9d4cd',
              fontSize: '0.85rem', fontWeight: 600, color: '#6b5c4a',
            }}>
              {TIPO_META[promo.tipo as TipoPromocion]?.label ?? promo.tipo}
              <span style={{ fontSize: '0.72rem', color: '#8a7a6a', fontWeight: 400 }}>— no modificable</span>
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
                  id="edit-promo-pct"
                  type="number"
                  min={0} max={100} step={0.01}
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
                  id="edit-promo-fijo"
                  type="number"
                  min={0} step={0.01}
                  value={form.descuento_fijo}
                  onChange={e => setField('descuento_fijo', e.target.value)}
                  placeholder="Ej. 5.00"
                  style={inputStyle}
                />
              </div>
            </div>
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
                  id="edit-promo-inicio"
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
                  id="edit-promo-fin"
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

          {/* Activa toggle */}
          <div style={{ marginBottom: 28 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
              <div
                role="checkbox"
                aria-checked={form.activa}
                id="edit-promo-activa"
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
                  {form.activa ? 'Se aplicará en las fechas configuradas' : 'No se aplicará aunque esté en período de vigencia'}
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
              id="btn-save-promocion"
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
              {saving ? 'Guardando...' : '✓ Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
