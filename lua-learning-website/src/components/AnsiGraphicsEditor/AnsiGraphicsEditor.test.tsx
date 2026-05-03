import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act, fireEvent } from '@testing-library/react'
import { AnsiGraphicsEditor } from './AnsiGraphicsEditor'

vi.mock('./pngExport', async () => {
  const actual = await vi.importActual<typeof import('./pngExport')>('./pngExport')
  return {
    ...actual,
    gridToPngBlob: vi.fn(async () => new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' })),
  }
})
import { gridToPngBlob } from './pngExport'

// Captured handler from the most recent panel mount, so tests can
// simulate the terminal becoming ready with a real (sized) wrapper.
let lastOnTerminalReady: ((handle: unknown) => void) | null = null

// Mock AnsiTerminalPanel since it depends on xterm.js. The default
// behavior matches the previous shape — a div that fires
// `onTerminalReady(null)` immediately. Tests that need the live panel
// flow (initial Fit, scroll-element wiring) read `lastOnTerminalReady`
// and call it with a fake handle.
vi.mock('../AnsiTerminalPanel/AnsiTerminalPanel', () => ({
  AnsiTerminalPanel: ({ onTerminalReady }: { onTerminalReady?: (handle: unknown) => void }) => {
    lastOnTerminalReady = onTerminalReady ?? null
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

    it('does not render the deleted DPR-compensate checkbox', () => {
      render(<AnsiGraphicsEditor />)
      expect(screen.queryByTestId('file-dpr-compensate')).toBeNull()
    })

    it('does not render the deleted DprWarning banner', () => {
      render(<AnsiGraphicsEditor />)
      expect(screen.queryByTestId('dpr-warning')).toBeNull()
    })

    it('applies the initial Fit zoom when the panel first reports its scroll container', () => {
      render(<AnsiGraphicsEditor />)
      // Default canvas: 80×25 cells × 8×16 px (IBM_VGA_8x16 default font)
      // = 640×400 source px. Mock a sized scroll container that fits 2x
      // (1300×850 → floor(min(1300/640, 850/400)) = 2).
      const fakeContainer = document.createElement('div')
      Object.defineProperty(fakeContainer, 'clientWidth', { value: 1300 })
      Object.defineProperty(fakeContainer, 'clientHeight', { value: 850 })
      const fakeWrapper = document.createElement('div')
      const fakeHandle = {
        write: () => {},
        container: fakeWrapper,
        scrollContainer: fakeContainer,
        dispose: () => {},
        setCrt: () => {},
      }
      // Initial render shows zoom=1 (the useViewport default before fit).
      expect(screen.getByTestId('zoom-label').textContent).toBe('1x')
      // Simulate panel mount completing with a real handle.
      act(() => { lastOnTerminalReady?.(fakeHandle) })
      // Initial-fit useEffect should have fired and set zoom to 2x.
      expect(screen.getByTestId('zoom-label').textContent).toBe('2x')
    })

    it('does not re-apply initial Fit on subsequent terminal-ready callbacks', () => {
      render(<AnsiGraphicsEditor />)
      const makeContainer = (w: number, h: number) => {
        const c = document.createElement('div')
        Object.defineProperty(c, 'clientWidth', { value: w })
        Object.defineProperty(c, 'clientHeight', { value: h })
        return c
      }
      // First mount: 1300×850 → fit at 2x.
      act(() => {
        lastOnTerminalReady?.({
          write: () => {}, container: document.createElement('div'),
          scrollContainer: makeContainer(1300, 850),
          dispose: () => {}, setCrt: () => {},
        })
      })
      expect(screen.getByTestId('zoom-label').textContent).toBe('2x')
      // Re-fire with a *different* size that would fit 4x. The initial-fit
      // guard should NOT re-apply, leaving zoom at 2x.
      act(() => {
        lastOnTerminalReady?.({
          write: () => {}, container: document.createElement('div'),
          scrollContainer: makeContainer(2700, 1700),
          dispose: () => {}, setCrt: () => {},
        })
      })
      expect(screen.getByTestId('zoom-label').textContent).toBe('2x')
    })
  })

})

describe('AnsiGraphicsEditor — PNG export', () => {
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.spyOn>
  let lastDownloadName: string | null

  beforeEach(() => {
    lastDownloadName = null
    // Earlier tests in this file set readFile to return broken content,
    // and vi.clearAllMocks doesn't reset mock implementations — restore
    // the "no file" default so the editor doesn't render its error banner.
    mockFileSystem.readFile.mockReturnValue(null)
    vi.mocked(gridToPngBlob).mockClear()
    vi.mocked(gridToPngBlob).mockResolvedValue(new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }))
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      lastDownloadName = this.download
    })
  })

  afterEach(() => {
    createObjectURLSpy.mockRestore()
    revokeObjectURLSpy.mockRestore()
    clickSpy.mockRestore()
  })

  function openExportPngDialog(): void {
    fireEvent.click(screen.getByTestId('file-options-button'))
    fireEvent.click(screen.getByTestId('file-export-png'))
  }

  it('clicking File → Export PNG opens the dialog (does not export immediately)', () => {
    render(<AnsiGraphicsEditor filePath="/projects/cool.ansi.lua" />)
    expect(screen.queryByTestId('png-export-overlay')).toBeNull()
    openExportPngDialog()
    expect(screen.getByTestId('png-export-overlay')).toBeTruthy()
    expect(gridToPngBlob).not.toHaveBeenCalled()
  })

  it('seeds the dialog filename from the open file path', () => {
    render(<AnsiGraphicsEditor filePath="/projects/cool.ansi.lua" />)
    openExportPngDialog()
    expect((screen.getByTestId('png-export-filename') as HTMLInputElement).value).toBe('cool')
  })

  it('confirming with a chosen scale calls gridToPngBlob with that scale and downloads with the chosen filename', async () => {
    render(<AnsiGraphicsEditor filePath="/projects/cool.ansi.lua" />)
    openExportPngDialog()
    fireEvent.click(screen.getByTestId('png-export-scale-3x'))
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: 'shot' } })
    await act(async () => {
      fireEvent.click(screen.getByTestId('png-export-confirm'))
    })
    expect(gridToPngBlob).toHaveBeenCalledTimes(1)
    expect(gridToPngBlob).toHaveBeenCalledWith(expect.any(Array), expect.any(String), 3)
    expect(lastDownloadName).toBe('shot.png')
    expect(screen.queryByTestId('png-export-overlay')).toBeNull()
  })

  it('cancelling closes the dialog without calling gridToPngBlob', () => {
    render(<AnsiGraphicsEditor filePath="/projects/cool.ansi.lua" />)
    openExportPngDialog()
    fireEvent.click(screen.getByTestId('png-export-cancel'))
    expect(screen.queryByTestId('png-export-overlay')).toBeNull()
    expect(gridToPngBlob).not.toHaveBeenCalled()
  })
})
