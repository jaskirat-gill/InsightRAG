import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // Needed for Docker
    watch: {
      usePolling: true, // Needed for Docker file watching on some systems
    },
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      // optional: these routes in your main.py are NOT under /api/v1
      "/plugins": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
      "/sync": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    }
  },
});
