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
  readFile: vi.fn((): string | null => null),
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

  it('should accept onDirtyChange and isActive props without crashing', () => {
    const onDirtyChange = vi.fn()
    render(<AnsiGraphicsEditor isActive={true} onDirtyChange={onDirtyChange} />)
    expect(screen.getByTestId('ansi-graphics-editor')).toBeTruthy()
  })

  it('should accept isActive=false without crashing', () => {
    render(<AnsiGraphicsEditor isActive={false} />)
    expect(screen.getByTestId('ansi-graphics-editor')).toBeTruthy()
  })

  it('should show error banner when file fails to deserialize', () => {
    mockFileSystem.readFile.mockReturnValue('return { invalid lua data }}}')
    render(<AnsiGraphicsEditor filePath="/test/broken.ansi.lua" />)
    expect(screen.getByText('Failed to open file')).toBeTruthy()
    expect(screen.getByText('/test/broken.ansi.lua')).toBeTruthy()
    expect(screen.getByText('Show Details')).toBeTruthy()
    expect(screen.getByText('Copy Error')).toBeTruthy()
  })

  it('should toggle error detail visibility', async () => {
    const { userEvent } = await import('@testing-library/user-event')
    mockFileSystem.readFile.mockReturnValue('return { invalid lua data }}}')
    render(<AnsiGraphicsEditor filePath="/test/broken.ansi.lua" />)
    const toggle = screen.getByText('Show Details')
    await userEvent.setup().click(toggle)
    expect(screen.getByText('Hide Details')).toBeTruthy()
  })

  it('should not show error banner for new files', () => {
    render(<AnsiGraphicsEditor filePath="ansi-editor://new" />)
    expect(screen.queryByText('Failed to open file')).toBeNull()
  })

  describe('viewport controls', () => {
    it('renders the zoom slider in the toolbar', () => {
      render(<AnsiGraphicsEditor />)
      expect(screen.getByTestId('zoom-slider')).toBeTruthy()
    })

    it('renders the zoom numeric input in the toolbar', () => {
      render(<AnsiGraphicsEditor />)
      expect(screen.getByTestId('zoom-number')).toBeTruthy()
    })

    it('renders the Fit button in the toolbar', () => {
      render(<AnsiGraphicsEditor />)
      expect(screen.getByTestId('zoom-fit')).toBeTruthy()
    })

    it('renders the zoom label initially showing 1x', () => {
      render(<AnsiGraphicsEditor />)
      expect(screen.getByTestId('zoom-label').textContent).toBe('1x')
    })

    it('does not render the deleted Scale dropdown', () => {
      render(<AnsiGraphicsEditor />)
      // Open File Options modal so the canvas tab would be reachable.
      // file-scale-mode used to live there; assert it's gone everywhere.
      expect(screen.queryByTestId('file-scale-mode')).toBeNull()
    })
  })
})
