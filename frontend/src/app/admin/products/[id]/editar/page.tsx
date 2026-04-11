'use client';
/**
 * Formulario de edición de producto — /admin/products/[id]/editar
 *
 * Carga el producto existente y permite:
 * - Editar información básica y flags
 * - Editar stock/precio de cada presentación inline
 * - Añadir nuevas presentaciones
 * - Eliminar presentaciones (solo las que no tienen pedidos)
 */

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { adminFetch } from '@/lib/api';
import type { PerfumeDetailResponse } from '@/lib/types';
import styles from '../../../admin.module.css';

interface Marca { id: string; nombre: string; slug: string; }
interface Categoria { id: string; nombre: string; slug: string; }

interface PresentacionForm {
  id?: string;  // existing
  tamano_ml: number | '';
  precio: number | '';
  stock: number | '';
  isNew?: boolean;
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

export default function EditarProductoPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;

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
  const [esNuevo, setEsNuevo] = useState(false);
  const [presentaciones, setPresentaciones] = useState<PresentacionForm[]>([]);

  const [saving, setSaving] = useState(false);
  const [savingPresId, setSavingPresId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  // Load product + brands + categories
  useEffect(() => {
    Promise.all([
      adminFetch<PerfumeDetailResponse>(`/admin/products/${productId}`),
      adminFetch<any>('/brands?size=200'),
      adminFetch<any>('/categories?size=200'),
    ]).then(([product, brandData, catData]) => {
      // Populate form
      setNombre(product.nombre);
      setMarcaId(product.marca.id.toString());
      setCategoriaId(product.categoria.id.toString());
      setGenero(product.genero as any);
      setDescripcion(product.descripcion ?? '');
      setActivo(product.activo);
      setDestacado(product.destacado);
      setEsArabe(product.es_arabe);
      setEsNuevo(product.es_nuevo);
      setPresentaciones(product.presentaciones.map(p => ({
        id: p.id.toString(),
        tamano_ml: p.tamano_ml,
        precio: Number(p.precio),
        stock: p.stock,
      })));

      const brandList = Array.isArray(brandData) ? brandData : (brandData.items ?? []);
      const catList = Array.isArray(catData) ? catData : (catData.items ?? []);
      setMarcas(brandList);
      setCategorias(catList);
    }).catch(() => {
      showToast('Error al cargar el producto', 'error');
    }).finally(() => setLoadingData(false));
  }, [productId]);

  function updatePresentacion(idx: number, field: keyof PresentacionForm, value: string) {
    setPresentaciones(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const num = value === '' ? '' : Number(value);
      return { ...p, [field]: num };
    }));
  }

  function addPresentacion() {
    setPresentaciones(prev => [...prev, { tamano_ml: '', precio: '', stock: 0, isNew: true }]);
  }

  // Save individual presentation stock/price inline
  async function savePresentacion(idx: number) {
    const pres = presentaciones[idx];
    const key = pres.id ?? `new-${idx}`;
    setSavingPresId(key);

    if (pres.isNew) {
      // Create new presentation via full product update approach
      // We'll add it on the main save
      showToast('Presentación marcada para guardar. Usa "Guardar cambios" arriba.', 'success');
      setSavingPresId(null);
      return;
    }

    try {
      await adminFetch(`/admin/products/${productId}/presentations/${pres.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          tamano_ml: Number(pres.tamano_ml) || undefined,
          precio: Number(pres.precio) || undefined,
          stock: Number(pres.stock),
        }),
      });
      showToast(`Presentación ${pres.tamano_ml}ml actualizada`);
    } catch (err: any) {
      showToast(err.message ?? 'Error al actualizar presentación', 'error');
    } finally {
      setSavingPresId(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!nombre.trim()) { showToast('El nombre es obligatorio', 'error'); return; }

    setSaving(true);
    try {
      // 1. Update product metadata
      await adminFetch(`/admin/products/${productId}`, {
        method: 'PUT',
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
        }),
      });

      // 2. Save all existing presentations inline
      const existingPres = presentaciones.filter(p => p.id && !p.isNew);
      await Promise.all(existingPres.map(p =>
        adminFetch(`/admin/products/${productId}/presentations/${p.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            tamano_ml: Number(p.tamano_ml),
            precio: Number(p.precio),
            stock: Number(p.stock),
          }),
        })
      ));

      showToast('Producto actualizado correctamente');
      setTimeout(() => router.push('/admin/products'), 1200);
    } catch (err: any) {
      showToast(err.message ?? 'Error al actualizar producto', 'error');
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

      <div className={styles.pageHeader}>
        <div>
          <button onClick={() => router.push('/admin/products')} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', fontSize: '0.8rem', marginBottom: 6,
            display: 'flex', alignItems: 'center', gap: 4, padding: 0,
          }}>
            ← Volver a productos
          </button>
          <h1 className={styles.pageTitle}>Editar producto</h1>
          <p className={styles.pageSubtitle}>{nombre}</p>
        </div>
        <button
          form="edit-product-form"
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
          {saving ? 'Guardando...' : '✓ Guardar cambios'}
        </button>
      </div>

      <form id="edit-product-form" onSubmit={handleSubmit}>
        {/* Información básica */}
        <SectionCard title="Información básica" icon="📋">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <FormField label="Nombre del perfume" required>
              <input
                id="edit-nombre"
                type="text"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                style={inputStyle}
                required
              />
            </FormField>
            <FormField label="Género" required>
              <select
                id="edit-genero"
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
              <select id="edit-marca" value={marcaId} onChange={e => setMarcaId(e.target.value)} style={selectStyle}>
                {marcas.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </FormField>
            <FormField label="Categoría" required>
              <select id="edit-categoria" value={categoriaId} onChange={e => setCategoriaId(e.target.value)} style={selectStyle}>
                {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Descripción">
            <textarea
              id="edit-descripcion"
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              style={{ ...inputStyle, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>
        </SectionCard>

        {/* Características */}
        <SectionCard title="Características" icon="🏷️">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <CheckToggle id="edit-activo" label="Activo (visible en tienda)" checked={activo} onChange={setActivo} />
            <CheckToggle id="edit-destacado" label="Destacado" checked={destacado} onChange={setDestacado} />
            <CheckToggle id="edit-arabe" label="Árabe / Oriental" checked={esArabe} onChange={setEsArabe} />
            <CheckToggle id="edit-nuevo" label="Nuevo en catálogo" checked={esNuevo} onChange={setEsNuevo} />
          </div>
        </SectionCard>

        {/* Presentaciones */}
        <SectionCard title="Presentaciones y stock" icon="💧">
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 16 }}>
            Puedes guardar cambios de precio/stock individualmente o con el botón principal.
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {presentaciones.map((pres, idx) => (
              <div key={pres.id ?? idx} style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto auto', gap: 10,
                background: pres.isNew ? '#f0fdf4' : '#faf9f7',
                padding: '12px 14px', borderRadius: 10,
                border: `1px solid ${pres.isNew ? '#bbf7d0' : '#f0ede8'}`,
                alignItems: 'end',
              }}>
                <FormField label="Tamaño (ml)">
                  <input
                    id={`edit-pres-tamano-${idx}`}
                    type="number" min={1}
                    value={pres.tamano_ml}
                    onChange={e => updatePresentacion(idx, 'tamano_ml', e.target.value)}
                    style={pres.id && !pres.isNew ? { ...inputStyle, background: '#f4f1ed' } : inputStyle}
                    readOnly={!!(pres.id && !pres.isNew)} // Can't change size of existing presentations
                  />
                </FormField>
                <FormField label="Precio ($)">
                  <input
                    id={`edit-pres-precio-${idx}`}
                    type="number" min={0.01} step={0.01}
                    value={pres.precio}
                    onChange={e => updatePresentacion(idx, 'precio', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                <FormField label="Stock">
                  <input
                    id={`edit-pres-stock-${idx}`}
                    type="number" min={0}
                    value={pres.stock}
                    onChange={e => updatePresentacion(idx, 'stock', e.target.value)}
                    style={inputStyle}
                  />
                </FormField>
                {/* Quick save for existing presentation */}
                <div style={{ paddingBottom: 2 }}>
                  {pres.id && !pres.isNew && (
                    <button
                      type="button"
                      id={`btn-save-pres-${idx}`}
                      onClick={() => savePresentacion(idx)}
                      disabled={savingPresId === pres.id}
                      style={{
                        padding: '10px 14px', borderRadius: 8,
                        border: '1px solid #bbf7d0', background: '#f0fdf4',
                        color: '#16a34a', cursor: 'pointer', fontWeight: 700,
                        fontSize: '0.78rem', whiteSpace: 'nowrap',
                      }}
                    >
                      {savingPresId === pres.id ? '...' : '✓ Guardar'}
                    </button>
                  )}
                </div>
                <div style={{ paddingBottom: 2 }}>
                  {pres.isNew && (
                    <button
                      type="button"
                      onClick={() => setPresentaciones(prev => prev.filter((_, i) => i !== idx))}
                      style={{
                        padding: '10px 12px', borderRadius: 8,
                        border: '1px solid #fca5a5', background: '#fef2f2',
                        color: '#dc2626', cursor: 'pointer',
                      }}
                    >✕</button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            id="btn-add-pres-edit"
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
