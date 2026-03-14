// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'chunk-sabotay':  ['./src/pages/enterprise/SabotayPage'],
          'chunk-hotel':    [
            './src/pages/hotel/HotelDashboard',
            './src/pages/hotel/ReservationsPage',
            './src/pages/hotel/NewReservationPage',
            './src/pages/hotel/ReservationDetail',
            './src/pages/hotel/NewRoomPage',
            './src/pages/hotel/RoomTypesPage',
          ],
          'chunk-enterprise': [
            './src/pages/enterprise/KanePage',
            './src/pages/enterprise/KaneEpayPage',
            './src/pages/enterprise/MobilPayPage',
          ],
          'chunk-invoices': [
            './src/pages/invoices/InvoicesPage',
            './src/pages/invoices/InvoiceDetail',
            './src/pages/invoices/NewInvoicePage',
          ],
          'chunk-admin': [
            './src/pages/admin/AdminDashboard',
            './src/pages/reports/ReportsPage',
          ],
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true }
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})