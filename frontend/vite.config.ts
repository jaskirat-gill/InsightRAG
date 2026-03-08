import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
