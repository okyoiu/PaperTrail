import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  server: {
    // Dev-only: lets tunnel tools (cloudflared/ngrok) reach the dev server.
    // Their hostname is random per run, so we allow all rather than hardcode one.
    allowedHosts: true,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RiceHack Quest',
        short_name: 'Quest',
        description: 'Explore campus, unlock locations, earn XP for reviews.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
  // maplibre-gl spins up its own worker via a URL Vite's dep optimizer
  // doesn't handle correctly when pre-bundled - excluding it avoids a
  // "maplibre-gl-worker.mjs" 404 that silently breaks map rendering.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
