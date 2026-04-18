import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command }) => ({
  plugins: [react()],
  server: {
    host: true,      // 0.0.0.0 — tarmoqdagi barcha qurilmalar kirishi mumkin
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        cookieDomainRewrite: 'localhost',
      },
      '/uploads': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,   // Source map production da ko'rinmasin
    minify: 'esbuild',
  },
  // Production build da console.log va debugger o'chiriladi
  esbuild: command === 'build' ? {
    drop: ['debugger'],
    pure: ['console.log', 'console.warn', 'console.debug'],
  } : {},
}))