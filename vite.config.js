import { readFileSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// maplibre v6 resolves its worker URL at runtime (`new URL(`./${name}`, ...)`),
// which the bundler can't follow, so neither the worker nor the shared chunk it
// imports ever get emitted - the production map stayed blank on a 404. Emit both
// verbatim and unhashed into /assets so the worker's relative
// `./maplibre-gl-shared.mjs` import resolves next to it. See setWorkerUrl in MapView.
function maplibreWorkerAssets() {
  return {
    name: 'maplibre-worker-assets',
    apply: 'build',
    generateBundle() {
      for (const name of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
        this.emitFile({
          type: 'asset',
          fileName: `assets/${name}`,
          source: readFileSync(`node_modules/maplibre-gl/dist/${name}`),
        })
      }
    },
  }
}

export default defineConfig({
  server: {
    // Dev-only: lets tunnel tools (cloudflared/ngrok) reach the dev server.
    // Their hostname is random per run, so we allow all rather than hardcode one.
    allowedHosts: true,
  },
  plugins: [
    react(),
    maplibreWorkerAssets(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'RiceHack Quest',
        short_name: 'Quest',
        description: 'Explore campus, unlock locations, earn XP for reviews.',
        theme_color: '#0f172a',
        background_color: '#0f172a',
        // fullscreen lets Android draw into the camera-cutout area; iOS falls back to standalone.
        display: 'fullscreen',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          // Android crops this one to its own shape, so the art sits inside a safe margin.
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
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
