import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@mii-engine/core': path.resolve(__dirname, '../core/src/index.ts'),
    }
  },
  optimizeDeps: {
    exclude: ['@dimforge/rapier3d-compat']
  }
})
