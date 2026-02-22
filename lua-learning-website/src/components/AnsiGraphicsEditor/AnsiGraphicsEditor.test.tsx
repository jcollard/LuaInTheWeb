import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnsiGraphicsEditor } from './AnsiGraphicsEditor'

// Mock AnsiTerminalPanel since it depends on xterm.js
vi.mock('../AnsiTerminalPanel/AnsiTerminalPanel', () => ({
  AnsiTerminalPanel: ({ onTerminalReady }: { onTerminalReady?: (handle: null) => void }) => {
    if (onTerminalReady) onTerminalReady(null)
    return <div data-testid="mock-terminal">Mock Terminal</div>
  },
}))

// Mock useIDE to provide required IDE context
const mockFileSystem = {
  readFile: vi.fn(() => null),
  writeFile: vi.fn(),
  createFile: vi.fn(),
  exists: vi.fn(() => false),
  flush: vi.fn(async () => {}),
}

vi.mock('../IDEContext/useIDE', () => ({
  useIDE: () => ({
    fileSystem: mockFileSystem,
    fileTree: [],
    refreshFileTree: vi.fn(),
    updateAnsiEditorTabPath: vi.fn(),
  }),
}))

describe('AnsiGraphicsEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render the editor container', () => {
    render(<AnsiGraphicsEditor />)
    expect(screen.getByTestId('ansi-graphics-editor')).toBeTruthy()
  })

  it('should render the toolbar', () => {
    render(<AnsiGraphicsEditor />)
    expect(screen.getByTestId('ansi-editor-toolbar')).toBeTruthy()
  })

  it('should render the color panel', () => {
    render(<AnsiGraphicsEditor />)
    expect(screen.getByTestId('color-panel')).toBeTruthy()
  })

  it('should render the layers panel', () => {
    render(<AnsiGraphicsEditor />)
    expect(screen.getByTestId('layers-panel')).toBeTruthy()
  })

  it('should render the terminal panel', () => {
    render(<AnsiGraphicsEditor />)
    expect(screen.getByTestId('mock-terminal')).toBeTruthy()
  })

  it('should render with a filePath prop without crashing', () => {
    render(<AnsiGraphicsEditor filePath="ansi-editor://new" />)
    expect(screen.getByTestId('ansi-graphics-editor')).toBeTruthy()
  })

  it('should render the png file input', () => {
    render(<AnsiGraphicsEditor />)
    expect(screen.getByTestId('png-file-input')).toBeTruthy()
  })
})
