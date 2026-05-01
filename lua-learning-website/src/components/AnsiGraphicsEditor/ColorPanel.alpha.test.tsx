import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPanel, type ColorPanelProps } from './ColorPanel'
import { DEFAULT_FG, DEFAULT_BG, HALF_BLOCK, TRANSPARENT_BG, TRANSPARENT_HALF } from './types'
import type { RGBColor } from './types'
import { createLayer } from './layerUtils'

describe('ColorPanel — alpha swatch', () => {
  let props: ColorPanelProps

  beforeEach(() => {
    const layer = createLayer('Layer 1', 'layer-default')
    props = {
      selectedFg: DEFAULT_FG,
      selectedBg: DEFAULT_BG,
      brushMode: 'pixel',
      brushChar: HALF_BLOCK,
      onSetFg: vi.fn(),
      onSetBg: vi.fn(),
      onSimplifyColors: vi.fn(),
      layers: [layer],
      activeLayerId: layer.id,
    }
  })

  it('renders the alpha swatch', () => {
    render(<ColorPanel {...props} />)
    expect(screen.getByTestId('alpha-swatch')).toBeTruthy()
  })

  it('left-click sets FG to TRANSPARENT_HALF in pixel mode', () => {
    render(<ColorPanel {...props} brushMode="pixel" brushChar={HALF_BLOCK} />)
    fireEvent.click(screen.getByTestId('alpha-swatch'))
    expect(props.onSetFg).toHaveBeenCalledWith(TRANSPARENT_HALF)
  })

  it('right-click sets BG to TRANSPARENT_HALF in pixel mode', () => {
    render(<ColorPanel {...props} brushMode="pixel" brushChar={HALF_BLOCK} />)
    fireEvent.contextMenu(screen.getByTestId('alpha-swatch'))
    expect(props.onSetBg).toHaveBeenCalledWith(TRANSPARENT_HALF)
  })

  it('right-click sets BG to TRANSPARENT_BG in brush mode with a glyph char', () => {
    render(<ColorPanel {...props} brushMode="brush" brushChar="X" />)
    fireEvent.contextMenu(screen.getByTestId('alpha-swatch'))
    expect(props.onSetBg).toHaveBeenCalledWith(TRANSPARENT_BG)
  })

  it('left-click is a no-op in brush mode with a non-HALF_BLOCK glyph', () => {
    render(<ColorPanel {...props} brushMode="brush" brushChar="X" />)
    fireEvent.click(screen.getByTestId('alpha-swatch'))
    expect(props.onSetFg).not.toHaveBeenCalled()
  })

  it('marks data-fg-disabled when FG alpha is not allowed', () => {
    render(<ColorPanel {...props} brushMode="brush" brushChar="X" />)
    const swatch = screen.getByTestId('alpha-swatch')
    expect(swatch.getAttribute('data-fg-disabled')).toBe('true')
  })

  it('shows fg-selected indicator when selectedFg is alpha', () => {
    render(<ColorPanel {...props} selectedFg={[...TRANSPARENT_HALF] as RGBColor} />)
    const swatch = screen.getByTestId('alpha-swatch')
    expect(swatch.getAttribute('data-fg-selected')).toBe('true')
  })

  it('shows bg-selected indicator when selectedBg is alpha', () => {
    render(<ColorPanel {...props} selectedBg={[...TRANSPARENT_BG] as RGBColor} />)
    const swatch = screen.getByTestId('alpha-swatch')
    expect(swatch.getAttribute('data-bg-selected')).toBe('true')
  })

  it('disables FG button click + brightness when FG slot is alpha', () => {
    render(<ColorPanel {...props} selectedFg={[...TRANSPARENT_HALF] as RGBColor} />)
    const fgBtn = screen.getByTestId('fg-color-btn') as HTMLButtonElement
    const fgDarken = screen.getByTestId('fg-darken-btn') as HTMLButtonElement
    const fgLighten = screen.getByTestId('fg-lighten-btn') as HTMLButtonElement
    expect(fgBtn.disabled).toBe(true)
    expect(fgDarken.disabled).toBe(true)
    expect(fgLighten.disabled).toBe(true)
  })

  it('disables BG button click + brightness when BG slot is alpha', () => {
    render(<ColorPanel {...props} selectedBg={[...TRANSPARENT_BG] as RGBColor} />)
    const bgBtn = screen.getByTestId('bg-color-btn') as HTMLButtonElement
    const bgDarken = screen.getByTestId('bg-darken-btn') as HTMLButtonElement
    const bgLighten = screen.getByTestId('bg-lighten-btn') as HTMLButtonElement
    expect(bgBtn.disabled).toBe(true)
    expect(bgDarken.disabled).toBe(true)
    expect(bgLighten.disabled).toBe(true)
  })

  it('keeps the opposite slot enabled when only one slot is alpha', () => {
    render(<ColorPanel {...props} selectedFg={[...TRANSPARENT_HALF] as RGBColor} />)
    const bgBtn = screen.getByTestId('bg-color-btn') as HTMLButtonElement
    expect(bgBtn.disabled).toBe(false)
  })
})
