import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Plusieurs fichiers de tests utilisent la même table : ils passent l'un après l'autre.
    fileParallelism: false,
    restoreMocks: true,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
