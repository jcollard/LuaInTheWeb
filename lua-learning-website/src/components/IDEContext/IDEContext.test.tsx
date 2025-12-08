import { render, screen, renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { IDEContextProvider } from './IDEContext'
import { useIDE } from './useIDE'

// Mock useLuaEngine
const mockExecute = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/useLuaEngine', () => ({
  useLuaEngine: vi.fn((options: { onOutput?: (msg: string) => void; onError?: (msg: string) => void }) => {
    // Store callbacks so tests can trigger them
    ;(mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput = options.onOutput
    ;(mockExecute as unknown as { _onError?: (msg: string) => void })._onError = options.onError
    return {
      isReady: true,
      execute: mockExecute,
      reset: mockReset,
    }
  }),
}))

describe('IDEContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('IDEContextProvider', () => {
    it('should render children', () => {
      // Arrange & Act
      render(
        <IDEContextProvider>
          <div data-testid="child">Child content</div>
        </IDEContextProvider>
      )

      // Assert
      expect(screen.getByTestId('child')).toBeInTheDocument()
      expect(screen.getByText('Child content')).toBeInTheDocument()
    })
  })

  describe('useIDE hook', () => {
    it('should return context value when used inside provider', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current).toBeDefined()
      expect(result.current.engine).toBeDefined()
      expect(result.current.code).toBeDefined()
      expect(result.current.setCode).toBeInstanceOf(Function)
    })

    it('should throw error when used outside provider', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert
      expect(() => {
        renderHook(() => useIDE())
      }).toThrow('useIDE must be used within an IDEContextProvider')

      consoleSpy.mockRestore()
    })

    it('should provide Lua engine from useLuaEngine', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.engine).toEqual({
        isReady: true,
        execute: mockExecute,
        reset: mockReset,
      })
    })
  })

  describe('code state', () => {
    it('should provide code state with initial empty string', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.code).toBe('')
    })

    it('should provide code state with initial value from props', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="print('hello')">{children}</IDEContextProvider>
        ),
      })

      // Assert
      expect(result.current.code).toBe("print('hello')")
    })

    it('should update code when setCode is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.setCode('new code')
      })

      // Assert
      expect(result.current.code).toBe('new code')
    })

    it('should track isDirty when code changes from initial', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="initial">{children}</IDEContextProvider>
        ),
      })
      expect(result.current.isDirty).toBe(false)

      // Act
      act(() => {
        result.current.setCode('modified')
      })

      // Assert
      expect(result.current.isDirty).toBe(true)
    })

    it('should reset isDirty when code returns to initial value', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="initial">{children}</IDEContextProvider>
        ),
      })

      // Modify code
      act(() => {
        result.current.setCode('modified')
      })
      expect(result.current.isDirty).toBe(true)

      // Act - return to initial
      act(() => {
        result.current.setCode('initial')
      })

      // Assert
      expect(result.current.isDirty).toBe(false)
    })
  })

  describe('file name', () => {
    it('should provide default file name', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.fileName).toBe('untitled.lua')
    })

    it('should provide custom file name from props', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialFileName="main.lua">{children}</IDEContextProvider>
        ),
      })

      // Assert
      expect(result.current.fileName).toBe('main.lua')
    })
  })

  describe('runCode', () => {
    it('should execute code in Lua engine', async () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="print('test')">{children}</IDEContextProvider>
        ),
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(mockExecute).toHaveBeenCalledWith("print('test')")
    })

    it('should append output to terminal history', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('Hello, World!')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => (
          <IDEContextProvider initialCode="print('hello')">{children}</IDEContextProvider>
        ),
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(result.current.terminalOutput).toContain('Hello, World!')
    })

    it('should append multiple outputs to terminal history', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('line 1')
        onOutput?.('line 2')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(result.current.terminalOutput).toEqual(['line 1', 'line 2'])
    })

    it('should append error messages to terminal history', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
        onError?.('Error: syntax error')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      await act(async () => {
        await result.current.runCode()
      })

      // Assert
      expect(result.current.terminalOutput).toContain('Error: syntax error')
    })
  })

  describe('clearTerminal', () => {
    it('should reset terminal output', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('some output')
      })
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Add some output
      await act(async () => {
        await result.current.runCode()
      })
      expect(result.current.terminalOutput.length).toBeGreaterThan(0)

      // Act
      act(() => {
        result.current.clearTerminal()
      })

      // Assert
      expect(result.current.terminalOutput).toEqual([])
    })
  })

  describe('UI state', () => {
    it('should provide default activePanel as explorer', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.activePanel).toBe('explorer')
    })

    it('should update activePanel when setActivePanel is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.setActivePanel('search')
      })

      // Assert
      expect(result.current.activePanel).toBe('search')
    })

    it('should provide default terminalVisible as true', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.terminalVisible).toBe(true)
    })

    it('should toggle terminalVisible when toggleTerminal is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })
      expect(result.current.terminalVisible).toBe(true)

      // Act
      act(() => {
        result.current.toggleTerminal()
      })

      // Assert
      expect(result.current.terminalVisible).toBe(false)

      // Act again
      act(() => {
        result.current.toggleTerminal()
      })

      // Assert
      expect(result.current.terminalVisible).toBe(true)
    })

    it('should provide default sidebarVisible as true', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.sidebarVisible).toBe(true)
    })

    it('should toggle sidebarVisible when toggleSidebar is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.toggleSidebar()
      })

      // Assert
      expect(result.current.sidebarVisible).toBe(false)
    })
  })
})
