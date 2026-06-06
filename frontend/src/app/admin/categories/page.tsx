'use client';
/**
 * Página de gestión de Categorías — /admin/categories
 *
 * - Lista todas las categorías (familias olfativas)
 * - Permite crear, editar y eliminar categorías
 * - Formulario inline (create) y modal (edit)
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api';
import styles from '../admin.module.css';

interface Categoria {
  id: string;
  nombre: string;
  slug: string;
  descripcion: string | null;
  created_at: string;
}

interface CategoriaForm {
  nombre: string;
  descripcion: string;
}

const EMPTY_FORM: CategoriaForm = { nombre: '', descripcion: '' };

/* ── Toast ──────────────────────────────────────────────────────────────────── */
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: '0.88rem', fontWeight: 600, display: 'flex', gap: 10, alignItems: 'center',
    }}>
      {type === 'success' ? '✓' : '✕'} {message}
    </div>
  );
}

/* ── Modal overlay ───────────────────────────────────────────────────────────── */
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.45)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', padding: 24,
    }} onClick={onClose}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: 32,
        width: '100%', maxWidth: 480,
        boxShadow: '0 24px 64px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1a1410' }}>{title}</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '1.2rem', color: '#8a7a6a', padding: 4,
          }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
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

/* ── Formulario reutilizable ─────────────────────────────────────────────────── */
function CategoriaFormFields({
  form,
  onChange,
  saving,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: CategoriaForm;
  onChange: (f: CategoriaForm) => void;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  submitLabel: string;
}) {
  return (
    <form onSubmit={onSubmit}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
        <div>
          <label style={labelStyle}>
            Nombre <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            id="categoria-nombre"
            type="text"
            value={form.nombre}
            onChange={e => onChange({ ...form, nombre: e.target.value })}
            placeholder="Ej. Oriental, Amaderado, Floral"
            style={inputStyle}
            required
            maxLength={100}
          />
        </div>
        <div>
          <label style={labelStyle}>Descripción</label>
          <textarea
            id="categoria-descripcion"
            value={form.descripcion}
            onChange={e => onChange({ ...form, descripcion: e.target.value })}
            placeholder="Descripción breve de la familia olfativa..."
            style={{ ...inputStyle, resize: 'vertical', minHeight: 80 }}
            maxLength={500}
          />
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d9d4cd',
            background: '#fff', color: '#5a4a3a', fontWeight: 600, cursor: 'pointer',
            fontSize: '0.85rem',
          }}
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '9px 24px', borderRadius: 8, border: 'none',
            background: saving ? '#d9d4cd' : 'linear-gradient(135deg, #b8761e, #d4943a)',
            color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem', transition: 'all 200ms',
          }}
        >
          {saving ? 'Guardando...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

/* ── Chip de familia olfativa ────────────────────────────────────────────────── */
const OLFACTIVE_COLORS: Record<string, { bg: string; color: string }> = {
  oriental:    { bg: '#fdf5e8', color: '#b8761e' },
  amaderado:   { bg: '#f0f4e8', color: '#4a7c2e' },
  floral:      { bg: '#fde8f4', color: '#9b2d7a' },
  fresco:      { bg: '#e8f4fd', color: '#1e6eb8' },
  cítrico:     { bg: '#fdf8e8', color: '#9b7a1e' },
  gourmand:    { bg: '#fde8e8', color: '#b81e1e' },
};

function OlfactiveChip({ nombre }: { nombre: string }) {
  const key = Object.keys(OLFACTIVE_COLORS).find(k => nombre.toLowerCase().includes(k));
  const colors = key ? OLFACTIVE_COLORS[key] : { bg: '#f4f1ed', color: '#6b5c4a' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: 20,
      fontSize: '0.73rem', fontWeight: 700,
      background: colors.bg, color: colors.color,
      border: `1px solid ${colors.color}33`,
    }}>
      {nombre}
    </span>
  );
}

/* ── Página principal ────────────────────────────────────────────────────────── */
export default function AdminCategoriesPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CategoriaForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingCat, setEditingCat] = useState<Categoria | null>(null);
  const [editForm, setEditForm] = useState<CategoriaForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  const fetchCategorias = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<Categoria[]>('/categories');
      setCategorias(data);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar las categorías');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCategorias(); }, [fetchCategorias]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminFetch<Categoria>('/admin/categories', {
        method: 'POST',
        body: JSON.stringify({
          nombre: createForm.nombre,
          descripcion: createForm.descripcion || null,
        }),
      });
      showToast(`Categoría "${createForm.nombre}" creada correctamente`);
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      fetchCategorias();
    } catch (err: any) {
      showToast(err.message ?? 'Error al crear la categoría', 'error');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(cat: Categoria) {
    setEditingCat(cat);
    setEditForm({
      nombre: cat.nombre,
      descripcion: cat.descripcion ?? '',
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCat) return;
    setEditing(true);
    try {
      await adminFetch<Categoria>(`/admin/categories/${editingCat.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: editForm.nombre,
          descripcion: editForm.descripcion || null,
        }),
      });
      showToast(`Categoría "${editForm.nombre}" actualizada`);
      setEditingCat(null);
      fetchCategorias();
    } catch (err: any) {
      showToast(err.message ?? 'Error al actualizar la categoría', 'error');
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete(cat: Categoria) {
    if (!confirm(`¿Eliminar la categoría "${cat.nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(cat.id);
    try {
      await adminFetch(`/admin/categories/${cat.id}`, { method: 'DELETE' });
      showToast(`Categoría "${cat.nombre}" eliminada`);
      fetchCategorias();
    } catch (err: any) {
      showToast(err.message ?? 'Error al eliminar la categoría', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Edit modal */}
      {editingCat && (
        <Modal title={`Editar categoría — ${editingCat.nombre}`} onClose={() => setEditingCat(null)}>
          <CategoriaFormFields
            form={editForm}
            onChange={setEditForm}
            saving={editing}
            onSubmit={handleEdit}
            onCancel={() => setEditingCat(null)}
            submitLabel="✓ Guardar cambios"
          />
        </Modal>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Categorías</h1>
          <p className={styles.pageSubtitle}>
            {loading ? 'Cargando...' : `${categorias.length} categoría${categorias.length !== 1 ? 's' : ''} registrada${categorias.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          id="btn-new-categoria"
          onClick={() => { setShowCreate(v => !v); setCreateForm(EMPTY_FORM); }}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: 10, border: 'none',
            background: showCreate ? '#e8e3dc' : 'linear-gradient(135deg, #b8761e 0%, #d4943a 100%)',
            color: showCreate ? '#6b5c4a' : '#fff',
            fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
            boxShadow: showCreate ? 'none' : '0 4px 12px rgba(184,118,30,0.3)',
            transition: 'all 200ms',
          }}
        >
          {showCreate ? '✕ Cancelar' : '+ Nueva Categoría'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={styles.adminCard} style={{ marginBottom: 24, border: '1.5px solid #f0c96a' }}>
          <div style={{ fontWeight: 700, color: '#b8761e', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🗂️</span> Nueva categoría
          </div>
          <CategoriaFormFields
            form={createForm}
            onChange={setCreateForm}
            saving={creating}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
            submitLabel="✓ Crear categoría"
          />
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className={styles.spinner} />
        </div>
      ) : error ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: '#dc2626', marginBottom: 12 }}>{error}</p>
          <button
            onClick={fetchCategorias}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#b8761e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      ) : categorias.length === 0 ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: '2rem', marginBottom: 12 }}>🗂️</p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>No hay categorías registradas.</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Crea una con el botón &quot;Nueva Categoría&quot;.</p>
        </div>
      ) : (
        <div className={styles.adminCard} style={{ padding: 0 }}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categorias.map(cat => (
                  <tr key={cat.id}>
                    <td style={{ fontWeight: 600 }}>
                      <OlfactiveChip nombre={cat.nombre} />
                    </td>
                    <td>
                      <span style={{
                        fontFamily: 'monospace', fontSize: '0.78rem',
                        background: '#f4f1ed', padding: '2px 8px', borderRadius: 4, color: '#6b5c4a',
                      }}>
                        {cat.slug}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.84rem', maxWidth: 300 }}>
                      {cat.descripcion
                        ? <span title={cat.descripcion}>{cat.descripcion.length > 80 ? cat.descripcion.slice(0, 80) + '…' : cat.descripcion}</span>
                        : <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          id={`btn-edit-cat-${cat.id.slice(0, 8)}`}
                          onClick={() => openEdit(cat)}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: '1.5px solid #d9d4cd',
                            background: '#fff', color: '#5a4a3a', fontWeight: 600,
                            fontSize: '0.78rem', cursor: 'pointer', transition: 'all 150ms',
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          id={`btn-delete-cat-${cat.id.slice(0, 8)}`}
                          onClick={() => handleDelete(cat)}
                          disabled={deletingId === cat.id}
                          style={{
                            padding: '6px 14px', borderRadius: 8,
                            border: '1.5px solid #fca5a5',
                            background: '#fef2f2', color: '#dc2626',
                            fontWeight: 600, fontSize: '0.78rem',
                            cursor: deletingId === cat.id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === cat.id ? 0.5 : 1,
                            transition: 'all 150ms',
                          }}
                        >
                          {deletingId === cat.id ? '...' : '🗑 Eliminar'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
