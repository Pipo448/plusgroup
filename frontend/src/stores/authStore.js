// src/stores/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:  null,
      user:   null,
      tenant: null,

      setAuth: (token, user, tenant) => set({ token, user, tenant }),

      updateTenant: (tenant) => set({ tenant }),

      logout: () => {
        set({ token: null, user: null, tenant: null })
        localStorage.removeItem('pg-auth')
      },

      isAuthenticated: () => !!get().token,

      hasRole: (roles) => {
        const role = get().user?.role
        return Array.isArray(roles) ? roles.includes(role) : role === roles
      },
    }),
    {
      name: 'pg-auth',
      partialize: (s) => ({ token: s.token, user: s.user, tenant: s.tenant })
    }
  )
)
