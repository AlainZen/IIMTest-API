import { existsSync } from 'node:fs'
import { defineConfig } from 'vitest/config'

if (existsSync('.env')) process.loadEnvFile('.env')

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    restoreMocks: true,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
})
