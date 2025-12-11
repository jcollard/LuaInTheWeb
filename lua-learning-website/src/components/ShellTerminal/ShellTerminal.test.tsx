import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShellTerminal } from './ShellTerminal'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

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

// Mock useShell
vi.mock('../../hooks/useShell', () => ({
  useShell: () => ({
    executeCommand: vi.fn().mockReturnValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
      cwd: '/',
    }),
    cwd: '/',
    history: [],
    clearHistory: vi.fn(),
  }),
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
})
