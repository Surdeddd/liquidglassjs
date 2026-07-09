import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'memory-bank/**',
      'playwright-report/**',
      'test-results/**',
      '.vercel/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended
)
