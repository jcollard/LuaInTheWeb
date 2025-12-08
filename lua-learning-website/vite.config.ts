import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
