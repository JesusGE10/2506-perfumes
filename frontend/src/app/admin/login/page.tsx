'use client';
/**
 * Admin login page — email + password form.
 * On success, stores the JWT and redirects to /admin/orders.
 */

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import apiFetch from '@/lib/api';
import type { TokenResponse } from '@/lib/types';
import styles from '../admin.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setToken } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiFetch<TokenResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setToken(data.access_token);
      router.push('/admin/orders');
    } catch (err: any) {
      setError(err.message ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <div className={styles.loginBrand}>
          <div className={styles.loginIcon}>✦</div>
          <h1 className={styles.loginTitle}>Panel de Administración</h1>
          <p className={styles.loginSubtitle}>Perfumes 2506</p>
        </div>

        <form className={styles.loginForm} onSubmit={handleSubmit} id="admin-login-form">
          {error && <div className={styles.loginError}>{error}</div>}

          <div>
            <label className="form-label" htmlFor="admin-email">Correo electrónico</label>
            <input
              id="admin-email"
              type="email"
              className="input"
              placeholder="admin@tutienda.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="form-label" htmlFor="admin-password">Contraseña</label>
            <input
              id="admin-password"
              type="password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="admin-login-submit"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '8px', padding: '13px' }}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}
