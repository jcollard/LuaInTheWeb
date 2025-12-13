/**
 * Mock for stylua-wasm module used in tests.
 * Also exports wasmUrl which is used instead of the ?url import.
 */

export const OutputVerification = { Full: 0, None: 1 }
export const IndentType = { Tabs: 0, Spaces: 1 }
export const LineEndings = { Unix: 0, Windows: 1 }
export const QuoteStyle = { AutoPreferDouble: 0, AutoPreferSingle: 1 }

export const format = vi.fn((code: string) => code)

// Export wasmUrl for the formatter to use
export const wasmUrl = 'mock-wasm-url'

const init = vi.fn(() => Promise.resolve())
export default init
