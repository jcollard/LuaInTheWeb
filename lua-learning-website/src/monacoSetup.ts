/**
 * Configure Monaco editor to load locally instead of CDN.
 *
 * Required because COEP `require-corp` headers block cross-origin
 * resources from jsDelivr CDN (the @monaco-editor/react default).
 * This file must be imported before any React rendering.
 */

import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'

// Configure Monaco web workers for syntax highlighting
self.MonacoEnvironment = {
  getWorker: () => new editorWorker(),
}

// Use locally bundled Monaco instead of CDN
loader.config({ monaco })

// Expose monaco globally so E2E tests and browser console can access it
// (CDN loader does this automatically; local loading requires manual exposure)
;(window as unknown as { monaco: typeof monaco }).monaco = monaco
