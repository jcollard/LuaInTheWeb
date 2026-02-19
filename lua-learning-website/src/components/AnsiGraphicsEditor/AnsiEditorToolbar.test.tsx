import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AnsiEditorToolbar, type AnsiEditorToolbarProps } from './AnsiEditorToolbar'
import type { BrushSettings } from './types'

const selectBrush: BrushSettings = {
  char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'select',
}

const pencilBrush: BrushSettings = {
  char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'pencil',
}

function defaultProps(overrides?: Partial<AnsiEditorToolbarProps>): AnsiEditorToolbarProps {
  const brush: BrushSettings = {
    char: '#', fg: [170, 170, 170], bg: [0, 0, 0], mode: 'brush', tool: 'pencil',
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
