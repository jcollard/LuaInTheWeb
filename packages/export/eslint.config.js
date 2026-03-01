import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.stryker-tmp', 'src/runtime/canvas-inline.generated.ts']),
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],
      'complexity': ['warn', { max: 15 }],
      'max-params': ['warn', { max: 5 }],
      'max-depth': ['warn', { max: 4 }],
      'max-lines-per-function': ['warn', { max: 200 }],
    },
  },
  {
    files: ['**/*.ts'],
    ignores: ['**/*.test.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 400,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['**/*.test.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 500,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  // Large runtime/generator files with documented overrides
  {
    files: ['src/runtime/canvas-standalone.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 1700,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['src/runtime/canvas-bridge-core.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 1100,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['src/HtmlGenerator.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 800,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  // Large test file
  {
    files: ['tests/runtime/canvas-standalone.test.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 700,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
])
