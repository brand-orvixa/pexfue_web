import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Dev: API calls to /api are proxied to the CodeIgniter server.
// Build: output goes into the CI4 public folder so one server hosts everything.
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/spa/' : '/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: { '/api': 'http://127.0.0.1:8090' },
  },
  build: { outDir: '../backend/public/spa', emptyOutDir: true },
}))
