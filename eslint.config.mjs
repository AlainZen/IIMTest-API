// @ts-check
import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

// Prettier s'occupe de la mise en forme, ESLint de la qualité du code.
export default tseslint.config(
  { ignores: ['dist', 'coverage'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  { rules: { 'no-console': ['error', { allow: ['error'] }], 'no-debugger': 'error' } },
  // Seul le démarrage du serveur a le droit d'écrire d'autres messages dans la console.
  { files: ['src/index.ts'], rules: { 'no-console': 'off' } },
)
