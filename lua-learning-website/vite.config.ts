import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { execSync } from 'child_process'
import { readFileSync } from 'fs'

function getGitInfo(command: string, fallback: string): string {
  try {
    return execSync(command, { encoding: 'utf-8' }).trim()
  } catch {
    return fallback
  }
}

function getPackageVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))
    return pkg.version || 'unknown'
  } catch {
    return 'unknown'
  }
}

const gitCommit = getGitInfo('git rev-parse --short HEAD', 'unknown')
const gitBranch = getGitInfo('git rev-parse --abbrev-ref HEAD', 'unknown')
const buildTimestamp = new Date().toISOString()
const packageVersion = getPackageVersion()

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  define: {
    __BUILD_COMMIT__: JSON.stringify(gitCommit),
    __BUILD_BRANCH__: JSON.stringify(gitBranch),
    __BUILD_TIMESTAMP__: JSON.stringify(buildTimestamp),
    __BUILD_ENV__: JSON.stringify(mode),
    __BUILD_VERSION__: JSON.stringify(packageVersion),
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
}))
