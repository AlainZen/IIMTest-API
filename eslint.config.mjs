// @ts-check
import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import tseslint from 'typescript-eslint'

// Prettier s'occupe de la mise en forme, ESLint de la qualité du code.
export default tseslint.config(
  { ignores: ['dist', 'dist-lambda', 'coverage'] },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  prettierConfig,
  { rules: { 'no-console': ['error', { allow: ['error'] }], 'no-debugger': 'error' } },
  // Seuls le démarrage du serveur et les scripts ont le droit d'écrire d'autres messages dans la console.
  { files: ['src/index.ts', 'scripts/**'], rules: { 'no-console': 'off' } },
  {
    files: ['scripts/**'],
    languageOptions: { globals: { console: 'readonly', process: 'readonly' } },
  },
)
