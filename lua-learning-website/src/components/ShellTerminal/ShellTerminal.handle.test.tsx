/**
 * Tests for ShellTerminal imperative handle.
 * Verifies methods exposed via ref (executeCommand, stopCurrentProcess).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { ShellTerminal } from './ShellTerminal'
import type { ShellTerminalHandle } from './types'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

vi.stubGlobal('ResizeObserver', MockResizeObserver)

// Mock xterm.js
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
  })
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-fit', () => {
  const MockFitAddon = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.fit = vi.fn()
  })
  return { FitAddon: MockFitAddon }
})

vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'dark', toggleTheme: vi.fn() }),
}))

vi.mock('./terminalTheme', () => ({
  getTerminalTheme: vi.fn().mockReturnValue({}),
}))

vi.mock('../../hooks/useShell', () => ({
  useShell: () => ({
    executeCommand: vi.fn().mockReturnValue({ exitCode: 0, stdout: '', stderr: '', cwd: '/' }),
    executeCommandWithContext: vi.fn().mockReturnValue({ cwd: '/' }),
    cwd: '/',
    history: [],
    clearHistory: vi.fn(),
    commandNames: [],
    getPathCompletionsForTab: vi.fn().mockReturnValue([]),
  }),
}))

const mockStopProcess = vi.fn()

vi.mock('../../hooks/useProcessManager', () => ({
  useProcessManager: () => ({
    isProcessRunning: false,
    hasForegroundProcess: vi.fn().mockReturnValue(false),
    startProcess: vi.fn(),
    stopProcess: mockStopProcess,
    handleInput: vi.fn().mockReturnValue(false),
    supportsRawInput: vi.fn().mockReturnValue(false),
    handleKey: vi.fn().mockReturnValue(false),
  }),
}))

describe('ShellTerminal imperative handle', () => {
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
    createFileSilent: vi.fn(),
    writeBinaryFileSilent: vi.fn(),
    createFolderSilent: vi.fn(),
    commitBatch: vi.fn(),
    version: 0,
  })

  let mockFileSystem: UseFileSystemReturn

  beforeEach(() => {
    mockFileSystem = createMockFileSystem()
    vi.clearAllMocks()
  })

  it('should expose stopCurrentProcess on the ref', () => {
    const ref = createRef<ShellTerminalHandle>()
    render(<ShellTerminal ref={ref} fileSystem={mockFileSystem} />)

    expect(ref.current).not.toBeNull()
    expect(ref.current?.stopCurrentProcess).toBeInstanceOf(Function)
  })

  it('should call stopProcess when stopCurrentProcess is called', () => {
    const ref = createRef<ShellTerminalHandle>()
    render(<ShellTerminal ref={ref} fileSystem={mockFileSystem} />)

    ref.current?.stopCurrentProcess()

    expect(mockStopProcess).toHaveBeenCalledTimes(1)
  })
})
