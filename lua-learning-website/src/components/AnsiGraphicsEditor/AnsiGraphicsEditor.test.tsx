import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AnsiEditorToolbar, type AnsiEditorToolbarProps } from './AnsiEditorToolbar'
import { DEFAULT_FG, DEFAULT_BG } from './types'
import type { BrushMode, DrawTool, RGBColor } from './types'

// Mock AnsiTerminalPanel since it depends on xterm.js
vi.mock('../AnsiTerminalPanel/AnsiTerminalPanel', () => ({
  AnsiTerminalPanel: ({ onTerminalReady }: { onTerminalReady?: (handle: null) => void }) => {
    // Simulate terminal not ready in test env
    if (onTerminalReady) onTerminalReady(null)
    return <div data-testid="mock-terminal">Mock Terminal</div>
  },
}))

describe('AnsiEditorToolbar', () => {
  const defaultBrush = { char: '#', fg: DEFAULT_FG as RGBColor, bg: DEFAULT_BG as RGBColor, mode: 'brush' as BrushMode, tool: 'pencil' as DrawTool }
  let handlers: Pick<AnsiEditorToolbarProps, 'onSetChar' | 'onClear' | 'onSave' | 'onSaveAs' | 'onImportPng' | 'onSetMode' | 'onSetTool' | 'onUndo' | 'onRedo' | 'canUndo' | 'canRedo'>

  beforeEach(() => {
    handlers = {
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

  it('should render toolbar', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    expect(screen.getByTestId('ansi-editor-toolbar')).toBeTruthy()
  })

  it('should render character button with current brush char', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    const charButton = screen.getByTestId('char-button')
    expect(charButton.textContent).toBe('#')
  })

  it('should open character palette on button click', () => {
    render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
    fireEvent.click(screen.getByTestId('char-button'))
    expect(screen.getByTestId('char-palette-modal')).toBeTruthy()
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

    it('should hide Char button in pixel mode', () => {
      const pixelBrush = { ...defaultBrush, mode: 'pixel' as BrushMode }
      render(<AnsiEditorToolbar brush={pixelBrush} {...handlers} />)
      expect(screen.queryByTestId('char-button')).toBeNull()
    })

    it('should show Char button in brush mode', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('char-button')).toBeTruthy()
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

    it('should hide Char button in eraser mode', () => {
      const eraserBrush = { ...defaultBrush, mode: 'eraser' as BrushMode }
      render(<AnsiEditorToolbar brush={eraserBrush} {...handlers} />)
      expect(screen.queryByTestId('char-button')).toBeNull()
    })
  })

  describe('select tool', () => {
    it('should render select button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-select')).toBeTruthy()
    })

    it('should call onSetTool with select when clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-select'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('select')
    })

    it('should show select as active when brush.tool is select', () => {
      const selectBrush = { ...defaultBrush, tool: 'select' as DrawTool }
      render(<AnsiEditorToolbar brush={selectBrush} {...handlers} />)
      expect(screen.getByTestId('tool-select').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('tool-pencil').getAttribute('aria-pressed')).toBe('false')
    })
  })

  describe('hover tooltips', () => {
    it('should have title attributes on all tool buttons', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      const expected: Record<string, string> = {
        'tool-pencil': 'Pencil',
        'tool-line': 'Line',
        'tool-rect': 'Rectangle',
        'tool-flood-fill': 'Flood Fill',
        'tool-select': 'Select',
        'tool-eyedropper': 'Eyedropper',
        'mode-brush': 'Brush',
        'mode-pixel': 'Pixel',
        'mode-eraser': 'Eraser',
        'clear-button': 'Clear canvas',
        'save-button': 'Save',
        'save-as-button': 'Save As',
        'import-png-button': 'Import PNG as layer',
        'undo-button': 'Undo',
        'redo-button': 'Redo',
      }
      for (const [testId, title] of Object.entries(expected)) {
        const el = screen.getByTestId(testId)
        expect(el.getAttribute('title'), `${testId} should have title="${title}"`).toBe(title)
      }
    })
  })

  describe('eyedropper tool', () => {
    it('should render eyedropper button', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      expect(screen.getByTestId('tool-eyedropper')).toBeTruthy()
    })

    it('should call onSetTool with eyedropper when clicked', () => {
      render(<AnsiEditorToolbar brush={defaultBrush} {...handlers} />)
      fireEvent.click(screen.getByTestId('tool-eyedropper'))
      expect(handlers.onSetTool).toHaveBeenCalledWith('eyedropper')
    })

    it('should show eyedropper as active when brush.tool is eyedropper', () => {
      const eyedropperBrush = { ...defaultBrush, tool: 'eyedropper' as DrawTool }
      render(<AnsiEditorToolbar brush={eyedropperBrush} {...handlers} />)
      expect(screen.getByTestId('tool-eyedropper').getAttribute('aria-pressed')).toBe('true')
      expect(screen.getByTestId('tool-pencil').getAttribute('aria-pressed')).toBe('false')
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
