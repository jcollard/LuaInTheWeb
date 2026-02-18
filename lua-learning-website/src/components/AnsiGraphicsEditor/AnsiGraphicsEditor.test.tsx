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
  let handlers: Pick<AnsiEditorToolbarProps, 'onSetFg' | 'onSetBg' | 'onSetChar' | 'onClear' | 'onSave' | 'onSaveAs' | 'onImportPng' | 'onSetMode' | 'onSetTool' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>

  beforeEach(() => {
    handlers = {
      onSetFg: vi.fn<(color: RGBColor) => void>(),
      onSetBg: vi.fn<(color: RGBColor) => void>(),
      onSetChar: vi.fn<(char: string) => void>(),
      onClear: vi.fn<() => void>(),
      onSave: vi.fn<() => void>(),
      onSaveAs: vi.fn<() => void>(),
      onImportPng: vi.fn<() => void>(),
      onSetMode: vi.fn<(mode: BrushMode) => void>(),
      onSetTool: vi.fn<(tool: DrawTool) => void>(),
      onUndo: vi.fn<() => void>(),
      onRedo: vi.fn<() => void>(),
      canUndo: false,
      canRedo: false,
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

    it('should render Rect button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-rect')).toBeTruthy()
    })

    it('should show Rect as active when brush.tool is rect-outline', () => {
      const rectBrush = { ...defaultBrush, tool: 'rect-outline' as DrawTool }
      render(<AnsiEditorToolbar brush={rectBrush} {...handlers} />)
      expect(screen.getByTestId('tool-rect').getAttribute('aria-pressed')).toBe('true')
    })

    it('should show Rect as active when brush.tool is rect-filled', () => {
      const rectBrush = { ...defaultBrush, tool: 'rect-filled' as DrawTool }
      render(<AnsiEditorToolbar brush={rectBrush} {...handlers} />)
      expect(screen.getByTestId('tool-rect').getAttribute('aria-pressed')).toBe('true')
    })

    it('should render flyout with outline and filled options', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('rect-flyout')).toBeTruthy()
      expect(screen.getByTestId('tool-rect-outline')).toBeTruthy()
      expect(screen.getByTestId('tool-rect-filled')).toBeTruthy()
    })

    it('should call onSetTool with rect-outline when outline option clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-rect-outline'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('rect-outline')
    })

    it('should call onSetTool with rect-filled when filled option clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-rect-filled'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('rect-filled')
    })

    it('should show ▭ on rect button when rect-outline is selected', () => {
      const rectBrush = { ...defaultBrush, tool: 'rect-outline' as DrawTool }
      render(<AnsiEditorToolbar brush={rectBrush} {...handlers} />)
      expect(screen.getByTestId('tool-rect').textContent).toContain('▭')
    })

    it('should show ■ on rect button when rect-filled is selected', () => {
      const rectBrush = { ...defaultBrush, tool: 'rect-filled' as DrawTool }
      render(<AnsiEditorToolbar brush={rectBrush} {...handlers} />)
      expect(screen.getByTestId('tool-rect').textContent).toContain('■')
    })
  })

  describe('undo/redo buttons', () => {
    it('should render undo button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={false} canRedo={false} />)
      expect(screen.getByTestId('undo-button')).toBeTruthy()
    })

    it('should render redo button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={false} canRedo={false} />)
      expect(screen.getByTestId('redo-button')).toBeTruthy()
    })

    it('should call onUndo when undo button is clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={true} canRedo={false} />)
      fireEvent.click(screen.getByTestId('undo-button'))
      expect(handlers.onUndo).toHaveBeenCalledOnce()
    })

    it('should call onRedo when redo button is clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={false} canRedo={true} />)
      fireEvent.click(screen.getByTestId('redo-button'))
      expect(handlers.onRedo).toHaveBeenCalledOnce()
    })

    it('should disable undo button when canUndo is false', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={false} canRedo={false} />)
      expect((screen.getByTestId('undo-button') as HTMLButtonElement).disabled).toBe(true)
    })

    it('should disable redo button when canRedo is false', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={false} canRedo={false} />)
      expect((screen.getByTestId('redo-button') as HTMLButtonElement).disabled).toBe(true)
    })

    it('should enable undo button when canUndo is true', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={true} canRedo={false} />)
      expect((screen.getByTestId('undo-button') as HTMLButtonElement).disabled).toBe(false)
    })

    it('should enable redo button when canRedo is true', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} canUndo={false} canRedo={true} />)
      expect((screen.getByTestId('redo-button') as HTMLButtonElement).disabled).toBe(false)
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

  describe('eraser mode', () => {
    it('should render eraser mode button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('mode-eraser')).toBeTruthy()
    })

    it('should call onSetMode with eraser when eraser button is clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('mode-eraser'))
      expect(handlers.onSetMode).toHaveBeenCalledWith('eraser')
    })

    it('should show eraser button as active when brush.mode is eraser', () => {
      const eraserBrush = { ...defaultBrush, mode: 'eraser' as BrushMode }
      render(<AnsiEditorToolbar brush={eraserBrush} {...handlers} />)
      expect(screen.getByTestId('mode-eraser').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('mode-brush').getAttribute('aria-pressed')).toBe('false')
      expect(screen.getByTestId('mode-pixel').getAttribute('aria-pressed')).toBe('false')
    })

    it('should hide BG palette and Char input in eraser mode', () => {
      const eraserBrush = { ...defaultBrush, mode: 'eraser' as BrushMode }
      render(<AnsiEditorToolbar brush={eraserBrush} {...handlers} />)
      expect(screen.queryByTestId('palette-bg')).toBeNull()
      expect(screen.queryByTestId('char-input')).toBeNull()
    })
  })

  describe('flood fill tool', () => {
    it('should render flood fill button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-flood-fill')).toBeTruthy()
    })

    it('should call onSetTool with flood-fill when clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-flood-fill'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('flood-fill')
    })

    it('should show flood fill as active when brush.tool is flood-fill', () => {
      const fillBrush = { ...defaultBrush, tool: 'flood-fill' as DrawTool }
      render(<AnsiEditorToolbar brush={fillBrush} {...handlers} />)
      expect(screen.getByTestId('tool-flood-fill').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('tool-pencil').getAttribute('aria-pressed')).toBe('false')
    })
  })
})
