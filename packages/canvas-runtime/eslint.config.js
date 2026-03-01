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
  // Large runtime/type files with documented overrides
  {
    files: ['src/worker/LuaCanvasRuntime.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 2000,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['src/shared/types.ts'],
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
    files: ['src/audio/MainThreadAudioEngine.ts'],
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
  {
    files: ['src/process/LuaCanvasProcess.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 850,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  {
    files: ['src/renderer/CanvasRenderer.ts'],
    rules: {
      'max-lines': [
        'error',
        {
          max: 750,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },
  // Large test files
  {
    files: ['tests/channels/SharedArrayBufferChannel.test.ts'],
    rules: {
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/process/LuaCanvasProcess.test.ts'],
    rules: {
      'max-lines': ['error', { max: 750, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/renderer/CanvasRenderer.test.ts'],
    rules: {
      'max-lines': ['error', { max: 2100, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/renderer/InputCapture.test.ts'],
    rules: {
      'max-lines': ['error', { max: 900, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/shared/AssetLoader.test.ts'],
    rules: {
      'max-lines': ['error', { max: 700, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    files: ['tests/worker/LuaCanvasRuntime.test.ts'],
    rules: {
      'max-lines': ['error', { max: 1000, skipBlankLines: true, skipComments: true }],
    },
  },
])
