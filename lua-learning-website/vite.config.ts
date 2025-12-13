import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), topLevelAwait()],
  optimizeDeps: {
    // Exclude stylua-wasm from pre-bundling to allow proper WASM handling
    exclude: ['stylua-wasm'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React core
          'vendor-react': ['react', 'react-dom'],
          // Monaco editor (largest dependency)
          'vendor-monaco': ['@monaco-editor/react', 'monaco-editor'],
          // Resizable panels
          'vendor-panels': ['react-resizable-panels'],
          // Lua WASM engine
          'vendor-lua': ['wasmoon'],
        },
      },
    },
  },
})
