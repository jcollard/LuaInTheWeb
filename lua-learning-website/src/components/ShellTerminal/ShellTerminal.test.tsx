import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ShellTerminal } from './ShellTerminal'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

// Store terminal instances for testing
let terminalInstances: Array<{
  write: ReturnType<typeof vi.fn>
  writeln: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
}> = []

// Store FitAddon instances for testing
let fitAddonInstances: Array<{
  fit: ReturnType<typeof vi.fn>
}> = []

// Store ResizeObserver callbacks for testing
let resizeObserverCallbacks: Array<ResizeObserverCallback> = []

// Mock ResizeObserver
class MockResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallbacks.push(callback)
  }
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

// Mock xterm.js - use factory functions for vi.mock hoisting
vi.mock('@xterm/xterm', () => {
  const MockTerminal = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.loadAddon = vi.fn()
    this.open = vi.fn()
    this.write = vi.fn()
    this.writeln = vi.fn()
    this.onData = vi.fn()
    this.attachCustomKeyEventHandler = vi.fn()
    this.dispose = vi.fn()
    this.clear = vi.fn()
    this.refresh = vi.fn()
    this.focus = vi.fn()
    this.rows = 24
    this.options = {}
    // Store instance for test access
    terminalInstances.push({
      write: this.write as ReturnType<typeof vi.fn>,
      writeln: this.writeln as ReturnType<typeof vi.fn>,
      onData: this.onData as ReturnType<typeof vi.fn>,
      focus: this.focus as ReturnType<typeof vi.fn>,
    })
  })
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-fit', () => {
  const MockFitAddon = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.fit = vi.fn()
    // Store instance for test access
    fitAddonInstances.push({
      fit: this.fit as ReturnType<typeof vi.fn>,
    })
  })
  return { FitAddon: MockFitAddon }
})

// Mock contexts
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

vi.mock('./terminalTheme', () => ({
  getTerminalTheme: vi.fn().mockReturnValue({}),
}))

// Mock useShell with mutable state for testing
const mockExecuteCommand = vi.fn().mockReturnValue({
  exitCode: 0,
  stdout: '',
  stderr: '',
  cwd: '/',
})

const mockExecuteCommandWithContext = vi.fn().mockReturnValue({
  cwd: '/',
})

const mockUseShell = {
  executeCommand: mockExecuteCommand,
  executeCommandWithContext: mockExecuteCommandWithContext,
  cwd: '/',
  history: [] as string[],
  clearHistory: vi.fn(),
  commandNames: ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'clear', 'lua'],
  getPathCompletionsForTab: vi.fn().mockReturnValue([]),
}

vi.mock('../../hooks/useShell', () => ({
  useShell: () => mockUseShell,
}))

// Mock useProcessManager with mutable state for testing
const mockStopProcess = vi.fn()
const mockHandleInput = vi.fn().mockReturnValue(false)
const mockSupportsRawInput = vi.fn().mockReturnValue(false)
const mockHandleKey = vi.fn().mockReturnValue(false)

const mockUseProcessManager = {
  isProcessRunning: false,
  hasForegroundProcess: vi.fn().mockReturnValue(false),
  startProcess: vi.fn(),
  stopProcess: mockStopProcess,
  handleInput: mockHandleInput,
  supportsRawInput: mockSupportsRawInput,
  handleKey: mockHandleKey,
}

vi.mock('../../hooks/useProcessManager', () => ({
  useProcessManager: () => mockUseProcessManager,
}))

describe('ShellTerminal', () => {
  const createMockFileSystem = (): UseFileSystemReturn => ({
    createFile: vi.fn(),
    readFile: vi.fn().mockReturnValue(null),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    moveFile: vi.fn(),
    copyFile: vi.fn(),
    writeBinaryFile: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    renameFolder: vi.fn(),
    exists: vi.fn().mockReturnValue(true),
    isDirectory: vi.fn().mockReturnValue(true),
    listDirectory: vi.fn().mockReturnValue([]),
    getTree: vi.fn().mockReturnValue([]),
    flush: vi.fn().mockResolvedValue(undefined),
  })

  let mockFileSystem: UseFileSystemReturn

  beforeEach(() => {
    mockFileSystem = createMockFileSystem()
    terminalInstances = []
    fitAddonInstances = []
    resizeObserverCallbacks = []
    mockUseShell.history = []
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render container with test id', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} />)

      expect(screen.getByTestId('shell-terminal-container')).toBeInTheDocument()
    })

    it('should render header when not embedded', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} />)

      expect(screen.getByText('Shell')).toBeInTheDocument()
    })

    it('should not render header when embedded', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} embedded />)

      expect(screen.queryByText('Shell')).not.toBeInTheDocument()
    })

    it('should apply custom className', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} className="custom-class" />)

      const container = screen.getByTestId('shell-terminal-container')
      expect(container.className).toContain('custom-class')
    })
  })

  describe('terminal initialization', () => {
    it('should initialize terminal', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} />)

      // Terminal should be created and opened
      // We can verify indirectly through the container being rendered
      expect(screen.getByTestId('shell-terminal-container')).toBeInTheDocument()
    })

    it('should render terminal container', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} />)

      // Terminal div should exist
      const container = screen.getByTestId('shell-terminal-container')
      expect(container.querySelector('[class*="terminal"]')).toBeTruthy()
    })
  })

  describe('command output formatting', () => {
    it('should write newline before command output', async () => {
      // Mock executeCommandWithContext to call the output callback
      mockExecuteCommandWithContext.mockImplementation(
        (
          _input: string,
          outputHandler: (text: string) => void
        ) => {
          outputHandler('test output')
          return { cwd: '/' }
        }
      )

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      // Clear initial calls from welcome message
      terminal.write.mockClear()
      terminal.writeln.mockClear()

      // Simulate typing 'ls' - each character needs separate act for state sync
      await act(async () => {
        onDataHandler('l')
      })
      await act(async () => {
        onDataHandler('s')
      })
      await act(async () => {
        onDataHandler('\r')
      })

      // Verify writeln('') was called before the output
      const writelnCalls = terminal.writeln.mock.calls
      expect(writelnCalls.length).toBeGreaterThan(0)
      // First writeln should be empty string (newline before output)
      expect(writelnCalls[0][0]).toBe('')
    })

    it('should display stdout on new line after command', async () => {
      // Mock executeCommandWithContext to call the output callback with multiple lines
      mockExecuteCommandWithContext.mockImplementation(
        (
          _input: string,
          outputHandler: (text: string) => void
        ) => {
          outputHandler('file1.txt')
          outputHandler('file2.txt')
          return { cwd: '/' }
        }
      )

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      terminal.write.mockClear()
      terminal.writeln.mockClear()

      // Simulate typing 'ls' - each character needs separate act for state sync
      await act(async () => {
        onDataHandler('l')
      })
      await act(async () => {
        onDataHandler('s')
      })
      await act(async () => {
        onDataHandler('\r')
      })

      // Should have written the output lines (using write with \r\n for proper xterm handling)
      const writeCalls = terminal.write.mock.calls.map((c) => c[0])
      expect(writeCalls.some((c) => c.includes('file1.txt'))).toBe(true)
      expect(writeCalls.some((c) => c.includes('file2.txt'))).toBe(true)
    })
  })

  describe('resize handling', () => {
    it('should call fitAddon.fit when container is resized via ResizeObserver', async () => {
      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const fitAddon = fitAddonInstances[0]

      // Clear initial fit call from initialization
      fitAddon.fit.mockClear()

      // Verify ResizeObserver callback was registered
      expect(resizeObserverCallbacks.length).toBe(1)

      // Simulate resize by calling the ResizeObserver callback
      await act(async () => {
        resizeObserverCallbacks[0]([], {} as ResizeObserver)
      })

      // fit() should be called on resize
      expect(fitAddon.fit).toHaveBeenCalled()
    })
  })

  describe('history navigation', () => {
    it('should show prompt before history command on arrow up', async () => {
      mockUseShell.history = ['ls', 'pwd']

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      terminal.write.mockClear()
      terminal.writeln.mockClear()

      // Simulate arrow up
      await act(async () => {
        onDataHandler('\x1b[A')
      })

      const writeCalls = terminal.write.mock.calls.map((c) => c[0])

      // Should clear line first
      expect(writeCalls).toContain('\r\x1b[K')

      // Find the prompt write (contains dollar sign)
      const promptCall = writeCalls.find((c) => c.includes('$'))
      expect(promptCall).toBeDefined()

      // Find the history command write
      const historyCall = writeCalls.find((c) => c === 'pwd')
      expect(historyCall).toBeDefined()

      // Prompt should come before history command
      const promptIndex = writeCalls.findIndex((c) => c.includes('$'))
      const historyIndex = writeCalls.findIndex((c) => c === 'pwd')
      expect(promptIndex).toBeLessThan(historyIndex)
    })

    it('should not duplicate history command in output', async () => {
      mockUseShell.history = ['ls']

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      terminal.write.mockClear()

      // Simulate arrow up
      await act(async () => {
        onDataHandler('\x1b[A')
      })

      const writeCalls = terminal.write.mock.calls.map((c) => c[0])

      // Count how many times 'ls' appears
      const lsCount = writeCalls.filter((c) => c === 'ls').length
      expect(lsCount).toBe(1) // Should only appear once
    })
  })

  describe('process control', () => {
    beforeEach(() => {
      // Reset process manager mock state
      mockUseProcessManager.isProcessRunning = false
      mockUseProcessManager.hasForegroundProcess.mockReturnValue(false)
      mockHandleInput.mockReturnValue(false)
      mockStopProcess.mockClear()
      mockHandleInput.mockClear()
    })

    describe('stop button', () => {
      it('should show stop button when process is running', () => {
        mockUseProcessManager.isProcessRunning = true

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const stopButton = screen.queryByRole('button', { name: /stop/i })
        expect(stopButton).toBeInTheDocument()
      })

      it('should not show stop button when no process is running', () => {
        mockUseProcessManager.isProcessRunning = false

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const stopButton = screen.queryByRole('button', { name: /stop/i })
        expect(stopButton).not.toBeInTheDocument()
      })

      it('should call stopProcess when stop button clicked', async () => {
        mockUseProcessManager.isProcessRunning = true

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const stopButton = screen.getByRole('button', { name: /stop/i })
        await act(async () => {
          stopButton.click()
        })

        expect(mockStopProcess).toHaveBeenCalledTimes(1)
      })
    })

    describe('input routing', () => {
      it('should route Enter input to process when process is running', async () => {
        mockUseProcessManager.isProcessRunning = true
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(true)
        mockHandleInput.mockReturnValue(true)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        // Type some text
        await act(async () => {
          onDataHandler('h')
        })
        await act(async () => {
          onDataHandler('i')
        })

        // Press Enter - should route to process
        await act(async () => {
          onDataHandler('\r')
        })

        // Verify handleInput was called with the typed text
        expect(mockHandleInput).toHaveBeenCalledWith('hi')
      })

      it('should execute command normally when no process is running', async () => {
        mockUseProcessManager.isProcessRunning = false
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(false)
        mockHandleInput.mockReturnValue(false)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        // Type and execute a command
        await act(async () => {
          onDataHandler('l')
        })
        await act(async () => {
          onDataHandler('s')
        })
        await act(async () => {
          onDataHandler('\r')
        })

        // Verify command was executed via executeCommandWithContext
        expect(mockExecuteCommandWithContext).toHaveBeenCalledWith(
          'ls',
          expect.any(Function),
          expect.any(Function)
        )
        expect(mockHandleInput).not.toHaveBeenCalled()
      })
    })

    describe('Ctrl+C handling', () => {
      it('should stop process when Ctrl+C pressed and process is running', async () => {
        mockUseProcessManager.isProcessRunning = true
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(true)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        // Press Ctrl+C (char code 3)
        await act(async () => {
          onDataHandler('\x03')
        })

        expect(mockStopProcess).toHaveBeenCalledTimes(1)
      })

      it('should clear line but not stop anything when Ctrl+C pressed with no process', async () => {
        mockUseProcessManager.isProcessRunning = false
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(false)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        // Press Ctrl+C (char code 3)
        await act(async () => {
          onDataHandler('\x03')
        })

        // stopProcess should not be called
        expect(mockStopProcess).not.toHaveBeenCalled()

        // Should write ^C to terminal
        const writeCalls = terminal.write.mock.calls.map((c) => c[0])
        expect(writeCalls).toContain('^C')
      })
    })

    describe('Ctrl+D handling', () => {
      it('should stop process when Ctrl+D pressed with empty line and process running', async () => {
        mockUseProcessManager.isProcessRunning = true
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(true)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        // Press Ctrl+D (char code 4) with empty line
        await act(async () => {
          onDataHandler('\x04')
        })

        expect(mockStopProcess).toHaveBeenCalledTimes(1)
      })

      it('should not stop process when Ctrl+D pressed with non-empty line', async () => {
        mockUseProcessManager.isProcessRunning = true
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(true)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        // Type some text first
        await act(async () => {
          onDataHandler('h')
        })
        await act(async () => {
          onDataHandler('i')
        })

        // Press Ctrl+D (char code 4) with non-empty line
        await act(async () => {
          onDataHandler('\x04')
        })

        // stopProcess should not be called because line is not empty
        expect(mockStopProcess).not.toHaveBeenCalled()
      })

      it('should do nothing when Ctrl+D pressed with no process running', async () => {
        mockUseProcessManager.isProcessRunning = false
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(false)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        terminal.write.mockClear()

        // Press Ctrl+D (char code 4)
        await act(async () => {
          onDataHandler('\x04')
        })

        // stopProcess should not be called
        expect(mockStopProcess).not.toHaveBeenCalled()

        // Should not write anything for Ctrl+D when no process
        // (just silently ignore)
      })
    })

    describe('character input routing', () => {
      it('should buffer characters when process is running', async () => {
        mockUseProcessManager.isProcessRunning = true
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(true)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        terminal.write.mockClear()

        // Type characters while process is running
        await act(async () => {
          onDataHandler('a')
        })
        await act(async () => {
          onDataHandler('b')
        })

        // Characters should be echoed to terminal
        const writeCalls = terminal.write.mock.calls.map((c) => c[0])
        expect(writeCalls.some((c) => c.includes('a'))).toBe(true)
        expect(writeCalls.some((c) => c.includes('b'))).toBe(true)
      })
    })

    describe('prompt state', () => {
      it('should not show prompt when process is running', async () => {
        mockUseProcessManager.isProcessRunning = true
        mockUseProcessManager.hasForegroundProcess.mockReturnValue(true)
        mockHandleInput.mockReturnValue(true)

        render(<ShellTerminal fileSystem={mockFileSystem} />)

        const terminal = terminalInstances[0]
        const onDataHandler = terminal.onData.mock.calls[0][0]

        terminal.write.mockClear()

        // Type and enter while process is running
        await act(async () => {
          onDataHandler('t')
        })
        await act(async () => {
          onDataHandler('e')
        })
        await act(async () => {
          onDataHandler('s')
        })
        await act(async () => {
          onDataHandler('t')
        })
        await act(async () => {
          onDataHandler('\r')
        })

        // Input should be routed to process
        expect(mockHandleInput).toHaveBeenCalledWith('test')

        // Prompt should not be shown (since process is still running)
        const writeCalls = terminal.write.mock.calls.map((c) => c[0])
        // Check that we don't write a new prompt after input
        // The prompt contains '$'
        const promptsAfterInput = writeCalls.filter(
          (c) => c.includes('$') && writeCalls.indexOf(c) > 0
        )
        // Should not have new prompts written (or very few from initial setup)
        expect(promptsAfterInput.length).toBeLessThanOrEqual(1)
      })
    })

    // Arrow key routing to process tests are in ShellTerminal.processKeys.test.tsx
  })

  describe('focus management', () => {
    it('should focus terminal when visible prop changes from false to true', async () => {
      const { rerender } = render(
        <ShellTerminal fileSystem={mockFileSystem} visible={false} />
      )

      const terminal = terminalInstances[0]
      // Clear any initial focus calls
      terminal.focus.mockClear()

      // Change visible from false to true
      rerender(<ShellTerminal fileSystem={mockFileSystem} visible={true} />)

      // Terminal should be focused
      expect(terminal.focus).toHaveBeenCalled()
    })

    it('should not focus terminal when visible prop stays true', async () => {
      const { rerender } = render(
        <ShellTerminal fileSystem={mockFileSystem} visible={true} />
      )

      const terminal = terminalInstances[0]
      // Clear any initial focus calls
      terminal.focus.mockClear()

      // Rerender with same visible=true
      rerender(<ShellTerminal fileSystem={mockFileSystem} visible={true} />)

      // Terminal should not be focused (no change)
      expect(terminal.focus).not.toHaveBeenCalled()
    })

    it('should not focus terminal when visible changes from true to false', async () => {
      const { rerender } = render(
        <ShellTerminal fileSystem={mockFileSystem} visible={true} />
      )

      const terminal = terminalInstances[0]
      // Clear any initial focus calls
      terminal.focus.mockClear()

      // Change visible from true to false
      rerender(<ShellTerminal fileSystem={mockFileSystem} visible={false} />)

      // Terminal should not be focused
      expect(terminal.focus).not.toHaveBeenCalled()
    })

    it('should not focus terminal on initial render (only on transition to visible)', () => {
      render(<ShellTerminal fileSystem={mockFileSystem} visible={true} />)

      const terminal = terminalInstances[0]
      // Focus should only happen when transitioning from not visible to visible
      // On initial render, there is no transition, so focus should not be called
      expect(terminal.focus).not.toHaveBeenCalled()
    })
  })
})
