'use client';
/**
 * Página de gestión de usuarios admin — /admin/users
 *
 * Solo accesible para super_admin.
 * - Lista todos los admins (excepto el propio super_admin)
 * - Permite crear nuevos admins
 * - Permite activar/desactivar cuentas existentes
 */

import { useState, useEffect, useCallback } from 'react';
import { adminFetch } from '@/lib/api';
import { useAdminSettingsStore } from '@/store/adminSettingsStore';
import styles from '../admin.module.css';

interface AdminListItem {
  id: string;
  email: string;
  nombre: string;
  rol: string;
  activo: boolean;
  created_at: string;
  last_login: string | null;
}

interface CreateAdminForm {
  email: string;
  password: string;
  nombre: string;
  rol: 'admin' | 'super_admin';
}

const EMPTY_FORM: CreateAdminForm = { email: '', password: '', nombre: '', rol: 'admin' };

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-VE', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
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

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #d9d4cd', background: '#faf9f7',
  fontSize: '0.88rem', color: '#1a1410', outline: 'none',
  boxSizing: 'border-box',
};

export default function AdminUsersPage() {
  const { adminRol } = useAdminSettingsStore();
  const [admins, setAdmins] = useState<AdminListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<CreateAdminForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminFetch<AdminListItem[]>('/admin/users');
      setAdmins(data);
    } catch (err: any) {
      setError(err.message ?? 'Error al cargar los administradores');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.nombre) {
      showToast('Todos los campos son obligatorios', 'error');
      return;
    }
    setSaving(true);
    try {
      await adminFetch<AdminListItem>('/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      showToast(`Admin "${form.nombre}" creado correctamente`);
      setForm(EMPTY_FORM);
      setShowCreate(false);
      fetchAdmins();
    } catch (err: any) {
      showToast(err.message ?? 'Error al crear el administrador', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(admin: AdminListItem) {
    if (!confirm(`¿${admin.activo ? 'Desactivar' : 'Activar'} la cuenta de "${admin.nombre}"?`)) return;
    setTogglingId(admin.id);
    try {
      const updated = await adminFetch<AdminListItem>(`/admin/users/${admin.id}/toggle`, { method: 'PATCH' });
      showToast(`"${updated.nombre}" ${updated.activo ? 'activado' : 'desactivado'} correctamente`);
      fetchAdmins();
    } catch (err: any) {
      showToast(err.message ?? 'Error al cambiar estado', 'error');
    } finally {
      setTogglingId(null);
    }
  }

  // Guard: non-super_admin should not reach this page
  if (adminRol !== 'super_admin') {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ fontSize: '2rem', marginBottom: 16 }}>🔒</p>
        <h2 style={{ color: '#dc2626', marginBottom: 8 }}>Acceso Restringido</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Esta sección es exclusiva para Super Administradores.</p>
      </div>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Gestión de Administradores</h1>
          <p className={styles.pageSubtitle}>{admins.length} administrador{admins.length !== 1 ? 'es' : ''} registrado{admins.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          id="btn-new-admin"
          onClick={() => setShowCreate(v => !v)}
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
          {showCreate ? '✕ Cancelar' : '+ Nuevo Admin'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className={styles.adminCard} style={{ marginBottom: 24, border: '1.5px solid #f0c96a' }}>
          <div style={{ fontWeight: 700, color: '#b8761e', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>👤</span> Crear nuevo administrador
          </div>
          <form id="create-admin-form" onSubmit={handleCreate}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#6b5c4a', marginBottom: 6 }}>
                  Nombre completo <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="new-admin-nombre"
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. María García"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#6b5c4a', marginBottom: 6 }}>
                  Correo electrónico <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="new-admin-email"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="admin@ejemplo.com"
                  style={inputStyle}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#6b5c4a', marginBottom: 6 }}>
                  Contraseña inicial <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <input
                  id="new-admin-password"
                  type="password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Mín. 6 caracteres"
                  style={inputStyle}
                  minLength={6}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 700, color: '#6b5c4a', marginBottom: 6 }}>
                  Rol
                </label>
                <select
                  id="new-admin-rol"
                  value={form.rol}
                  onChange={e => setForm(f => ({ ...f, rol: e.target.value as any }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setForm(EMPTY_FORM); }}
                style={{
                  padding: '9px 20px', borderRadius: 8, border: '1.5px solid #d9d4cd',
                  background: '#fff', color: '#5a4a3a', fontWeight: 600, cursor: 'pointer',
                  fontSize: '0.85rem',
                }}
              >Cancelar</button>
              <button
                id="btn-submit-new-admin"
                type="submit"
                disabled={saving}
                style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: saving ? '#d9d4cd' : 'linear-gradient(135deg, #b8761e, #d4943a)',
                  color: '#fff', fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: '0.85rem',
                }}
              >{saving ? 'Creando...' : '✓ Crear administrador'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Admins table */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div className={styles.spinner} />
        </div>
      ) : error ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--color-error)' }}>{error}</p>
          <button onClick={fetchAdmins} style={{ marginTop: 12, padding: '8px 18px', borderRadius: 8, background: '#b8761e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            Reintentar
          </button>
        </div>
      ) : admins.length === 0 ? (
        <div className={styles.adminCard} style={{ textAlign: 'center', padding: 48 }}>
          <p style={{ fontSize: '1.5rem', marginBottom: 12 }}>👥</p>
          <p style={{ color: 'var(--color-text-muted)' }}>No hay otros administradores registrados.</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.82rem' }}>Crea uno con el botón "Nuevo Admin".</p>
        </div>
      ) : (
        <div className={styles.adminCard}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th>Último acceso</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {admins.map(admin => (
                  <tr key={admin.id}>
                    <td style={{ fontWeight: 600 }}>{admin.nombre}</td>
                    <td style={{ color: 'var(--color-text-muted)', fontSize: '0.83rem' }}>{admin.email}</td>
                    <td>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 20, fontSize: '0.73rem', fontWeight: 700,
                        background: admin.rol === 'super_admin' ? '#fdf5e8' : '#f0ede8',
                        color: admin.rol === 'super_admin' ? '#b8761e' : '#6b5c4a',
                        border: `1px solid ${admin.rol === 'super_admin' ? '#f0c96a' : '#d9d4cd'}`,
                      }}>
                        {admin.rol === 'super_admin' ? '⭐ Super Admin' : '👤 Admin'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        display: 'inline-block',
                        width: 8, height: 8, borderRadius: '50%',
                        background: admin.activo ? '#16a34a' : '#dc2626',
                        marginRight: 6,
                      }} />
                      <span style={{ fontSize: '0.82rem', color: admin.activo ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                        {admin.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formatDate(admin.created_at)}</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{formatDate(admin.last_login)}</td>
                    <td>
                      <button
                        id={`btn-toggle-admin-${admin.id.slice(0, 8)}`}
                        onClick={() => handleToggle(admin)}
                        disabled={togglingId === admin.id}
                        style={{
                          padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                          borderColor: admin.activo ? '#fca5a5' : '#bbf7d0',
                          background: admin.activo ? '#fef2f2' : '#f0fdf4',
                          color: admin.activo ? '#dc2626' : '#16a34a',
                          fontWeight: 700, fontSize: '0.76rem', cursor: 'pointer',
                          opacity: togglingId === admin.id ? 0.5 : 1,
                        }}
                      >
                        {togglingId === admin.id ? '...' : admin.activo ? '✕ Desactivar' : '✓ Activar'}
                      </button>
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
