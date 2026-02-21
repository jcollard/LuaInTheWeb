import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnsiEditorToolbar, type AnsiEditorToolbarProps } from './AnsiEditorToolbar'
import type { BrushSettings } from './types'
import { BORDER_PRESETS } from './types'

const defaultBorderStyle = BORDER_PRESETS[0].style

const selectBrush: BrushSettings = {
  char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'select', borderStyle: defaultBorderStyle,
}

const pencilBrush: BrushSettings = {
  char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'pencil', borderStyle: defaultBorderStyle,
}

function defaultProps(overrides?: Partial<AnsiEditorToolbarProps>): AnsiEditorToolbarProps {
  const brush: BrushSettings = {
    char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'pencil',
    borderStyle: defaultBorderStyle,
    ...overrides?.brush as Partial<BrushSettings>,
  }
  return {
    brush,
    onSetChar: vi.fn(),
    onSetMode: vi.fn(),
    onSetTool: vi.fn(),
    onClear: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onImportPng: vi.fn(),
    onExportAns: vi.fn(),
    onExportSh: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    canUndo: false,
    canRedo: false,
    ...overrides,
  }
}

describe('AnsiEditorToolbar flip horizontal button', () => {
  it('is visible when brush.tool === "select" and onFlipHorizontal provided', () => {
    const props = defaultProps({ brush: selectBrush, onFlipHorizontal: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('flip-horizontal')).toBeTruthy()
  })

  it('is hidden when tool is not "select"', () => {
    const props = defaultProps({ brush: pencilBrush, onFlipHorizontal: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.queryByTestId('flip-horizontal')).toBeNull()
  })

  it('is hidden when onFlipHorizontal is not provided', () => {
    const props = defaultProps({ brush: selectBrush })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.queryByTestId('flip-horizontal')).toBeNull()
  })

  it('calls onFlipHorizontal when clicked', async () => {
    const onFlip = vi.fn()
    const props = defaultProps({ brush: selectBrush, onFlipHorizontal: onFlip })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('flip-horizontal'))
    expect(onFlip).toHaveBeenCalledOnce()
  })
})

describe('AnsiEditorToolbar flip vertical button', () => {
  it('is visible when brush.tool === "select" and onFlipVertical provided', () => {
    const props = defaultProps({ brush: selectBrush, onFlipVertical: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('flip-vertical')).toBeTruthy()
  })

  it('is hidden when tool is not "select"', () => {
    const props = defaultProps({ brush: pencilBrush, onFlipVertical: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.queryByTestId('flip-vertical')).toBeNull()
  })

  it('is hidden when onFlipVertical is not provided', () => {
    const props = defaultProps({ brush: selectBrush })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.queryByTestId('flip-vertical')).toBeNull()
  })

  it('calls onFlipVertical when clicked', async () => {
    const onFlip = vi.fn()
    const props = defaultProps({ brush: selectBrush, onFlipVertical: onFlip })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('flip-vertical'))
    expect(onFlip).toHaveBeenCalledOnce()
  })
})

describe('AnsiEditorToolbar blend-pixel mode button', () => {
  it('renders blend-pixel button in mode group', () => {
    const props = defaultProps()
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('mode-blend-pixel')).toBeTruthy()
  })

  it('shows active state when blend-pixel mode is selected', () => {
    const blendBrush: BrushSettings = { ...pencilBrush, mode: 'blend-pixel' }
    const props = defaultProps({ brush: blendBrush })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('mode-blend-pixel').getAttribute('aria-pressed')).toBe('true')
  })

  it('calls onSetMode with blend-pixel when clicked', async () => {
    const onSetMode = vi.fn()
    const props = defaultProps({ onSetMode })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('mode-blend-pixel'))
    expect(onSetMode).toHaveBeenCalledWith('blend-pixel')
  })

  it('is disabled when border tool is active', () => {
    const borderBrush: BrushSettings = { ...pencilBrush, tool: 'border' }
    const props = defaultProps({ brush: borderBrush, onSetBorderStyle: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('mode-blend-pixel').hasAttribute('disabled')).toBe(true)
  })
})

const flipBrush: BrushSettings = {
  char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'flip', borderStyle: defaultBorderStyle,
}

describe('AnsiEditorToolbar move/flip flyout', () => {
  it('renders move flyout with move and flip options', () => {
    const props = defaultProps()
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('move-flyout')).toBeTruthy()
    expect(screen.getByTestId('tool-move-option')).toBeTruthy()
    expect(screen.getByTestId('tool-flip-option')).toBeTruthy()
  })

  it('shows flip icon when flip tool is active', () => {
    const props = defaultProps({ brush: flipBrush })
    render(<AnsiEditorToolbar {...props} />)
    const btn = screen.getByTestId('tool-move')
    expect(btn.textContent).toContain('⇔')
  })

  it('shows move icon when move tool is active', () => {
    const moveBrush: BrushSettings = { ...pencilBrush, tool: 'move' }
    const props = defaultProps({ brush: moveBrush })
    render(<AnsiEditorToolbar {...props} />)
    const btn = screen.getByTestId('tool-move')
    expect(btn.textContent).toContain('✥')
  })

  it('calls onSetTool with flip when flip option is clicked', async () => {
    const onSetTool = vi.fn()
    const props = defaultProps({ onSetTool })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('tool-flip-option'))
    expect(onSetTool).toHaveBeenCalledWith('flip')
  })
})

describe('AnsiEditorToolbar flip layer buttons', () => {
  it('shows flip layer buttons when tool is flip', () => {
    const props = defaultProps({
      brush: flipBrush,
      onFlipLayerHorizontal: vi.fn(),
      onFlipLayerVertical: vi.fn(),
      flipOrigin: { row: 12, col: 40 },
    })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('flip-layer-horizontal')).toBeTruthy()
    expect(screen.getByTestId('flip-layer-vertical')).toBeTruthy()
  })

  it('hides flip layer buttons when tool is not flip', () => {
    const props = defaultProps({
      brush: pencilBrush,
      onFlipLayerHorizontal: vi.fn(),
      onFlipLayerVertical: vi.fn(),
    })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.queryByTestId('flip-layer-horizontal')).toBeNull()
    expect(screen.queryByTestId('flip-layer-vertical')).toBeNull()
  })

  it('calls onFlipLayerHorizontal when clicked', async () => {
    const onFlip = vi.fn()
    const props = defaultProps({
      brush: flipBrush,
      onFlipLayerHorizontal: onFlip,
      onFlipLayerVertical: vi.fn(),
      flipOrigin: { row: 12, col: 40 },
    })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('flip-layer-horizontal'))
    expect(onFlip).toHaveBeenCalledOnce()
  })

  it('calls onFlipLayerVertical when clicked', async () => {
    const onFlip = vi.fn()
    const props = defaultProps({
      brush: flipBrush,
      onFlipLayerHorizontal: vi.fn(),
      onFlipLayerVertical: onFlip,
      flipOrigin: { row: 12, col: 40 },
    })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('flip-layer-vertical'))
    expect(onFlip).toHaveBeenCalledOnce()
  })

  it('displays the origin coordinates', () => {
    const props = defaultProps({
      brush: flipBrush,
      onFlipLayerHorizontal: vi.fn(),
      onFlipLayerVertical: vi.fn(),
      flipOrigin: { row: 5, col: 20 },
    })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('flip-origin-display').textContent).toContain('20')
    expect(screen.getByTestId('flip-origin-display').textContent).toContain('5')
  })
})

describe('AnsiEditorToolbar border flyout', () => {
  it('renders the border flyout with preset options', () => {
    const onSetBorderStyle = vi.fn()
    const props = defaultProps({ onSetBorderStyle })
    render(<AnsiEditorToolbar {...props} />)
    const flyout = screen.getByTestId('border-flyout')
    expect(flyout).toBeTruthy()
    for (const preset of BORDER_PRESETS) {
      expect(screen.getByTestId(`border-preset-${preset.name}`)).toBeTruthy()
    }
  })

  it('calls onSetTool and onSetBorderStyle when a preset is clicked', async () => {
    const onSetTool = vi.fn()
    const onSetBorderStyle = vi.fn()
    const props = defaultProps({ onSetTool, onSetBorderStyle })
    render(<AnsiEditorToolbar {...props} />)
    await userEvent.click(screen.getByTestId('border-preset-Double'))
    expect(onSetBorderStyle).toHaveBeenCalledWith(BORDER_PRESETS[2].style)
    expect(onSetTool).toHaveBeenCalledWith('border')
  })

  it('highlights the active preset', () => {
    const doubleBrush: BrushSettings = {
      ...pencilBrush, tool: 'border', borderStyle: BORDER_PRESETS[2].style,
    }
    const props = defaultProps({ brush: doubleBrush, onSetBorderStyle: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    const doubleBtn = screen.getByTestId('border-preset-Double')
    expect(doubleBtn.getAttribute('aria-pressed')).toBe('true')
    const asciiBtn = screen.getByTestId('border-preset-ASCII')
    expect(asciiBtn.getAttribute('aria-pressed')).toBe('false')
  })

  it('disables pixel and eraser mode buttons when border tool is active', () => {
    const borderBrush: BrushSettings = {
      ...pencilBrush, tool: 'border',
    }
    const props = defaultProps({ brush: borderBrush, onSetBorderStyle: vi.fn() })
    render(<AnsiEditorToolbar {...props} />)
    expect(screen.getByTestId('mode-pixel').hasAttribute('disabled')).toBe(true)
    expect(screen.getByTestId('mode-eraser').hasAttribute('disabled')).toBe(true)
    expect(screen.getByTestId('mode-brush').hasAttribute('disabled')).toBe(false)
  })
})
