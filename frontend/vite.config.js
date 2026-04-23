// frontend/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Cache these files so the app works offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
        runtimeCaching: [
          {
            // Cache API responses for 24h so users can view
            // their recommendations offline after first load
            urlPattern: /^https?:\/\/localhost:8000\/api\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 86400 },
            },
          },
        ],
      },
      manifest: {
        name: 'Rural Youth Pathways',
        short_name: 'Pathways',
        description: 'Career guidance for rural youth',
        theme_color: '#2d5a27',
        background_color: '#f0f4e8',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  server: {
    // Proxy /api calls to FastAPI during development
    // so React (port 3000) can talk to FastAPI (port 8000)
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
