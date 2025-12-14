/**
 * Mock for styluaWasmLoader used in tests.
 * Returns a mock URL instead of loading the actual WASM file.
 */
export async function loadStyluaWasm(): Promise<string> {
  return 'mock-wasm-url'
}
