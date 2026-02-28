// src/stores/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:   null,
      user:    null,
      tenant:  null,
      loading: false,

      setAuth: (token, user, tenant) => {
        // ✅ Mete slug nouvo a sèlman — pa touche pg-auth (zustand jere li)
        if (tenant?.slug) localStorage.setItem('plusgroup-slug', tenant.slug)
        set({ token, user, tenant, loading: false })
      },

      updateTenant: (updates) => set(state => ({
        tenant: { ...state.tenant, ...updates }
      })),

      setLoading: (loading) => set({ loading }),

      logout: () => {
        localStorage.removeItem('pg-auth')
        localStorage.removeItem('plusgroup-slug')
        localStorage.removeItem('plusgroup-token')
        localStorage.removeItem('plusgroup-user')
        localStorage.removeItem('plusgroup-tenant')
        set({ token: null, user: null, tenant: null, loading: false })
      },

      isAuthenticated: () => !!get().token,

      hasRole: (roles) => {
        const role = get().user?.role
        return Array.isArray(roles) ? roles.includes(role) : role === roles
      },
    }),
    {
      name: 'pg-auth',
      partialize: (s) => ({ token: s.token, user: s.user, tenant: s.tenant }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false)
          if (state.tenant?.slug) {
            localStorage.setItem('plusgroup-slug', state.tenant.slug)
          }
        }
      },
    }
  )
)
