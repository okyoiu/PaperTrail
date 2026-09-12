import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // maplibre-gl spins up its own worker via a URL Vite's dep optimizer
  // doesn't handle correctly when pre-bundled - excluding it avoids a
  // "maplibre-gl-worker.mjs" 404 that silently breaks map rendering.
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
})
