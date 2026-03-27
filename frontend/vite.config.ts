import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8000',
      '/ws/canvas': { target: 'ws://localhost:8000', ws: true },
      '/ws/task': { target: 'ws://localhost:8000', ws: true },
    },
  },
})
