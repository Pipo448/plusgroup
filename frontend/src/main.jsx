// src/main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './i18n/config'  // ← AJOUTE SA LA A!
import App from './App'
import './index.css'

// ✅ NOUVO — Jere bouton back fizik nan APK Android
// Sa anpeche app la disparèt/fèmen otomatikman lè itilizatè peze
// back apre yon aksyon tankou window.print() oswa nenpòt lòt aktivite Android
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

if (Capacitor.isNativePlatform()) {
  CapacitorApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      // Nou sou premye paj la (pa gen istwa navigasyon) — kite app la fèmen nòmalman
      CapacitorApp.exitApp()
    }
  })
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  }
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '14px',
            borderRadius: '10px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
          },
          success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)