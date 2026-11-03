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
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**/*.ts'],
      // Le démarrage du serveur est vérifié par scripts/verifier-routes.sh.
      exclude: ['src/index.ts'],
      // Les fonctions restantes sont des protections contre une panne de la connexion.
      thresholds: {
        lines: 90,
        functions: 80,
        branches: 85,
        statements: 90,
      },
    },
  },
})
