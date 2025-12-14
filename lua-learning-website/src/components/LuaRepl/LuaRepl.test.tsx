import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

// Mock BashTerminal since it uses xterm which doesn't work in jsdom
vi.mock('../BashTerminal', () => ({
  default: vi.fn().mockImplementation(({ embedded }) => (
    <div data-testid="bash-terminal" data-embedded={embedded}>
      BashTerminal Mock
    </div>
  )),
}))

// Mock wasmoon to avoid WASM loading issues in tests
vi.mock('wasmoon', () => ({
  LuaFactory: class MockLuaFactory {
    async createEngine() {
      return {
        global: {
          set: vi.fn(),
          close: vi.fn(),
        },
        doString: vi.fn().mockResolvedValue(undefined),
      }
    }
  },
  LuaEngine: class MockLuaEngine {},
}))

// Mock theme context (LuaRepl uses useTheme for CSS module styling)
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}))

import LuaRepl from './LuaRepl'

describe('LuaRepl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Helper to wait for engine initialization to complete
  const waitForEngineInit = async () => {
    // Give time for the async engine initialization to complete
    await waitFor(() => {}, { timeout: 50 })
  }

  describe('standalone mode (default)', () => {
    it('should render Interactive REPL header by default', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl />)

      // Assert
      expect(screen.getByRole('heading', { name: /interactive repl/i })).toBeInTheDocument()

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })

    it('should render Clear button by default', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl />)

      // Assert
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })

    it('should render Tips section by default', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl />)

      // Assert
      expect(screen.getByText(/tips:/i)).toBeInTheDocument()

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })

    it('should pass embedded=false to BashTerminal by default', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl />)

      // Assert
      const terminal = screen.getByTestId('bash-terminal')
      expect(terminal).toHaveAttribute('data-embedded', 'false')

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })
  })

  describe('embedded mode', () => {
    it('should not render Interactive REPL header when embedded', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl embedded />)

      // Assert
      expect(screen.queryByRole('heading', { name: /interactive repl/i })).not.toBeInTheDocument()

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })

    it('should not render Clear button when embedded (use clear() command instead)', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl embedded />)

      // Assert
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })

    it('should not render Tips section when embedded', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl embedded />)

      // Assert
      expect(screen.queryByText(/tips:/i)).not.toBeInTheDocument()

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })

    it('should pass embedded=true to BashTerminal when embedded', async () => {
      // Arrange & Act
      const { unmount } = render(<LuaRepl embedded />)

      // Assert
      const terminal = screen.getByTestId('bash-terminal')
      expect(terminal).toHaveAttribute('data-embedded', 'true')

      // Wait for async operations to complete before unmount
      await waitForEngineInit()
      unmount()
    })
  })
})
