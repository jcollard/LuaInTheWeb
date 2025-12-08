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

  describe('input handling', () => {
    it('should provide isAwaitingInput as false initially', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.isAwaitingInput).toBe(false)
    })

    it('should provide submitInput function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.submitInput).toBeInstanceOf(Function)
    })

    it('should set isAwaitingInput to true when onReadInput is called', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act - simulate io.read() being called (don't await, it will block)
      let inputPromise: Promise<string> | undefined
      act(() => {
        inputPromise = readInputCallback?.()
      })

      // Assert
      expect(result.current.isAwaitingInput).toBe(true)

      // Cleanup - resolve the promise
      act(() => {
        result.current.submitInput('test')
      })
      await inputPromise
    })

    it('should resolve onReadInput promise when submitInput is called', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act - simulate io.read() and submit input
      let resolvedValue: string | undefined
      const inputPromise = readInputCallback?.().then((val) => {
        resolvedValue = val
      })

      act(() => {
        result.current.submitInput('user input')
      })

      await inputPromise

      // Assert
      expect(resolvedValue).toBe('user input')
    })

    it('should set isAwaitingInput to false after submitInput', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Start awaiting input - wrap in act since it causes state update
      let inputPromise: Promise<string> | undefined
      act(() => {
        inputPromise = readInputCallback?.()
      })
      expect(result.current.isAwaitingInput).toBe(true)

      // Act
      act(() => {
        result.current.submitInput('done')
      })
      await inputPromise

      // Assert
      expect(result.current.isAwaitingInput).toBe(false)
    })

    it('should add input prompt to terminal output when awaiting', async () => {
      // Arrange
      let readInputCallback: (() => Promise<string>) | undefined
      const { useLuaEngine } = await import('../../hooks/useLuaEngine')
      vi.mocked(useLuaEngine).mockImplementation((options) => {
        readInputCallback = options.onReadInput
        return {
          isReady: true,
          execute: mockExecute,
          reset: mockReset,
        }
      })

      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      let inputPromise: Promise<string> | undefined
      act(() => {
        inputPromise = readInputCallback?.()
      })

      // Assert - should show input prompt
      expect(result.current.terminalOutput).toContain('> Waiting for input...')

      // Cleanup
      act(() => {
        result.current.submitInput('test')
      })
      await inputPromise
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

  describe('filesystem integration', () => {
    beforeEach(() => {
      // Clear localStorage before each test
      localStorage.clear()
    })

    it('should provide fileTree from filesystem', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.fileTree).toBeDefined()
      expect(Array.isArray(result.current.fileTree)).toBe(true)
    })

    it('should provide openFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.openFile).toBeInstanceOf(Function)
    })

    it('should load file content when openFile is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a file first
      act(() => {
        result.current.createFile('/test.lua', 'print("hello")')
      })

      // Act - open the file
      act(() => {
        result.current.openFile('/test.lua')
      })

      // Assert
      expect(result.current.code).toBe('print("hello")')
      expect(result.current.fileName).toBe('test.lua')
    })

    it('should open tab when file is opened', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create and open file
      act(() => {
        result.current.createFile('/main.lua', 'local x = 1')
      })

      act(() => {
        result.current.openFile('/main.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/main.lua')
      expect(result.current.tabs[0].name).toBe('main.lua')
      expect(result.current.activeTab).toBe('/main.lua')
    })

    it('should switch content when selecting different tab', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create two files
      act(() => {
        result.current.createFile('/file1.lua', 'content1')
        result.current.createFile('/file2.lua', 'content2')
      })

      // Open both files
      act(() => {
        result.current.openFile('/file1.lua')
      })
      act(() => {
        result.current.openFile('/file2.lua')
      })

      expect(result.current.code).toBe('content2')

      // Act - select first tab
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert
      expect(result.current.code).toBe('content1')
      expect(result.current.activeTab).toBe('/file1.lua')
    })

    it('should track dirty state per file', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'original')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      // Initially not dirty
      expect(result.current.isDirty).toBe(false)
      expect(result.current.tabs[0].isDirty).toBe(false)

      // Act - modify content
      act(() => {
        result.current.setCode('modified')
      })

      // Assert
      expect(result.current.isDirty).toBe(true)
      expect(result.current.tabs[0].isDirty).toBe(true)
    })

    it('should save file and clear dirty state', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'original')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      act(() => {
        result.current.setCode('modified')
      })

      expect(result.current.isDirty).toBe(true)

      // Act - save file
      act(() => {
        result.current.saveFile()
      })

      // Assert
      expect(result.current.isDirty).toBe(false)
      expect(result.current.tabs[0].isDirty).toBe(false)
    })

    it('should close tab when closeTab is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'content')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      expect(result.current.tabs).toHaveLength(1)

      // Act
      act(() => {
        result.current.closeTab('/test.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.activeTab).toBeNull()
    })

    it('should provide createFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFile).toBeInstanceOf(Function)
    })

    it('should add file to tree when createFile is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFile('/new.lua', '')
      })

      // Assert
      expect(result.current.fileTree).toContainEqual(
        expect.objectContaining({ path: '/new.lua', name: 'new.lua', type: 'file' })
      )
    })

    it('should provide createFolder function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFolder).toBeInstanceOf(Function)
    })

    it('should provide deleteFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.deleteFile).toBeInstanceOf(Function)
    })

    it('should close tab when file is deleted', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/test.lua', 'content')
      })

      act(() => {
        result.current.openFile('/test.lua')
      })

      expect(result.current.tabs).toHaveLength(1)

      // Act
      act(() => {
        result.current.deleteFile('/test.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(0)
      expect(result.current.fileTree).not.toContainEqual(
        expect.objectContaining({ path: '/test.lua' })
      )
    })

    it('should provide renameFile function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.renameFile).toBeInstanceOf(Function)
    })

    it('should update tab path when file is renamed', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/old.lua', 'content')
      })

      act(() => {
        result.current.openFile('/old.lua')
      })

      // Act
      act(() => {
        result.current.renameFile('/old.lua', 'new.lua')
      })

      // Assert
      expect(result.current.tabs[0].path).toBe('/new.lua')
      expect(result.current.tabs[0].name).toBe('new.lua')
      expect(result.current.activeTab).toBe('/new.lua')
    })
  })

  describe('empty state', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should return null fileName when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert - when no file is open, fileName should be null
      expect(result.current.fileName).toBeNull()
    })

    it('should have empty code when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.code).toBe('')
    })

    it('should have null activeTab when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.activeTab).toBeNull()
    })

    it('should have empty tabs array when no file is open', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.tabs).toEqual([])
    })
  })

  describe('new file creation', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should provide generateUniqueFileName function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.generateUniqueFileName).toBeInstanceOf(Function)
    })

    it('should generate untitled-1.lua for first new file', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      const fileName = result.current.generateUniqueFileName()

      // Assert
      expect(fileName).toBe('untitled-1.lua')
    })

    it('should generate untitled-2.lua if untitled-1.lua exists', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create untitled-1.lua
      act(() => {
        result.current.createFile('/untitled-1.lua', '')
      })

      // Act
      const fileName = result.current.generateUniqueFileName()

      // Assert
      expect(fileName).toBe('untitled-2.lua')
    })

    it('should skip existing numbered files to find unique name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create files 1, 2, and 3
      act(() => {
        result.current.createFile('/untitled-1.lua', '')
        result.current.createFile('/untitled-2.lua', '')
        result.current.createFile('/untitled-3.lua', '')
      })

      // Act
      const fileName = result.current.generateUniqueFileName()

      // Assert
      expect(fileName).toBe('untitled-4.lua')
    })

    it('should provide pendingNewFilePath state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBeNull()
    })

    it('should provide createFileWithRename function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.createFileWithRename).toBeInstanceOf(Function)
    })

    it('should set pendingNewFilePath when createFileWithRename is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFileWithRename()
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBe('/untitled-1.lua')
    })

    it('should create file in filesystem when createFileWithRename is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Act
      act(() => {
        result.current.createFileWithRename()
      })

      // Assert
      expect(result.current.fileTree).toContainEqual(
        expect.objectContaining({ path: '/untitled-1.lua' })
      )
    })

    it('should clear pendingNewFilePath after clearPendingNewFile is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFileWithRename()
      })
      expect(result.current.pendingNewFilePath).toBe('/untitled-1.lua')

      // Act
      act(() => {
        result.current.clearPendingNewFile()
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBeNull()
    })

    it('should create file in specified parent folder', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a folder first
      act(() => {
        result.current.createFolder('/utils')
      })

      // Act
      act(() => {
        result.current.createFileWithRename('/utils')
      })

      // Assert
      expect(result.current.pendingNewFilePath).toBe('/utils/untitled-1.lua')
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should provide showError function', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.showError).toBeInstanceOf(Function)
    })

    it('should provide toasts array', () => {
      // Arrange & Act
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.toasts).toEqual([])
    })

    it('should show error toast when renaming file to existing name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create two files
      act(() => {
        result.current.createFile('/file1.lua', '')
        result.current.createFile('/file2.lua', '')
      })

      // Act - try to rename file1 to file2's name
      act(() => {
        result.current.renameFile('/file1.lua', 'file2.lua')
      })

      // Assert - should have error toast
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('error')
      expect(result.current.toasts[0].message).toMatch(/already exists/i)
    })

    it('should show error toast when creating file with existing name', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create a file
      act(() => {
        result.current.createFile('/test.lua', '')
      })

      // Act - try to create another file with same name
      act(() => {
        result.current.createFile('/test.lua', '')
      })

      // Assert - should have error toast
      expect(result.current.toasts).toHaveLength(1)
      expect(result.current.toasts[0].type).toBe('error')
      expect(result.current.toasts[0].message).toMatch(/already exists/i)
    })

    it('should provide dismissToast function', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Assert
      expect(result.current.dismissToast).toBeInstanceOf(Function)
    })

    it('should dismiss toast when dismissToast is called', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create duplicate file to trigger error
      act(() => {
        result.current.createFile('/test.lua', '')
      })
      act(() => {
        result.current.createFile('/test.lua', '')
      })

      expect(result.current.toasts).toHaveLength(1)
      const toastId = result.current.toasts[0].id

      // Act
      act(() => {
        result.current.dismissToast(toastId)
      })

      // Assert
      expect(result.current.toasts).toHaveLength(0)
    })
  })

  describe('tab state preservation', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should preserve unsaved edits when switching tabs', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      // Create two files
      act(() => {
        result.current.createFile('/file1.lua', 'original1')
        result.current.createFile('/file2.lua', 'original2')
      })

      // Open file1
      act(() => {
        result.current.openFile('/file1.lua')
      })

      // Edit file1 (but don't save)
      act(() => {
        result.current.setCode('modified1')
      })
      expect(result.current.code).toBe('modified1')
      expect(result.current.isDirty).toBe(true)

      // Open file2
      act(() => {
        result.current.openFile('/file2.lua')
      })
      expect(result.current.code).toBe('original2')

      // Act - switch back to file1
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert - edits should be preserved
      expect(result.current.code).toBe('modified1')
      expect(result.current.isDirty).toBe(true)
    })

    it('should preserve dirty indicator across tab switches', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/file1.lua', 'original1')
        result.current.createFile('/file2.lua', 'original2')
      })

      act(() => {
        result.current.openFile('/file1.lua')
      })

      // Make file1 dirty
      act(() => {
        result.current.setCode('modified1')
      })
      expect(result.current.tabs[0].isDirty).toBe(true)

      // Open and switch to file2
      act(() => {
        result.current.openFile('/file2.lua')
      })

      // Act - switch back to file1
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert - dirty indicator should still be true
      expect(result.current.tabs.find(t => t.path === '/file1.lua')?.isDirty).toBe(true)
      expect(result.current.isDirty).toBe(true)
    })

    it('should clear unsaved content from memory when file is saved', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/file1.lua', 'original1')
        result.current.createFile('/file2.lua', 'original2')
      })

      act(() => {
        result.current.openFile('/file1.lua')
      })

      // Edit file1
      act(() => {
        result.current.setCode('saved_content')
      })

      // Save file1
      act(() => {
        result.current.saveFile()
      })

      // Switch to file2
      act(() => {
        result.current.openFile('/file2.lua')
      })

      // Switch back to file1
      act(() => {
        result.current.selectTab('/file1.lua')
      })

      // Assert - should show saved content (not from memory map, from filesystem)
      expect(result.current.code).toBe('saved_content')
      expect(result.current.isDirty).toBe(false)
    })

    it('should handle rapid tab switches without losing content', () => {
      // Arrange
      const { result } = renderHook(() => useIDE(), {
        wrapper: ({ children }) => <IDEContextProvider>{children}</IDEContextProvider>,
      })

      act(() => {
        result.current.createFile('/a.lua', 'content_a')
        result.current.createFile('/b.lua', 'content_b')
        result.current.createFile('/c.lua', 'content_c')
      })

      act(() => {
        result.current.openFile('/a.lua')
      })

      act(() => {
        result.current.setCode('edited_a')
      })

      act(() => {
        result.current.openFile('/b.lua')
      })

      act(() => {
        result.current.setCode('edited_b')
      })

      act(() => {
        result.current.openFile('/c.lua')
      })

      // Act - rapid switches
      act(() => {
        result.current.selectTab('/a.lua')
      })
      expect(result.current.code).toBe('edited_a')

      act(() => {
        result.current.selectTab('/b.lua')
      })
      expect(result.current.code).toBe('edited_b')

      act(() => {
        result.current.selectTab('/c.lua')
      })

      // Assert
      expect(result.current.code).toBe('content_c')
    })
  })
})
