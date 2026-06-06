'use client';
/**
 * Página de gestión de Marcas — /admin/brands
 *
 * - Lista todas las marcas del catálogo
 * - Permite crear, editar y eliminar marcas
 * - Formulario inline (create) y modal (edit)
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api';
import styles from '../admin.module.css';

interface Marca {
  id: string;
  nombre: string;
  slug: string;
  pais_origen: string | null;
  logo_url: string | null;
  created_at: string;
  updated_at: string;
}

interface MarcaForm {
  nombre: string;
  pais_origen: string;
  logo_url: string;
}

const EMPTY_FORM: MarcaForm = { nombre: '', pais_origen: '', logo_url: '' };

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
function MarcaFormFields({
  form,
  onChange,
  saving,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  form: MarcaForm;
  onChange: (f: MarcaForm) => void;
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
            id="marca-nombre"
            type="text"
            value={form.nombre}
            onChange={e => onChange({ ...form, nombre: e.target.value })}
            placeholder="Ej. Dior, Chanel, Lattafa"
            style={inputStyle}
            required
            maxLength={150}
          />
        </div>
        <div>
          <label style={labelStyle}>País de origen</label>
          <input
            id="marca-pais"
            type="text"
            value={form.pais_origen}
            onChange={e => onChange({ ...form, pais_origen: e.target.value })}
            placeholder="Ej. Francia, Dubai"
            style={inputStyle}
            maxLength={100}
          />
        </div>
        <div>
          <label style={labelStyle}>URL del logo</label>
          <input
            id="marca-logo"
            type="url"
            value={form.logo_url}
            onChange={e => onChange({ ...form, logo_url: e.target.value })}
            placeholder="https://..."
            style={inputStyle}
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

/* ── Página principal ────────────────────────────────────────────────────────── */
export default function AdminBrandsPage() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<MarcaForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingMarca, setEditingMarca] = useState<Marca | null>(null);
  const [editForm, setEditForm] = useState<MarcaForm>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  const fetchMarcas = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<Marca[]>('/brands');
      setMarcas(data);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar las marcas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMarcas(); }, [fetchMarcas]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await adminFetch<Marca>('/admin/brands', {
        method: 'POST',
        body: JSON.stringify({
          nombre: createForm.nombre,
          pais_origen: createForm.pais_origen || null,
          logo_url: createForm.logo_url || null,
        }),
      });
      showToast(`Marca "${createForm.nombre}" creada correctamente`);
      setCreateForm(EMPTY_FORM);
      setShowCreate(false);
      fetchMarcas();
    } catch (err: any) {
      showToast(err.message ?? 'Error al crear la marca', 'error');
    } finally {
      setCreating(false);
    }
  }

  function openEdit(marca: Marca) {
    setEditingMarca(marca);
    setEditForm({
      nombre: marca.nombre,
      pais_origen: marca.pais_origen ?? '',
      logo_url: marca.logo_url ?? '',
    });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingMarca) return;
    setEditing(true);
    try {
      await adminFetch<Marca>(`/admin/brands/${editingMarca.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          nombre: editForm.nombre,
          pais_origen: editForm.pais_origen || null,
          logo_url: editForm.logo_url || null,
        }),
      });
      showToast(`Marca "${editForm.nombre}" actualizada`);
      setEditingMarca(null);
      fetchMarcas();
    } catch (err: any) {
      showToast(err.message ?? 'Error al actualizar la marca', 'error');
    } finally {
      setEditing(false);
    }
  }

  async function handleDelete(marca: Marca) {
    if (!confirm(`¿Eliminar la marca "${marca.nombre}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(marca.id);
    try {
      await adminFetch(`/admin/brands/${marca.id}`, { method: 'DELETE' });
      showToast(`Marca "${marca.nombre}" eliminada`);
      fetchMarcas();
    } catch (err: any) {
      showToast(err.message ?? 'Error al eliminar la marca', 'error');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Edit modal */}
      {editingMarca && (
        <Modal title={`Editar marca — ${editingMarca.nombre}`} onClose={() => setEditingMarca(null)}>
          <MarcaFormFields
            form={editForm}
            onChange={setEditForm}
            saving={editing}
            onSubmit={handleEdit}
            onCancel={() => setEditingMarca(null)}
            submitLabel="✓ Guardar cambios"
          />
        </Modal>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Marcas</h1>
          <p className={styles.pageSubtitle}>
            {loading ? 'Cargando...' : `${marcas.length} marca${marcas.length !== 1 ? 's' : ''} registrada${marcas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          id="btn-new-marca"
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
          {showCreate ? '✕ Cancelar' : '+ Nueva Marca'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={styles.adminCard} style={{ marginBottom: 24, border: '1.5px solid #f0c96a' }}>
          <div style={{ fontWeight: 700, color: '#b8761e', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🏷️</span> Nueva marca
          </div>
          <MarcaFormFields
            form={createForm}
            onChange={setCreateForm}
            saving={creating}
            onSubmit={handleCreate}
            onCancel={() => { setShowCreate(false); setCreateForm(EMPTY_FORM); }}
            submitLabel="✓ Crear marca"
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
            onClick={fetchMarcas}
            style={{ padding: '8px 18px', borderRadius: 8, background: '#b8761e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}
          >
            Reintentar
          </button>
        </div>
      ) : marcas.length === 0 ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: '2rem', marginBottom: 12 }}>🏷️</p>
          <p style={{ color: 'var(--color-text-muted)', marginBottom: 4 }}>No hay marcas registradas.</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Crea una con el botón &quot;Nueva Marca&quot;.</p>
        </div>
      ) : (
        <div className={styles.adminCard} style={{ padding: 0 }}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Logo</th>
                  <th>Nombre</th>
                  <th>Slug</th>
                  <th>País de origen</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {marcas.map(marca => (
                  <tr key={marca.id}>
                    <td>
                      {marca.logo_url ? (
                        <img
                          src={marca.logo_url}
                          alt={marca.nombre}
                          style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 6, background: '#f4f1ed', padding: 4 }}
                          onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <span style={{
                          display: 'inline-flex', width: 36, height: 36,
                          alignItems: 'center', justifyContent: 'center',
                          background: '#f4f1ed', borderRadius: 6, fontSize: '1.1rem',
                        }}>🏷️</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 600 }}>{marca.nombre}</td>
                    <td>
                      <span style={{
                        fontFamily: 'monospace', fontSize: '0.78rem',
                        background: '#f4f1ed', padding: '2px 8px', borderRadius: 4, color: '#6b5c4a',
                      }}>
                        {marca.slug}
                      </span>
                    </td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
                      {marca.pais_origen ?? <span style={{ opacity: 0.4 }}>—</span>}
                    </td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          id={`btn-edit-marca-${marca.id.slice(0, 8)}`}
                          onClick={() => openEdit(marca)}
                          style={{
                            padding: '6px 14px', borderRadius: 8, border: '1.5px solid #d9d4cd',
                            background: '#fff', color: '#5a4a3a', fontWeight: 600,
                            fontSize: '0.78rem', cursor: 'pointer', transition: 'all 150ms',
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          id={`btn-delete-marca-${marca.id.slice(0, 8)}`}
                          onClick={() => handleDelete(marca)}
                          disabled={deletingId === marca.id}
                          style={{
                            padding: '6px 14px', borderRadius: 8,
                            border: '1.5px solid #fca5a5',
                            background: '#fef2f2', color: '#dc2626',
                            fontWeight: 600, fontSize: '0.78rem',
                            cursor: deletingId === marca.id ? 'not-allowed' : 'pointer',
                            opacity: deletingId === marca.id ? 0.5 : 1,
                            transition: 'all 150ms',
                          }}
                        >
                          {deletingId === marca.id ? '...' : '🗑 Eliminar'}
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
