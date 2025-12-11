import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { ShellTerminal } from './ShellTerminal'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

// Store terminal instances for testing
let terminalInstances: Array<{
  write: ReturnType<typeof vi.fn>
  writeln: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
}> = []

// Mock xterm.js - use factory functions for vi.mock hoisting
vi.mock('@xterm/xterm', () => {
  const MockTerminal = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.loadAddon = vi.fn()
    this.open = vi.fn()
    this.write = vi.fn()
    this.writeln = vi.fn()
    this.onData = vi.fn()
    this.dispose = vi.fn()
    this.clear = vi.fn()
    this.refresh = vi.fn()
    this.rows = 24
    this.options = {}
    // Store instance for test access
    terminalInstances.push({
      write: this.write as ReturnType<typeof vi.fn>,
      writeln: this.writeln as ReturnType<typeof vi.fn>,
      onData: this.onData as ReturnType<typeof vi.fn>,
    })
  })
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-fit', () => {
  const MockFitAddon = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.fit = vi.fn()
  })
  return { FitAddon: MockFitAddon }
})

// Mock contexts
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

vi.mock('../BashTerminal/terminalTheme', () => ({
  getTerminalTheme: vi.fn().mockReturnValue({}),
}))

// Mock useShell with mutable state for testing
const mockExecuteCommand = vi.fn().mockReturnValue({
  exitCode: 0,
  stdout: '',
  stderr: '',
  cwd: '/',
})

const mockUseShell = {
  executeCommand: mockExecuteCommand,
  cwd: '/',
  history: [] as string[],
  clearHistory: vi.fn(),
}

vi.mock('../../hooks/useShell', () => ({
  useShell: () => mockUseShell,
}))

describe('ShellTerminal', () => {
  const createMockFileSystem = (): UseFileSystemReturn => ({
    createFile: vi.fn(),
    readFile: vi.fn().mockReturnValue(null),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    renameFile: vi.fn(),
    moveFile: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    renameFolder: vi.fn(),
    exists: vi.fn().mockReturnValue(true),
    isDirectory: vi.fn().mockReturnValue(true),
    listDirectory: vi.fn().mockReturnValue([]),
    getTree: vi.fn().mockReturnValue([]),
  })

  let mockFileSystem: UseFileSystemReturn

  beforeEach(() => {
    mockFileSystem = createMockFileSystem()
    terminalInstances = []
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
      mockExecuteCommand.mockReturnValue({
        exitCode: 0,
        stdout: 'test output',
        stderr: '',
        cwd: '/',
      })

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
      mockExecuteCommand.mockReturnValue({
        exitCode: 0,
        stdout: 'file1.txt\nfile2.txt',
        stderr: '',
        cwd: '/',
      })

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

      // Should have written the output lines
      const writelnCalls = terminal.writeln.mock.calls.map((c) => c[0])
      expect(writelnCalls).toContain('file1.txt')
      expect(writelnCalls).toContain('file2.txt')
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
})
