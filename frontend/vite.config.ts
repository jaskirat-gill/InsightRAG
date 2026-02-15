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
  },
})
