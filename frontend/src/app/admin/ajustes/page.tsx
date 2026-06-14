'use client';
/**
 * Admin settings page — /admin/ajustes
 *
 * Sections:
 * 1. Perfil: nombre, email (readonly), foto de perfil (URL input)
 * 2. Contraseña: cambiar contraseña con verificación de actual
 * 3. Configuración de Stock: umbrales del semáforo con preview visual
 */

import { useState, useEffect } from 'react';
import { adminFetch } from '@/lib/api';
import { useAdminSettingsStore } from '@/store/adminSettingsStore';
import AvatarUploader from '@/components/admin/AvatarUploader';
import type { AdminUser } from '@/lib/types';
import styles from '../admin.module.css';

interface AdminSettings {
  stock_low_threshold: number;
  stock_critical_threshold: number;
}

// Toast notification component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', top: 24, right: 24, zIndex: 9999,
      background: type === 'success' ? '#16a34a' : '#dc2626',
      color: '#fff', borderRadius: 10, padding: '12px 20px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      fontSize: '0.88rem', fontWeight: 600,
      display: 'flex', alignItems: 'center', gap: 10,
      animation: 'slideInRight 250ms ease',
    }}>
      <span>{type === 'success' ? '✓' : '✕'}</span>
      {message}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className={styles.adminCard} style={{ marginBottom: 24 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
        paddingBottom: 16, borderBottom: '1px solid #f0ede8',
      }}>
        <span style={{ fontSize: '1.2rem' }}>{icon}</span>
        <div className={styles.detailSectionTitle} style={{ margin: 0 }}>{title}</div>
      </div>
      {children}
    </div>
  );
}

function FormField({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#6b5c4a', marginBottom: 6 }}>
        {label}
      </label>
      {children}
      {hint && <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 4 }}>{hint}</p>}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #d9d4cd', background: '#faf9f7',
  fontSize: '0.88rem', color: '#1a1410',
  outline: 'none', boxSizing: 'border-box' as const,
  transition: 'border-color 150ms',
};

const disabledInputStyle = { ...inputStyle, background: '#f4f1ed', color: '#9e8f7e', cursor: 'not-allowed' };

function SaveButton({ loading, label }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding: '10px 24px', borderRadius: 8, border: 'none',
        background: loading ? '#d9d4cd' : 'linear-gradient(135deg, #b8761e 0%, #d4943a 100%)',
        color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: loading ? 'not-allowed' : 'pointer',
        boxShadow: loading ? 'none' : '0 4px 12px rgba(184,118,30,0.3)',
        transition: 'all 150ms',
      }}
    >
      {loading ? 'Guardando...' : (label ?? 'Guardar cambios')}
    </button>
  );
}

// Stock preview pill
function StockPill({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      padding: '4px 14px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 800,
      color, background: bg, letterSpacing: '0.04em',
    }}>
      {label}
    </span>
  );
}

export default function AdminAjustesPage() {
  const { setStockThresholds, setAdminProfile } = useAdminSettingsStore();

  // Admin profile state
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  // Profile form
  const [profileNombre, setProfileNombre] = useState('');
  const [profileFoto, setProfileFoto] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Password form
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  // Stock settings
  const [stockLow, setStockLow] = useState(15);
  const [stockCritical, setStockCritical] = useState(5);
  const [savingStock, setSavingStock] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error' = 'success') {
    setToast({ message, type });
  }

  // Load admin data
  useEffect(() => {
    async function loadAdmin() {
      try {
        const [adminData, settingsData] = await Promise.all([
          adminFetch<AdminUser>('/auth/me'),
          adminFetch<AdminSettings>('/auth/me/settings'),
        ]);
        setAdmin(adminData);
        setProfileNombre(adminData.nombre);
        setProfileFoto(adminData.foto_perfil_url ?? '');
        setStockLow(settingsData.stock_low_threshold);
        setStockCritical(settingsData.stock_critical_threshold);
        // Sync store
        setStockThresholds(settingsData.stock_low_threshold, settingsData.stock_critical_threshold);
        setAdminProfile(adminData.nombre, adminData.foto_perfil_url ?? null);
      } catch {
        showToast('Error al cargar configuración', 'error');
      } finally {
        setLoadingProfile(false);
      }
    }
    loadAdmin();
  }, [setStockThresholds, setAdminProfile]);

  // Save profile
  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await adminFetch<AdminUser>('/auth/me', {
        method: 'PATCH',
        body: JSON.stringify({
          nombre: profileNombre || undefined,
          foto_perfil_url: profileFoto || undefined,
        }),
      });
      setAdmin(updated);
      setAdminProfile(updated.nombre, updated.foto_perfil_url ?? null);
      showToast('Perfil actualizado correctamente');
    } catch (err: any) {
      showToast(err.message ?? 'Error al actualizar perfil', 'error');
    } finally {
      setSavingProfile(false);
    }
  }

  // Save password
  async function handleSavePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwNew !== pwConfirm) {
      showToast('Las contraseñas nuevas no coinciden', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      await adminFetch('/auth/me/password', {
        method: 'PUT',
        body: JSON.stringify({ current_password: pwCurrent, new_password: pwNew }),
      });
      setPwCurrent('');
      setPwNew('');
      setPwConfirm('');
      showToast('Contraseña actualizada correctamente');
    } catch (err: any) {
      showToast(err.message ?? 'Error al cambiar contraseña', 'error');
    } finally {
      setSavingPassword(false);
    }
  }

  // Save stock settings
  async function handleSaveStock(e: React.FormEvent) {
    e.preventDefault();
    if (stockCritical >= stockLow) {
      showToast('El umbral crítico debe ser menor que el umbral bajo', 'error');
      return;
    }
    setSavingStock(true);
    try {
      const updated = await adminFetch<AdminSettings>('/auth/me/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          stock_low_threshold: stockLow,
          stock_critical_threshold: stockCritical,
        }),
      });
      setStockThresholds(updated.stock_low_threshold, updated.stock_critical_threshold);
      showToast('Configuración de stock guardada');
    } catch (err: any) {
      showToast(err.message ?? 'Error al guardar configuración', 'error');
    } finally {
      setSavingStock(false);
    }
  }

  if (loadingProfile) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
        <div className={styles.spinner} />
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Ajustes</h1>
          <p className={styles.pageSubtitle}>Perfil, contraseña y configuración del panel</p>
        </div>
      </div>

      {/* === Sección: Perfil ===*/}
      <SectionCard title="Perfil de administrador" icon="👤">
        <form onSubmit={handleSaveProfile}>
          {/* Avatar — binary uploader */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 24 }}>
            <div style={{ flexShrink: 0 }}>
              <AvatarUploader
                currentUrl={profileFoto || null}
                nombre={profileNombre || admin?.nombre}
                onSuccess={(url) => {
                  setProfileFoto(url);
                  setAdmin((prev) => prev ? { ...prev, foto_perfil_url: url } : prev);
                  setAdminProfile(profileNombre || admin?.nombre || '', url);
                  setAvatarError(null);
                  showToast('Foto de perfil actualizada');
                }}
                onError={(msg) => setAvatarError(msg)}
              />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>{admin?.nombre}</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>{admin?.email}</div>
              <span style={{
                display: 'inline-block', marginTop: 4,
                padding: '2px 10px', borderRadius: 999, fontSize: '0.68rem', fontWeight: 700,
                background: admin?.rol === 'super_admin' ? '#ede9fe' : '#f0ede8',
                color: admin?.rol === 'super_admin' ? '#7c3aed' : '#6b5c4a',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {admin?.rol === 'super_admin' ? '⭐ Super Admin' : 'Admin'}
              </span>
              {avatarError && (
                <p style={{ fontSize: '0.72rem', color: '#dc2626', marginTop: 6, maxWidth: 220 }}>
                  ⚠️ {avatarError}
                </p>
              )}
              <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                Haz clic en la foto para cambiarla
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Nombre para mostrar">
              <input
                id="ajustes-nombre"
                type="text"
                value={profileNombre}
                onChange={e => setProfileNombre(e.target.value)}
                style={inputStyle}
                placeholder="Tu nombre"
              />
            </FormField>
            <FormField label="Email">
              <input
                type="email"
                value={admin?.email ?? ''}
                disabled
                style={disabledInputStyle}
              />
            </FormField>
          </div>


          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <SaveButton loading={savingProfile} label="Guardar perfil" />
          </div>
        </form>
      </SectionCard>

      {/* === Sección: Contraseña === */}
      <SectionCard title="Cambiar contraseña" icon="🔒">
        <form onSubmit={handleSavePassword}>
          <FormField label="Contraseña actual">
            <input
              id="ajustes-pw-current"
              type="password"
              value={pwCurrent}
              onChange={e => setPwCurrent(e.target.value)}
              style={inputStyle}
              placeholder="••••••••"
              required
            />
          </FormField>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <FormField label="Nueva contraseña" hint="Mínimo 6 caracteres">
              <input
                id="ajustes-pw-new"
                type="password"
                value={pwNew}
                onChange={e => setPwNew(e.target.value)}
                style={inputStyle}
                placeholder="Nueva contraseña"
                required
              />
            </FormField>
            <FormField label="Confirmar nueva contraseña">
              <input
                id="ajustes-pw-confirm"
                type="password"
                value={pwConfirm}
                onChange={e => setPwConfirm(e.target.value)}
                style={{
                  ...inputStyle,
                  borderColor: pwConfirm && pwNew !== pwConfirm ? '#dc2626' : undefined,
                }}
                placeholder="Repite la contraseña"
                required
              />
              {pwConfirm && pwNew !== pwConfirm && (
                <p style={{ fontSize: '0.7rem', color: '#dc2626', marginTop: 4 }}>Las contraseñas no coinciden</p>
              )}
            </FormField>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <SaveButton loading={savingPassword} label="Cambiar contraseña" />
          </div>
        </form>
      </SectionCard>

      {/* === Sección: Semáforo de Stock === */}
      <SectionCard title="Configuración de stock" icon="📦">
        <form onSubmit={handleSaveStock}>
          <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 20, lineHeight: 1.6 }}>
            Define los umbrales del semáforo de stock para los productos en el dashboard y en el catálogo.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
            <FormField
              label="Umbral de Stock Bajo (STOCK BAJO)"
              hint="Productos con stock estrictamente menor a este número se marcan en amarillo"
            >
              <input
                id="ajustes-stock-low"
                type="number"
                min={1}
                max={999}
                value={stockLow}
                onChange={e => setStockLow(Number(e.target.value))}
                style={inputStyle}
              />
            </FormField>
            <FormField
              label="Umbral Crítico (STOCK CRÍTICO)"
              hint="Productos con stock en este número o menos se marcan en rojo (pero no en 0)"
            >
              <input
                id="ajustes-stock-critical"
                type="number"
                min={0}
                max={999}
                value={stockCritical}
                onChange={e => setStockCritical(Number(e.target.value))}
                style={inputStyle}
              />
            </FormField>
          </div>

          {/* Visual preview of the traffic light */}
          <div style={{
            background: '#faf9f7', border: '1px solid #f0ede8', borderRadius: 10, padding: '16px 20px', marginBottom: 20,
          }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: 12 }}>
              Preview del semáforo
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0ede8' }}>
                <span style={{ fontSize: '0.82rem' }}>Stock = <strong>0</strong></span>
                <StockPill label="AGOTADO" color="#dc2626" bg="#fee2e2" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0ede8' }}>
                <span style={{ fontSize: '0.82rem' }}>Stock ≤ <strong>{stockCritical}</strong></span>
                <StockPill label={`≤ ${stockCritical} UNIDADES`} color="#dc2626" bg="#fecaca" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0ede8' }}>
                <span style={{ fontSize: '0.82rem' }}>Stock &lt; <strong>{stockLow}</strong></span>
                <StockPill label={`< ${stockLow} UNIDADES`} color="#d97706" bg="#fef3c7" />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', background: '#fff', borderRadius: 8, border: '1px solid #f0ede8' }}>
                <span style={{ fontSize: '0.82rem' }}>Stock ≥ <strong>{stockLow}</strong></span>
                <StockPill label={`≥ ${stockLow} UNIDADES`} color="#16a34a" bg="#dcfce7" />
              </div>
            </div>
          </div>

          {stockCritical >= stockLow && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: '0.8rem', color: '#dc2626', fontWeight: 600 }}>
              ⚠️ El umbral crítico ({stockCritical}) debe ser menor que el umbral bajo ({stockLow})
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <SaveButton loading={savingStock} label="Guardar configuración" />
          </div>
        </form>
      </SectionCard>
    </>
  );
}
