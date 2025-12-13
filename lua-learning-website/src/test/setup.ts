import '@testing-library/jest-dom'

// Mock ResizeObserver which is not available in jsdom
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

// Note: stylua-wasm is mocked via vitest.config.ts aliases to src/test/mocks/
