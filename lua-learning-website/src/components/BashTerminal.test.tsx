import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Theme } from '../contexts/types'

// Use vi.hoisted to make variables available to mocks
const mockState = vi.hoisted(() => {
  type TerminalInstance = {
    options: Record<string, unknown>
    loadAddon: ReturnType<typeof vi.fn>
    open: ReturnType<typeof vi.fn>
    attachCustomKeyEventHandler: ReturnType<typeof vi.fn>
    onData: ReturnType<typeof vi.fn>
    dispose: ReturnType<typeof vi.fn>
    write: ReturnType<typeof vi.fn>
    writeln: ReturnType<typeof vi.fn>
    clear: ReturnType<typeof vi.fn>
    refresh: ReturnType<typeof vi.fn>
    rows: number
    buffer: { active: { cursorY: number } }
  }

  return {
    lastTerminalInstance: null as TerminalInstance | null,
    lastTerminalOptions: null as Record<string, unknown> | null,
    theme: 'dark' as Theme,
  }
})

// Mock xterm and its addons
vi.mock('@xterm/xterm', () => ({
  Terminal: class MockTerminal {
    options: Record<string, unknown>

    constructor(options: Record<string, unknown>) {
      mockState.lastTerminalOptions = options
      this.options = options
      mockState.lastTerminalInstance = this
    }
    loadAddon = vi.fn()
    open = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    onData = vi.fn()
    dispose = vi.fn()
    write = vi.fn()
    writeln = vi.fn()
    clear = vi.fn()
    refresh = vi.fn()
    rows = 24
    buffer = {
      active: {
        cursorY: 0,
      },
    }
  },
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn()
  },
}))

// Mock theme context
vi.mock('../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: mockState.theme,
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: mockState.theme === 'dark',
  }),
}))

import BashTerminal from './BashTerminal'
import { darkTerminalTheme, lightTerminalTheme } from './BashTerminal/terminalTheme'

describe('BashTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.lastTerminalInstance = null
    mockState.lastTerminalOptions = null
    mockState.theme = 'dark'
  })

  describe('standalone mode (default)', () => {
    it('should render Output header by default', () => {
      // Arrange & Act
      render(<BashTerminal />)

      // Assert
      expect(screen.getByRole('heading', { name: /output/i })).toBeInTheDocument()
    })

    it('should render terminal container by default', () => {
      // Arrange & Act
      render(<BashTerminal />)

      // Assert
      expect(screen.getByTestId('bash-terminal-container')).toBeInTheDocument()
    })
  })

  describe('embedded mode', () => {
    it('should not render Output header when embedded', () => {
      // Arrange & Act
      render(<BashTerminal embedded />)

      // Assert
      expect(screen.queryByRole('heading', { name: /output/i })).not.toBeInTheDocument()
    })

    it('should render terminal container when embedded', () => {
      // Arrange & Act
      render(<BashTerminal embedded />)

      // Assert
      expect(screen.getByTestId('bash-terminal-container')).toBeInTheDocument()
    })

    it('should add embedded class when embedded', () => {
      // Arrange & Act
      render(<BashTerminal embedded />)

      // Assert
      const container = screen.getByTestId('bash-terminal-container')
      // CSS modules generate unique class names, check for pattern match
      expect(container.className).toMatch(/containerEmbedded/)
    })
  })

  describe('theme integration', () => {
    it('should create terminal with dark theme when theme is dark', () => {
      // Arrange
      mockState.theme = 'dark'

      // Act
      render(<BashTerminal />)

      // Assert
      expect(mockState.lastTerminalOptions).not.toBeNull()
      expect(mockState.lastTerminalOptions?.theme).toEqual(darkTerminalTheme)
    })

    it('should create terminal with light theme when theme is light', () => {
      // Arrange
      mockState.theme = 'light'

      // Act
      render(<BashTerminal />)

      // Assert
      expect(mockState.lastTerminalOptions).not.toBeNull()
      expect(mockState.lastTerminalOptions?.theme).toEqual(lightTerminalTheme)
    })

    it('should update terminal theme when theme changes', () => {
      // Arrange
      mockState.theme = 'dark'
      const { rerender } = render(<BashTerminal />)

      expect(mockState.lastTerminalInstance?.options.theme).toEqual(darkTerminalTheme)

      // Act - simulate theme change
      mockState.theme = 'light'
      rerender(<BashTerminal />)

      // Assert
      expect(mockState.lastTerminalInstance?.options.theme).toEqual(lightTerminalTheme)
    })
  })
})
