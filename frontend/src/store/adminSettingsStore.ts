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
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AdminSettingsState {
  stockLowThreshold: number;
  stockCriticalThreshold: number;
  adminNombre: string;
  adminFotoPerfil: string | null;

  // Actions
  setStockThresholds: (low: number, critical: number) => void;
  setAdminProfile: (nombre: string, foto: string | null) => void;
  reset: () => void;
}

const DEFAULT_SETTINGS: Pick<AdminSettingsState, 'stockLowThreshold' | 'stockCriticalThreshold' | 'adminNombre' | 'adminFotoPerfil'> = {
  stockLowThreshold: 15,
  stockCriticalThreshold: 5,
  adminNombre: 'Admin',
  adminFotoPerfil: null,
};

export const useAdminSettingsStore = create<AdminSettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setStockThresholds: (low: number, critical: number) =>
        set({ stockLowThreshold: low, stockCriticalThreshold: critical }),

      setAdminProfile: (nombre: string, foto: string | null) =>
        set({ adminNombre: nombre, adminFotoPerfil: foto }),

      reset: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'admin-settings',
    }
  )
);
