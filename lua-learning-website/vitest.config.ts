import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      // Mock stylua-wasm for tests
      {
        find: 'stylua-wasm',
        replacement: path.resolve(__dirname, 'src/test/mocks/stylua-wasm.ts'),
      },
      // Mock WASM loader for tests (avoids ?url import resolution issues)
      {
        find: /^\.\.\/utils\/styluaWasmLoader$/,
        replacement: path.resolve(__dirname, 'src/test/mocks/styluaWasmLoader.ts'),
      },
      {
        find: /^\.\/styluaWasmLoader$/,
        replacement: path.resolve(__dirname, 'src/test/mocks/styluaWasmLoader.ts'),
      },
    ],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Handle WASM URL imports in tests
    server: {
      deps: {
        inline: ['stylua-wasm'],
      },
    },
    include: [
      'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'scripts/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/main.tsx',
      ],
    },
  },
})
