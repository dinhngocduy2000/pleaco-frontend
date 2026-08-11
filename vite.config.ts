import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import viteReact from '@vitejs/plugin-react'
import path from 'path'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [
    tsconfigPaths({ projects: ['./tsconfig.json'] }),
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    viteReact(),
    tailwindcss(),
  ],
  server: { proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }, host: '0.0.0.0', port: 3000 },
  preview: { host: '0.0.0.0', port: 3000 },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') }, dedupe: ['react', 'react-dom'] },
  test: { globals: true, environment: 'jsdom', setupFiles: ['./src/tests/setup.ts'], css: true },
})
