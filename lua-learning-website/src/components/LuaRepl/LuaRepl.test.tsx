import { render, screen } from '@testing-library/react'
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

import LuaRepl from './LuaRepl'

describe('LuaRepl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('standalone mode (default)', () => {
    it('should render Interactive REPL header by default', () => {
      // Arrange & Act
      render(<LuaRepl />)

      // Assert
      expect(screen.getByRole('heading', { name: /interactive repl/i })).toBeInTheDocument()
    })

    it('should render Clear button by default', () => {
      // Arrange & Act
      render(<LuaRepl />)

      // Assert
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should render Tips section by default', () => {
      // Arrange & Act
      render(<LuaRepl />)

      // Assert
      expect(screen.getByText(/tips:/i)).toBeInTheDocument()
    })

    it('should pass embedded=false to BashTerminal by default', () => {
      // Arrange & Act
      render(<LuaRepl />)

      // Assert
      const terminal = screen.getByTestId('bash-terminal')
      expect(terminal).toHaveAttribute('data-embedded', 'false')
    })
  })

  describe('embedded mode', () => {
    it('should not render Interactive REPL header when embedded', () => {
      // Arrange & Act
      render(<LuaRepl embedded />)

      // Assert
      expect(screen.queryByRole('heading', { name: /interactive repl/i })).not.toBeInTheDocument()
    })

    it('should not render Clear button when embedded (use clear() command instead)', () => {
      // Arrange & Act
      render(<LuaRepl embedded />)

      // Assert
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })

    it('should not render Tips section when embedded', () => {
      // Arrange & Act
      render(<LuaRepl embedded />)

      // Assert
      expect(screen.queryByText(/tips:/i)).not.toBeInTheDocument()
    })

    it('should pass embedded=true to BashTerminal when embedded', () => {
      // Arrange & Act
      render(<LuaRepl embedded />)

      // Assert
      const terminal = screen.getByTestId('bash-terminal')
      expect(terminal).toHaveAttribute('data-embedded', 'true')
    })
  })
})
