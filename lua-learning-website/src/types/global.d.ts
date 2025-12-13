import type { Monaco } from '@monaco-editor/react'

declare global {
  interface Window {
    monaco?: Monaco
  }
}

export {}
