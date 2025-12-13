/**
 * WASM loader for stylua-wasm.
 * This module is separated to allow easy mocking in tests.
 * In production, it loads the WASM URL using Vite's ?url import.
 * In tests, the entire module is aliased to a mock.
 */
export async function loadStyluaWasm(): Promise<string> {
  const wasmModule = await import('stylua-wasm/stylua_wasm_bg.wasm?url')
  return wasmModule.default
}
