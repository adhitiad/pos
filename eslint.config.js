//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
      'import/no-cycle': 'off',
      'import/order': 'off',
      'sort-imports': 'off',
      '@typescript-eslint/array-type': 'off',
      '@typescript-eslint/require-await': 'off',
      'pnpm/json-enforce-catalog': 'off',
      // Tangkap variabel/parameter tak terpakai (tsc sudah lewat
      // noUnusedLocals/noUnusedParameters, lint memberi pesan lebih jelas).
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrors: 'none',
          destructuredArrayIgnorePattern: '^_',
        },
      ],
    },
  },
  {
    ignores: [
      'eslint.config.js',
      'prettier.config.js',
      'public/**',
      '.output/**',
      '.vercel/**',
      '.netlify/**',
      'test-results/**',
      'playwright-report/**',
      // Skrip k6 berjalan di runtime Goja, bukan proyek TypeScript.
      'tests/load/**',
      'src/paraglide/**',
      'src/generated/**',
    ],
  },
]
