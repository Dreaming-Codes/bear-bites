//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    ignores: ['eslint.config.js', 'prettier.config.js', 'public/sw.js'],
  },
  {
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
    },
  },
]
