'use client';
/**
 * Formulario de creación de producto — /admin/products/nuevo
 *
 * El formulario incluye:
 * - Información básica (nombre, marca, categoría, género, descripción)
 * - Flags: activo, destacado, es_arabe, es_nuevo
 * - Presentaciones (tamaño + precio + stock), dinámicas
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import styles from '../../admin.module.css';

interface Marca { id: string; nombre: string; slug: string; }
interface Categoria { id: string; nombre: string; slug: string; }

interface PresentacionForm {
  tamano_ml: number | '';
  precio: number | '';
  stock: number | '';
}

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: '0.88rem', fontWeight: 600, display: 'flex', gap: 10,
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #d9d4cd', background: '#faf9f7',
  fontSize: '0.88rem', color: '#1a1410',
  outline: 'none', boxSizing: 'border-box' as const,
};

const selectStyle = { ...inputStyle, cursor: 'pointer' };

function FormField({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6b5c4a', marginBottom: 6 }}>
        {label}{required && <span style={{ color: '#dc2626', marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className={styles.adminCard} style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
        paddingBottom: 14, borderBottom: '1px solid #f0ede8',
      }}>
        <span>{icon}</span>
        <span className={styles.detailSectionTitle} style={{ margin: 0 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function CheckToggle({ id, label, checked, onChange }: {
  id: string; label: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <label htmlFor={id} style={{
      display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
      padding: '10px 14px', borderRadius: 8, border: '1px solid',
      borderColor: checked ? '#b8761e' : '#d9d4cd',
      background: checked ? '#fdf5e8' : '#faf9f7',
    }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#b8761e' }}
      />
      <span style={{ fontSize: '0.82rem', fontWeight: 600, color: checked ? '#b8761e' : '#5a4a3a' }}>
        {label}
      </span>
    </label>
  );
}

export default function NuevoProductoPage() {
  const router = useRouter();

  // Data for dropdowns
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Form state
  const [nombre, setNombre] = useState('');
  const [marcaId, setMarcaId] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [genero, setGenero] = useState<'hombre' | 'mujer' | 'unisex'>('unisex');
  const [descripcion, setDescripcion] = useState('');
  const [activo, setActivo] = useState(true);
  const [destacado, setDestacado] = useState(false);
  const [esArabe, setEsArabe] = useState(false);
  const [esNuevo, setEsNuevo] = useState(true);

  // Presentations
  const [presentaciones, setPresentaciones] = useState<PresentacionForm[]>([
    { tamano_ml: '', precio: '', stock: 0 }
  ]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  // Load brands and categories
  useEffect(() => {
    Promise.all([
      adminFetch<{ items: Marca[] }>('/brands?size=200').catch(() => adminFetch<Marca[]>('/brands')),
      adminFetch<{ items: Categoria[] }>('/categories?size=200').catch(() => adminFetch<Categoria[]>('/categories')),
    ]).then(([brandData, catData]) => {
      // Handle both paginated and array responses
      const brandList = Array.isArray(brandData) ? brandData : (brandData as any).items ?? [];
      const catList = Array.isArray(catData) ? catData : (catData as any).items ?? [];
      setMarcas(brandList);
      setCategorias(catList);
      if (brandList.length > 0) setMarcaId(brandList[0].id);
      if (catList.length > 0) setCategoriaId(catList[0].id);
    }).catch(() => {
      showToast('Error al cargar marcas y categorías', 'error');
    }).finally(() => setLoadingData(false));
  }, []);

  // Presentation management
  function addPresentacion() {
    setPresentaciones(prev => [...prev, { tamano_ml: '', precio: '', stock: 0 }]);
  }

  function removePresentacion(idx: number) {
    setPresentaciones(prev => prev.filter((_, i) => i !== idx));
  }

  function updatePresentacion(idx: number, field: keyof PresentacionForm, value: string) {
    setPresentaciones(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const num = value === '' ? '' : Number(value);
      return { ...p, [field]: num };
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!nombre.trim()) { showToast('El nombre es obligatorio', 'error'); return; }
    if (!marcaId) { showToast('Selecciona una marca', 'error'); return; }
    if (!categoriaId) { showToast('Selecciona una categoría', 'error'); return; }

    const validPresentaciones = presentaciones.filter(p => p.tamano_ml !== '' && p.precio !== '');
    for (const p of validPresentaciones) {
      if (Number(p.tamano_ml) <= 0) { showToast('El tamaño debe ser mayor a 0ml', 'error'); return; }
      if (Number(p.precio) <= 0) { showToast('El precio debe ser mayor a $0', 'error'); return; }
    }

    setSaving(true);
    try {
      await adminFetch('/admin/products', {
        method: 'POST',
        body: JSON.stringify({
          nombre: nombre.trim(),
          marca_id: marcaId,
          categoria_id: categoriaId,
          genero,
          descripcion: descripcion.trim() || null,
          activo,
          destacado,
          es_arabe: esArabe,
          es_nuevo: esNuevo,
          presentaciones: validPresentaciones.map(p => ({
            tamano_ml: Number(p.tamano_ml),
            precio: Number(p.precio),
            stock: Number(p.stock),
          })),
          notas: [],
        }),
      });
      showToast('Producto creado correctamente');
      setTimeout(() => router.push('/admin/products'), 1200);
    } catch (err: any) {
      showToast(err.message ?? 'Error al crear producto', 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loadingData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <button
            onClick={() => router.push('/admin/products')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 6,
              display: 'flex', alignItems: 'center', gap: 4, padding: 0,
            }}
          >
            ← Volver a productos
          </button>
          <h1 className={styles.pageTitle}>Nuevo producto</h1>
          <p className={styles.pageSubtitle}>Añade un perfume al catálogo</p>
        </div>
        <button
          form="product-form"
          type="submit"
          disabled={saving}
          style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: saving ? '#d9d4cd' : 'linear-gradient(135deg, #b8761e 0%, #d4943a 100%)',
            color: '#fff', fontWeight: 700, fontSize: '0.9rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            boxShadow: saving ? 'none' : '0 4px 12px rgba(184,118,30,0.3)',
          }}
        >
          {saving ? 'Guardando...' : '✓ Crear producto'}
        </button>
      </div>

      <form id="product-form" onSubmit={handleSubmit}>
        {/* Información básica */}
        <SectionCard title="Información básica" icon="📋">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <FormField label="Nombre del perfume" required>
              <input
                id="producto-nombre"
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                style={inputStyle}
                placeholder="Ej: Bois Sauvage"
                required
              />
            </FormField>
            <FormField label="Género" required>
              <select
                id="producto-genero"
                value={genero}
                onChange={e => setGenero(e.target.value as any)}
                style={selectStyle}
              >
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
                <option value="unisex">Unisex</option>
              </select>
            </FormField>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <FormField label="Marca" required>
              <select
                id="producto-marca"
                value={marcaId}
                onChange={e => setMarcaId(e.target.value)}
                style={selectStyle}
                required
              >
                {marcas.map(m => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Categoría" required>
              <select
                id="producto-categoria"
                value={categoriaId}
                onChange={e => setCategoriaId(e.target.value)}
                style={selectStyle}
                required
              >
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nombre}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Descripción" hint="Describe el perfume: inspiración, ocasión de uso, familia olfativa...">
            <textarea
              id="producto-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="Descripción del perfume..."
            />
          </FormField>
        </SectionCard>

        {/* Características */}
        <SectionCard title="Características" icon="🏷️">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <CheckToggle id="prod-activo" label="Activo (visible en tienda)" checked={activo} onChange={setActivo} />
            <CheckToggle id="prod-destacado" label="Destacado" checked={destacado} onChange={setDestacado} />
            <CheckToggle id="prod-arabe" label="Árabe / Oriental" checked={esArabe} onChange={setEsArabe} />
            <CheckToggle id="prod-nuevo" label="Nuevo en catálogo" checked={esNuevo} onChange={setEsNuevo} />
          </div>
        </SectionCard>

        {/* Presentaciones */}
        <SectionCard title="Presentaciones (tamaños y precios)" icon="💧">
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Añade todas las presentaciones disponibles (ej: 50ml, 100ml).
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {presentaciones.map((pres, idx) => (
              <div key={idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 10,
                background: '#faf9f7', padding: '12px 14px', borderRadius: 10,
                border: '1px solid #f0ede8', alignItems: 'end',
              }}>
                <FormField label="Tamaño (ml)" required={idx === 0}>
                  <input
                    id={`pres-tamano-${idx}`}
                    type="number"
                    min={1}
                    value={pres.tamano_ml}
                    onChange={e => updatePresentacion(idx, 'tamano_ml', e.target.value)}
                    style={inputStyle}
                    placeholder="Ej: 100"
                  />
                </FormField>
                <FormField label="Precio ($)" required={idx === 0}>
                  <input
                    id={`pres-precio-${idx}`}
                    type="number"
                    min={0.01}
                    step={0.01}
                    value={pres.precio}
                    onChange={e => updatePresentacion(idx, 'precio', e.target.value)}
                    style={inputStyle}
                    placeholder="Ej: 89.99"
                  />
                </FormField>
                <FormField label="Stock inicial">
                  <input
                    id={`pres-stock-${idx}`}
                    type="number"
                    min={0}
                    value={pres.stock}
                    onChange={e => updatePresentacion(idx, 'stock', e.target.value)}
                    style={inputStyle}
                    placeholder="0"
                  />
                </FormField>
                <div style={{ paddingBottom: 2 }}>
                  {presentaciones.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePresentacion(idx)}
                      style={{
                        padding: '10px 12px', borderRadius: 8, border: '1px solid #fca5a5',
                        background: '#fef2f2', color: '#dc2626', cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            id="btn-add-presentacion"
            onClick={addPresentacion}
            style={{
              padding: '10px 18px', borderRadius: 8,
              border: '1.5px dashed #d9d4cd',
              background: '#faf9f7', color: '#6b5c4a',
              fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
            }}
          >
            + Añadir presentación
          </button>
        </SectionCard>
      </form>
    </>
  );
}
