import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createRef } from 'react'
import type { Theme } from '../contexts/types'
import type { BashTerminalHandle } from './BashTerminal'

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

  describe('readChars - character mode input', () => {
    it('should capture exactly n characters without waiting for Enter', async () => {
      // Arrange
      const ref = createRef<BashTerminalHandle>()
      render(<BashTerminal ref={ref} />)

      // Get the onData callback
      const onDataCallback = mockState.lastTerminalInstance?.onData.mock.calls[0][0]
      expect(onDataCallback).toBeDefined()

      // Act - start reading 3 characters
      let result: string | undefined
      const readPromise = ref.current?.readChars(3).then((r) => {
        result = r
      })

      // Simulate typing 3 characters
      await act(async () => {
        onDataCallback('a')
        onDataCallback('b')
        onDataCallback('c')
      })

      await readPromise

      // Assert
      expect(result).toBe('abc')
    })

    it('should echo each character as it is typed', async () => {
      // Arrange
      const ref = createRef<BashTerminalHandle>()
      render(<BashTerminal ref={ref} />)

      const onDataCallback = mockState.lastTerminalInstance?.onData.mock.calls[0][0]
      const writeMethod = mockState.lastTerminalInstance?.write

      // Act
      ref.current?.readChars(2)

      await act(async () => {
        onDataCallback('x')
      })

      // Assert - character should be echoed
      expect(writeMethod).toHaveBeenCalledWith('x')
    })

    it('should resolve immediately when character count is reached', async () => {
      // Arrange
      const ref = createRef<BashTerminalHandle>()
      render(<BashTerminal ref={ref} />)

      const onDataCallback = mockState.lastTerminalInstance?.onData.mock.calls[0][0]

      // Act
      let resolved = false
      const readPromise = ref.current?.readChars(1).then(() => {
        resolved = true
      })

      // Before typing, promise should not be resolved
      expect(resolved).toBe(false)

      await act(async () => {
        onDataCallback('z')
      })

      await readPromise

      // Assert - should resolve after 1 character
      expect(resolved).toBe(true)
    })

    it('should only return first n characters if more are typed quickly', async () => {
      // Arrange
      const ref = createRef<BashTerminalHandle>()
      render(<BashTerminal ref={ref} />)

      const onDataCallback = mockState.lastTerminalInstance?.onData.mock.calls[0][0]

      // Act
      let result: string | undefined
      const readPromise = ref.current?.readChars(2).then((r) => {
        result = r
      })

      await act(async () => {
        onDataCallback('1')
        onDataCallback('2')
        onDataCallback('3') // Extra character
      })

      await readPromise

      // Assert - only first 2 characters
      expect(result).toBe('12')
    })
  })

  describe('readLine - line mode input', () => {
    it('should wait for Enter key to resolve', async () => {
      // Arrange
      const ref = createRef<BashTerminalHandle>()
      render(<BashTerminal ref={ref} />)

      const onDataCallback = mockState.lastTerminalInstance?.onData.mock.calls[0][0]

      // Act
      let result: string | undefined
      const readPromise = ref.current?.readLine().then((r) => {
        result = r
      })

      // Type characters without Enter
      await act(async () => {
        onDataCallback('h')
        onDataCallback('i')
      })

      // Should not be resolved yet
      expect(result).toBeUndefined()

      // Press Enter
      await act(async () => {
        onDataCallback('\r')
      })

      await readPromise

      // Assert
      expect(result).toBe('hi')
    })

    it('should show prompt when readLine is called', async () => {
      // Arrange
      const ref = createRef<BashTerminalHandle>()
      render(<BashTerminal ref={ref} />)

      const writeMethod = mockState.lastTerminalInstance?.write

      // Act
      await act(async () => {
        ref.current?.readLine()
      })

      // Assert - should show prompt
      expect(writeMethod).toHaveBeenCalledWith('> ')
    })
  })
})
