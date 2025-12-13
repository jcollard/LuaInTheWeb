/**
 * Shared test setup for useWorkspaceManager tests.
 */
import { vi, beforeEach } from 'vitest'

// Mock localStorage factory
export const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
}

export type LocalStorageMock = ReturnType<typeof createLocalStorageMock>

// Shared mock instance
export let localStorageMock: LocalStorageMock = createLocalStorageMock()

// Initialize window.localStorage mock
Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

/**
 * Setup function to call in beforeEach of each test file.
 */
export function setupWorkspaceManagerTests() {
  beforeEach(() => {
    // Create a fresh mock for each test to avoid state leakage
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
    vi.clearAllMocks()
  })
}

/**
 * Get the current localStorage mock instance.
 */
export function getLocalStorageMock(): LocalStorageMock {
  return localStorageMock
}
