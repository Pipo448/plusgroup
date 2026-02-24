// src/stores/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:   null,
      user:    null,
      tenant:  null,
      loading: true,

      setAuth: (token, user, tenant) => {
        // Sovgade slug nan localStorage pou interceptor api.js
        if (tenant?.slug) localStorage.setItem('plusgroup-slug', tenant.slug)
        set({ token, user, tenant, loading: false })
      },

      updateTenant: (tenant) => set({ tenant }),

      setLoading: (loading) => set({ loading }),

      logout: () => {
        localStorage.removeItem('pg-auth')
        localStorage.removeItem('plusgroup-slug')
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
        // Lè localStorage fin chaje, mete loading=false tousuit
        if (state) {
          state.setLoading(false)
          // Restore slug pou api interceptor
          if (state.tenant?.slug) {
            localStorage.setItem('plusgroup-slug', state.tenant.slug)
          }
        }
      },
    }
  )
)
