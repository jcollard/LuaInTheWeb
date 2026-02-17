import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPalette } from './ColorPalette'
import { AnsiEditorToolbar, type AnsiEditorToolbarProps } from './AnsiEditorToolbar'
import { CGA_PALETTE, DEFAULT_FG, DEFAULT_BG } from './types'
import type { RGBColor } from './types'

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
  const defaultBrush = { char: '#', fg: DEFAULT_FG as RGBColor, bg: DEFAULT_BG as RGBColor }
  let handlers: Pick<AnsiEditorToolbarProps, 'onSetFg' | 'onSetBg' | 'onSetChar' | 'onClear'>

  beforeEach(() => {
    handlers = {
      onSetFg: vi.fn<(color: RGBColor) => void>(),
      onSetBg: vi.fn<(color: RGBColor) => void>(),
      onSetChar: vi.fn<(char: string) => void>(),
      onClear: vi.fn<() => void>(),
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
})
