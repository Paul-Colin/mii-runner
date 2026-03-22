// packages/simulation/vite.config.ts
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@mii-engine/core': path.resolve(__dirname, '../core/src/index.ts'),
      // Redirige "buffer" vers le package npm browser-compatible
      buffer: 'buffer/',
    },
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat'],
    // Force Vite à pré-bundler buffer et mii-js ensemble
    // pour que le polyfill soit disponible avant mii-js
    include: ['buffer', '@pretendonetwork/mii-js'],
  },
  define: {
    global: 'globalThis',
  },
})