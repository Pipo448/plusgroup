// src/stores/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import api from '../services/api'

const BRANCH_KEY      = 'plusgroup-branch-id'
const BRANCH_NAME_KEY = 'plusgroup-branch-name'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      token:      null,
      user:       null,
      tenant:     null,
      loading:    false,
      branchId:   null,
      branchName: null,

      setAuth: (token, user, tenant) => {
        if (tenant?.slug) localStorage.setItem('plusgroup-slug', tenant.slug)
        // Reset branchId ak header — evite vye sesyon kontamine nouvo a
        localStorage.removeItem(BRANCH_KEY)
        localStorage.removeItem(BRANCH_NAME_KEY)
        delete api.defaults.headers.common['X-Branch-Id']
        set({ token, user, tenant, loading: false, branchId: null, branchName: null })
      },

      // Sete branch manyèlman (admin ki chwazi branch)
      setBranch: (branchId, branchName = null) => {
        if (branchId) {
          localStorage.setItem(BRANCH_KEY, String(branchId))
          if (branchName) localStorage.setItem(BRANCH_NAME_KEY, branchName)
          api.defaults.headers.common['X-Branch-Id'] = String(branchId)
        } else {
          localStorage.removeItem(BRANCH_KEY)
          localStorage.removeItem(BRANCH_NAME_KEY)
          delete api.defaults.headers.common['X-Branch-Id']
        }
        set({ branchId: branchId || null, branchName: branchName || null })
      },

      // Apre login, detekte branch otomatikman pou kasye
      autoSetBranch: (userBranches = []) => {
        const { user } = get()

        // Admin pa bezwen auto-set — li chwazi branch li menm
        if (user?.role === 'admin') return

        // Kasye ak 1 sèl branch → sete otomatikman
        if (userBranches.length === 1) {
          const branch   = userBranches[0]
          const branchId = branch?.id || branch?.branchId
          const branchName = branch?.name || null
          if (branchId) {
            localStorage.setItem(BRANCH_KEY, String(branchId))
            if (branchName) localStorage.setItem(BRANCH_NAME_KEY, branchName) // ✅ Sove non tou
            api.defaults.headers.common['X-Branch-Id'] = String(branchId)
            set({ branchId: String(branchId), branchName })
          }
        }
        // Si kasye gen plizyè branch → kite li chwazi manyèlman
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
        localStorage.removeItem(BRANCH_KEY)
        localStorage.removeItem(BRANCH_NAME_KEY)
        delete api.defaults.headers.common['X-Branch-Id']
        delete api.defaults.headers.common['X-Tenant-Slug']
        delete api.defaults.headers.common['Authorization']
        set({ token: null, user: null, tenant: null, branchId: null, branchName: null, loading: false })
      },

      isAuthenticated: () => !!get().token,

      hasRole: (roles) => {
        const role = get().user?.role
        return Array.isArray(roles) ? roles.includes(role) : role === roles
      },
    }),
    {
      name: 'pg-auth',
      partialize: (s) => ({
        token:      s.token,
        user:       s.user,
        tenant:     s.tenant,
        branchId:   s.branchId,
        branchName: s.branchName,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.setLoading(false)
          if (state.tenant?.slug) {
            localStorage.setItem('plusgroup-slug', state.tenant.slug)
            api.defaults.headers.common['X-Tenant-Slug'] = state.tenant.slug
          }
          if (state.token) {
            api.defaults.headers.common['Authorization'] = 'Bearer ' + state.token
          }
          if (state.branchId) {
            localStorage.setItem(BRANCH_KEY, state.branchId)
            api.defaults.headers.common['X-Branch-Id'] = state.branchId
          }
          if (state.branchName) {
            localStorage.setItem(BRANCH_NAME_KEY, state.branchName)
          }
        }
      },
    }
  )
)
