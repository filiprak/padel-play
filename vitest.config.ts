import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Backend unit tests run in node (Cloudflare `workerd` APIs are not needed:
// services take a `Db` / pure inputs, route adapters are thin).
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(import.meta.dirname, 'src'),
      '@shared': resolve(import.meta.dirname, 'shared'),
    },
  },
  test: {
    environment: 'node',
    include: ['functions/**/*.test.ts', 'shared/**/*.test.ts', 'db/**/*.test.ts'],
    globals: false,
    reporters: ['default'],
  },
})
