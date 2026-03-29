'use client';
/**
 * Auth store — manages the admin JWT session.
 *
 * The token is persisted in localStorage so it survives page reloads.
 * On logout, it is cleared from both the store and localStorage.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AdminUser } from '@/lib/types';

interface AuthState {
  token: string | null;
  user: AdminUser | null;
  setToken: (token: string) => void;
  setUser: (user: AdminUser) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,

      setToken: (token: string) => set({ token }),
      setUser: (user: AdminUser) => set({ user }),

      logout: () => {
        set({ token: null, user: null });
      },

      isAuthenticated: () => {
        const { token } = get();
        if (!token) return false;
        // Basic expiry check by decoding JWT payload
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.exp > Date.now() / 1000;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'admin-auth',
      // Persist only the token — user will be re-fetched on load
      partialize: (state) => ({ token: state.token }),
    }
  )
);
