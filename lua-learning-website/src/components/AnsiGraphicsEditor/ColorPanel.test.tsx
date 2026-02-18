import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPanel, type ColorPanelProps } from './ColorPanel'
import { CGA_PALETTE, DEFAULT_FG, DEFAULT_BG } from './types'
import type { RGBColor } from './types'

describe('ColorPanel', () => {
  let props: ColorPanelProps

  beforeEach(() => {
    props = {
      selectedFg: DEFAULT_FG,
      selectedBg: DEFAULT_BG,
      onSetFg: vi.fn(),
      onSetBg: vi.fn(),
    }
  })

  it('renders the Colors header', () => {
    render(<ColorPanel {...props} />)
    expect(screen.getByText('Colors')).toBeTruthy()
  })

  it('renders palette selector buttons', () => {
    render(<ColorPanel {...props} />)
    expect(screen.getByTestId('palette-btn-cga')).toBeTruthy()
    expect(screen.getByTestId('palette-btn-ega')).toBeTruthy()
    expect(screen.getByTestId('palette-btn-vga')).toBeTruthy()
  })

  it('defaults to CGA palette with 16 swatches', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches).toHaveLength(16)
  })

  it('switches to EGA palette showing 64 swatches', () => {
    render(<ColorPanel {...props} />)
    fireEvent.click(screen.getByTestId('palette-btn-ega'))
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches).toHaveLength(64)
  })

  it('switches to VGA palette showing 256 swatches', () => {
    render(<ColorPanel {...props} />)
    fireEvent.click(screen.getByTestId('palette-btn-vga'))
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches).toHaveLength(256)
  })

  it('left-click on swatch calls onSetFg', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const firstSwatch = grid.querySelectorAll('button')[0]
    fireEvent.click(firstSwatch)
    expect(props.onSetFg).toHaveBeenCalledWith(CGA_PALETTE[0].rgb)
  })

  it('right-click on swatch calls onSetBg', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const firstSwatch = grid.querySelectorAll('button')[0]
    fireEvent.contextMenu(firstSwatch)
    expect(props.onSetBg).toHaveBeenCalledWith(CGA_PALETTE[0].rgb)
  })

  it('marks FG-selected swatch with data-fg-selected', () => {
    // DEFAULT_FG is [170,170,170] = Light Gray, index 7
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches[7].getAttribute('data-fg-selected')).toBe('true')
    expect(swatches[0].getAttribute('data-fg-selected')).toBeNull()
  })

  it('marks BG-selected swatch with data-bg-selected', () => {
    // DEFAULT_BG is [0,0,0] = Black, index 0
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches[0].getAttribute('data-bg-selected')).toBe('true')
    expect(swatches[1].getAttribute('data-bg-selected')).toBeNull()
  })

  it('marks same swatch with both FG and BG when they match', () => {
    const sameColor: RGBColor = [0, 0, 0]
    render(<ColorPanel {...props} selectedFg={sameColor} selectedBg={sameColor} />)
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches[0].getAttribute('data-fg-selected')).toBe('true')
    expect(swatches[0].getAttribute('data-bg-selected')).toBe('true')
  })

  it('highlights the active palette button', () => {
    render(<ColorPanel {...props} />)
    const cgaBtn = screen.getByTestId('palette-btn-cga')
    expect(cgaBtn.getAttribute('aria-pressed')).toBe('true')

    fireEvent.click(screen.getByTestId('palette-btn-ega'))
    expect(screen.getByTestId('palette-btn-ega').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByTestId('palette-btn-cga').getAttribute('aria-pressed')).toBe('false')
  })

  it('swatch has correct title and aria-label from palette entry', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const firstSwatch = grid.querySelectorAll('button')[0]
    expect(firstSwatch.getAttribute('title')).toBe('Black')
    expect(firstSwatch.getAttribute('aria-label')).toBe('Black')
  })

  it('swatch has correct background color style', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    // Second swatch is Blue [0,0,170]
    const blueSwatch = grid.querySelectorAll('button')[1]
    expect(blueSwatch.style.backgroundColor).toBe('rgb(0, 0, 170)')
  })

  it('palette buttons display uppercase text', () => {
    render(<ColorPanel {...props} />)
    expect(screen.getByTestId('palette-btn-cga').textContent).toBe('CGA')
    expect(screen.getByTestId('palette-btn-ega').textContent).toBe('EGA')
    expect(screen.getByTestId('palette-btn-vga').textContent).toBe('VGA')
  })

  it('VGA palette button is not active by default', () => {
    render(<ColorPanel {...props} />)
    expect(screen.getByTestId('palette-btn-vga').getAttribute('aria-pressed')).toBe('false')
  })

  it('does not call onSetBg with invalid hex', () => {
    render(<ColorPanel {...props} />)
    const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
    fireEvent.change(hexInput, { target: { value: 'xyz' } })
    fireEvent.click(screen.getByTestId('apply-bg-btn'))
    expect(props.onSetBg).not.toHaveBeenCalled()
  })

  it('hex input updates when selectedFg changes', () => {
    const { rerender } = render(<ColorPanel {...props} />)
    rerender(<ColorPanel {...props} selectedFg={[0, 0, 255]} />)
    const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
    expect(hexInput.value).toBe('#0000ff')
  })

  it('clicking second swatch calls onSetFg with correct color', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const secondSwatch = grid.querySelectorAll('button')[1]
    fireEvent.click(secondSwatch)
    expect(props.onSetFg).toHaveBeenCalledWith(CGA_PALETTE[1].rgb)
  })

  it('right-click second swatch calls onSetBg with correct color', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const secondSwatch = grid.querySelectorAll('button')[1]
    fireEvent.contextMenu(secondSwatch)
    expect(props.onSetBg).toHaveBeenCalledWith(CGA_PALETTE[1].rgb)
  })

  it('non-selected swatch does not have swatchFgSelected or swatchBgSelected classes', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    // Index 1 (Blue) is neither FG nor BG
    const swatch = grid.querySelectorAll('button')[1]
    expect(swatch.getAttribute('data-fg-selected')).toBeNull()
    expect(swatch.getAttribute('data-bg-selected')).toBeNull()
  })

  it('switching back to CGA after EGA shows 16 swatches', () => {
    render(<ColorPanel {...props} />)
    fireEvent.click(screen.getByTestId('palette-btn-ega'))
    fireEvent.click(screen.getByTestId('palette-btn-cga'))
    const grid = screen.getByTestId('color-grid')
    expect(grid.querySelectorAll('button')).toHaveLength(16)
  })

  describe('custom color picker', () => {
    it('renders hex input', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('hex-input')).toBeTruthy()
    })

    it('renders FG and BG apply buttons', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('apply-fg-btn')).toBeTruthy()
      expect(screen.getByTestId('apply-bg-btn')).toBeTruthy()
    })

    it('FG apply button calls onSetFg with hex color', () => {
      render(<ColorPanel {...props} />)
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      fireEvent.change(hexInput, { target: { value: '#ff0000' } })
      fireEvent.click(screen.getByTestId('apply-fg-btn'))
      expect(props.onSetFg).toHaveBeenCalledWith([255, 0, 0])
    })

    it('BG apply button calls onSetBg with hex color', () => {
      render(<ColorPanel {...props} />)
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      fireEvent.change(hexInput, { target: { value: '#00ff00' } })
      fireEvent.click(screen.getByTestId('apply-bg-btn'))
      expect(props.onSetBg).toHaveBeenCalledWith([0, 255, 0])
    })

    it('does not call onSetFg with invalid hex', () => {
      render(<ColorPanel {...props} />)
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      fireEvent.change(hexInput, { target: { value: 'xyz' } })
      fireEvent.click(screen.getByTestId('apply-fg-btn'))
      expect(props.onSetFg).not.toHaveBeenCalled()
    })

    it('renders hue bar canvas', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('hue-bar')).toBeTruthy()
    })

    it('renders SV gradient canvas', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('sv-gradient')).toBeTruthy()
    })

    it('renders hex input pre-filled with current FG color', () => {
      render(<ColorPanel {...props} selectedFg={[255, 0, 0]} />)
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      expect(hexInput.value).toBe('#ff0000')
    })
  })
})
