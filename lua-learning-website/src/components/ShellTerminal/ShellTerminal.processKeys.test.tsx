/**
 * Tests for ShellTerminal process key routing.
 * These tests verify that arrow keys are correctly forwarded to processes
 * when they support raw key input.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, act } from '@testing-library/react'
import { ShellTerminal } from './ShellTerminal'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

// Store terminal instances for testing
let terminalInstances: Array<{
  write: ReturnType<typeof vi.fn>
  writeln: ReturnType<typeof vi.fn>
  onData: ReturnType<typeof vi.fn>
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

// Mock xterm.js
vi.mock('@xterm/xterm', () => {
  const MockTerminal = vi.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
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
    terminalInstances.push({
      write: this.write as ReturnType<typeof vi.fn>,
      writeln: this.writeln as ReturnType<typeof vi.fn>,
      onData: this.onData as ReturnType<typeof vi.fn>,
    })
  })
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-fit', () => {
  const MockFitAddon = vi.fn().mockImplementation(function (
    this: Record<string, unknown>
  ) {
    this.fit = vi.fn()
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

// Mock useShell
const mockUseShell = {
  executeCommand: vi.fn().mockReturnValue({ exitCode: 0, stdout: '', stderr: '', cwd: '/' }),
  executeCommandWithContext: vi.fn().mockReturnValue({ cwd: '/' }),
  cwd: '/',
  history: [] as string[],
  clearHistory: vi.fn(),
  commandNames: ['help', 'ls', 'cd', 'pwd', 'cat', 'echo', 'clear', 'lua'],
  getPathCompletionsForTab: vi.fn().mockReturnValue([]),
}

vi.mock('../../hooks/useShell', () => ({
  useShell: () => mockUseShell,
}))

// Mock useProcessManager
const mockSupportsRawInput = vi.fn().mockReturnValue(false)
const mockHandleKey = vi.fn().mockReturnValue(false)

const mockUseProcessManager = {
  isProcessRunning: false,
  hasForegroundProcess: vi.fn().mockReturnValue(false),
  startProcess: vi.fn(),
  stopProcess: vi.fn(),
  handleInput: vi.fn().mockReturnValue(false),
  supportsRawInput: mockSupportsRawInput,
  handleKey: mockHandleKey,
}

vi.mock('../../hooks/useProcessManager', () => ({
  useProcessManager: () => mockUseProcessManager,
}))

describe('ShellTerminal - Process Key Routing', () => {
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
    mockUseProcessManager.isProcessRunning = false
    mockSupportsRawInput.mockReturnValue(false)
    vi.clearAllMocks()
  })

  describe('arrow key routing', () => {
    it('should forward ArrowUp to process when it supports raw input', async () => {
      mockUseProcessManager.isProcessRunning = true
      mockSupportsRawInput.mockReturnValue(true)

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      mockHandleKey.mockClear()

      await act(async () => {
        onDataHandler('\x1b[A')
      })

      expect(mockHandleKey).toHaveBeenCalledWith('ArrowUp', {
        ctrl: false,
        alt: false,
        shift: false,
      })
    })

    it('should forward ArrowDown to process when it supports raw input', async () => {
      mockUseProcessManager.isProcessRunning = true
      mockSupportsRawInput.mockReturnValue(true)

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      mockHandleKey.mockClear()

      await act(async () => {
        onDataHandler('\x1b[B')
      })

      expect(mockHandleKey).toHaveBeenCalledWith('ArrowDown', {
        ctrl: false,
        alt: false,
        shift: false,
      })
    })

    it('should NOT forward ArrowUp to process when it does not support raw input', async () => {
      mockUseProcessManager.isProcessRunning = true
      mockSupportsRawInput.mockReturnValue(false)
      mockUseShell.history = ['previous command']

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      mockHandleKey.mockClear()

      await act(async () => {
        onDataHandler('\x1b[A')
      })

      expect(mockHandleKey).not.toHaveBeenCalled()
    })

    it('should NOT forward ArrowUp to process when no process is running', async () => {
      mockUseProcessManager.isProcessRunning = false
      mockSupportsRawInput.mockReturnValue(true)
      mockUseShell.history = ['previous command']

      render(<ShellTerminal fileSystem={mockFileSystem} />)

      const terminal = terminalInstances[0]
      const onDataHandler = terminal.onData.mock.calls[0][0]

      mockHandleKey.mockClear()

      await act(async () => {
        onDataHandler('\x1b[A')
      })

      expect(mockHandleKey).not.toHaveBeenCalled()
    })
  })
})
