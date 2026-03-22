'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartItem, PerfumeSummaryResponse, PresentacionResponse } from '@/lib/types';

interface CartState {
  items: CartItem[];
  addItem: (perfume: PerfumeSummaryResponse, presentacion: PresentacionResponse, cantidad?: number) => void;
  removeItem: (presentacionId: string) => void;
  updateQuantity: (presentacionId: string, cantidad: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  totalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (perfume, presentacion, cantidad = 1) => {
        set((state) => {
          const existing = state.items.find(
            (i) => i.presentacion.id === presentacion.id
          );
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.presentacion.id === presentacion.id
                  ? { ...i, cantidad: Math.min(i.cantidad + cantidad, presentacion.stock) }
                  : i
              ),
            };
          }
          return { items: [...state.items, { perfume, presentacion, cantidad }] };
        });
      },

      removeItem: (presentacionId) =>
        set((state) => ({
          items: state.items.filter((i) => i.presentacion.id !== presentacionId),
        })),

      updateQuantity: (presentacionId, cantidad) =>
        set((state) => ({
          items:
            cantidad <= 0
              ? state.items.filter((i) => i.presentacion.id !== presentacionId)
              : state.items.map((i) =>
                  i.presentacion.id === presentacionId ? { ...i, cantidad } : i
                ),
        })),

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((sum, i) => sum + i.cantidad, 0),

      totalPrice: () =>
        get().items.reduce(
          (sum, i) => sum + i.presentacion.precio * i.cantidad,
          0
        ),
    }),
    { name: 'perfumeria-cart' }
  )
);
