import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPalette } from './ColorPalette'
import { AnsiEditorToolbar, type AnsiEditorToolbarProps } from './AnsiEditorToolbar'
import { CGA_PALETTE, DEFAULT_FG, DEFAULT_BG } from './types'
import type { BrushMode, DrawTool, RGBColor } from './types'

// Mock AnsiTerminalPanel since it depends on xterm.js
vi.mock('../AnsiTerminalPanel/AnsiTerminalPanel', () => ({
  AnsiTerminalPanel: ({ onTerminalReady }: { onTerminalReady?: (handle: null) => void }) => {
    // Simulate terminal not ready in test env
    if (onTerminalReady) onTerminalReady(null)
    return <div data-testid="mock-terminal">Mock Terminal</div>
  },
}))

describe('ColorPalette', () => {
  it('should render 16 color swatches', () => {
    const onSelect = vi.fn()
    render(<ColorPalette label="FG" selected={DEFAULT_FG} onSelect={onSelect} />)
    const palette = screen.getByTestId('palette-fg')
    const buttons = palette.querySelectorAll('button')
    expect(buttons).toHaveLength(16)
  })

  it('should render label', () => {
    render(<ColorPalette label="FG" selected={DEFAULT_FG} onSelect={vi.fn()} />)
    expect(screen.getByText('FG')).toBeTruthy()
  })

  it('should call onSelect when a swatch is clicked', () => {
    const onSelect = vi.fn()
    render(<ColorPalette label="FG" selected={DEFAULT_FG} onSelect={onSelect} />)
    const palette = screen.getByTestId('palette-fg')
    const firstButton = palette.querySelectorAll('button')[0]
    fireEvent.click(firstButton)
    expect(onSelect).toHaveBeenCalledWith(CGA_PALETTE[0].rgb)
  })

  it('should mark selected color with aria-pressed', () => {
    render(<ColorPalette label="BG" selected={DEFAULT_BG} onSelect={vi.fn()} />)
    const palette = screen.getByTestId('palette-bg')
    const buttons = palette.querySelectorAll('button')
    // Black (0,0,0) is DEFAULT_BG and first in CGA_PALETTE
    expect(buttons[0].getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1].getAttribute('aria-pressed')).toBe('false')
  })
})

describe('AnsiEditorToolbar', () => {
  const defaultBrush = { char: '#', fg: DEFAULT_FG as RGBColor, bg: DEFAULT_BG as RGBColor, mode: 'brush' as BrushMode, tool: 'pencil' as DrawTool }
  let handlers: Pick<AnsiEditorToolbarProps, 'onSetFg' | 'onSetBg' | 'onSetChar' | 'onClear' | 'onSave' | 'onSaveAs' | 'onSetMode' | 'onSetTool'>

  beforeEach(() => {
    handlers = {
      onSetFg: vi.fn<(color: RGBColor) => void>(),
      onSetBg: vi.fn<(color: RGBColor) => void>(),
      onSetChar: vi.fn<(char: string) => void>(),
      onClear: vi.fn<() => void>(),
      onSave: vi.fn<() => void>(),
      onSaveAs: vi.fn<() => void>(),
      onSetMode: vi.fn<(mode: BrushMode) => void>(),
      onSetTool: vi.fn<(tool: DrawTool) => void>(),
    }
  })

  it('should render toolbar with FG and BG palettes', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    expect(screen.getByTestId('ansi-editor-toolbar')).toBeTruthy()
    expect(screen.getByTestId('palette-fg')).toBeTruthy()
    expect(screen.getByTestId('palette-bg')).toBeTruthy()
  })

  it('should render character input with current brush char', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    const charInput = screen.getByTestId('char-input') as HTMLInputElement
    expect(charInput.value).toBe('#')
  })

  it('should call onSetChar when character input changes', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    const charInput = screen.getByTestId('char-input')
    fireEvent.change(charInput, { target: { value: '@' } })
    expect(handlers.onSetChar).toHaveBeenCalledWith('@')
  })

  it('should render clear button', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    const clearBtn = screen.getByTestId('clear-button')
    expect(clearBtn).toBeTruthy()
  })

  it('should call onClear when clear button is clicked', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    fireEvent.click(screen.getByTestId('clear-button'))
    expect(handlers.onClear).toHaveBeenCalledOnce()
  })

  it('should render Save button', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    expect(screen.getByTestId('save-button')).toBeTruthy()
  })

  it('should call onSave when Save button is clicked', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    fireEvent.click(screen.getByTestId('save-button'))
    expect(handlers.onSave).toHaveBeenCalledOnce()
  })

  it('should render Save As button', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    expect(screen.getByTestId('save-as-button')).toBeTruthy()
  })

  it('should call onSaveAs when Save As button is clicked', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    fireEvent.click(screen.getByTestId('save-as-button'))
    expect(handlers.onSaveAs).toHaveBeenCalledOnce()
  })

  describe('tool selector', () => {
    it('should render Pencil button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-pencil')).toBeTruthy()
    })

    it('should show Pencil as active by default', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-pencil').getAttribute('aria-pressed')).toBe('true')
    })

    it('should call onSetTool when Pencil button is clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-pencil'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('pencil')
    })

    it('should render Line button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-line')).toBeTruthy()
    })

    it('should show Line as active when brush.tool is line', () => {
      const lineBrush = { ...defaultBrush, tool: 'line' as DrawTool }
      render(<AnsiEditorToolbar brush={lineBrush} {...handlers} />)
      expect(screen.getByTestId('tool-line').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('tool-pencil').getAttribute('aria-pressed')).toBe('false')
    })

    it('should call onSetTool with line when Line button is clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-line'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('line')
    })
  })

  describe('mode selector', () => {
    it('should render both mode buttons', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('mode-brush')).toBeTruthy()
      expect(screen.getByTestId('mode-pixel')).toBeTruthy()
    })

    it('should show brush mode as active by default', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('mode-brush').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('mode-pixel').getAttribute('aria-pressed')).toBe('false')
    })

    it('should call onSetMode with pixel when pixel button is clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('mode-pixel'))
      expect(handlers.onSetMode).toHaveBeenCalledWith('pixel')
    })

    it('should call onSetMode with brush when brush button is clicked', () => {
      const pixelBrush = { ...defaultBrush, mode: 'pixel' as BrushMode }
      render(<AnsiEditorToolbar brush={pixelBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('mode-brush'))
      expect(handlers.onSetMode).toHaveBeenCalledWith('brush')
    })

    it('should hide BG palette and Char input in pixel mode', () => {
      const pixelBrush = { ...defaultBrush, mode: 'pixel' as BrushMode }
      render(<AnsiEditorToolbar brush={pixelBrush} {...handlers} />)
      expect(screen.queryByTestId('palette-bg')).toBeNull()
      expect(screen.queryByTestId('char-input')).toBeNull()
    })

    it('should show BG palette and Char input in brush mode', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('palette-bg')).toBeTruthy()
      expect(screen.getByTestId('char-input')).toBeTruthy()
    })
  })
})
