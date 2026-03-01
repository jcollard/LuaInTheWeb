import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '.stryker-tmp']),
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
  // FileSystemAccessAPIFileSystem: large file system adapter
  {
    files: ['src/FileSystemAccessAPIFileSystem.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 600,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['tests/FileSystemAccessAPIFileSystem.test.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 900,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
])
