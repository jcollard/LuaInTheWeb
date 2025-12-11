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
    beforeEach(() => {
      localStorage.clear()
    })

    it('should return null when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.fileName).toBeNull()
    })

    it('should return file name from active tab when file is open', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act - create a file (separate act blocks since createFile updates state)
      act(() => {
        result.current.createFile('/main.lua', '')
      })

      // Open the file after state has updated
      act(() => {
        result.current.openFile('/main.lua')
      })

      // Assert
      expect(result.current.fileName).toBe('main.lua')
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
