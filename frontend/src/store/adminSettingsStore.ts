/**
 * Admin Settings Store — persists per-admin configuration in localStorage.
 *
 * Thresholds control the stock "traffic light" indicator:
 * - stock === 0                     → AGOTADO    (red)
 * - stock <= stockCriticalThreshold → STOCK CRÍTICO (dark red)
 * - stock < stockLowThreshold       → STOCK BAJO (yellow/amber)
 * - stock >= stockLowThreshold      → DISPONIBLE (green)
 *
 * On login, settings are synced from the backend via GET /auth/me/settings.
 * The 'adminRol' field drives role-based UI gating in the sidebar and pages.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminSettingsState {
  stockLowThreshold: number;
  stockCriticalThreshold: number;
  adminNombre: string;
  adminFotoPerfil: string | null;
  // Role from JWT/backend — drives sidebar item visibility
  adminRol: string;

  // Actions
  setStockThresholds: (low: number, critical: number) => void;
  setAdminProfile: (nombre: string, foto: string | null, rol?: string) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: Pick<
  AdminSettingsState,
  'stockLowThreshold' | 'stockCriticalThreshold' | 'adminNombre' | 'adminFotoPerfil' | 'adminRol'
> = {
  stockLowThreshold: 15,
  stockCriticalThreshold: 5,
  adminNombre: 'Admin',
  adminFotoPerfil: null,
  adminRol: 'admin',
};

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setStockThresholds: (low: number, critical: number) =>
        set({ stockLowThreshold: low, stockCriticalThreshold: critical }),

      setAdminProfile: (nombre: string, foto: string | null, rol?: string) =>
        set({
          adminNombre: nombre,
          adminFotoPerfil: foto,
          ...(rol !== undefined ? { adminRol: rol } : {}),
        }),

      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'admin-settings',
    }
  )
);
