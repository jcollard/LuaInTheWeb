/**
 * Configure wasmoon to load WASM from same-origin instead of CDN.
 *
 * Required because COEP `require-corp` headers block cross-origin
 * fetches to unpkg.com (the wasmoon default). This uses Vite's
 * ?url import to get a same-origin path for the WASM binary.
 */

import { LuaEngineFactory } from '@lua-learning/lua-runtime'
import wasmUrl from 'wasmoon/dist/glue.wasm?url'

// Configure LuaEngineFactory (used by LuaReplProcess and LuaScriptProcess)
LuaEngineFactory.setWasmUri(wasmUrl)

/**
 * Get the same-origin WASM URI for direct LuaFactory usage.
 */
export function getWasmUri(): string {
  return wasmUrl
}
