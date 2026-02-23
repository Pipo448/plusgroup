// src/stores/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:   null,
      user:    null,
      tenant:  null,
      loading: true, // ✅ true pa default — tann persist fin rehydrate

      setAuth: (token, user, tenant) => set({ token, user, tenant }),

      updateTenant: (tenant) => set({ tenant }),

      setLoading: (loading) => set({ loading }), // ✅ nouvo

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
      partialize: (s) => ({ token: s.token, user: s.user, tenant: s.tenant }),
      // ✅ Lè persist fin chaje localStorage, mete loading false
      onRehydrateStorage: () => (state) => {
        if (state) state.setLoading(false)
      },
    }
  )
)
