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
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
    const swatches = grid.querySelectorAll('button')
    expect(swatches[7].getAttribute('data-fg-selected')).toBe('true')
    expect(swatches[0].getAttribute('data-fg-selected')).toBeNull()
  })

  it('marks BG-selected swatch with data-bg-selected', () => {
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

  it('non-selected swatch does not have data-fg-selected or data-bg-selected', () => {
    render(<ColorPanel {...props} />)
    const grid = screen.getByTestId('color-grid')
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

  describe('FG/BG color buttons', () => {
    it('renders FG button with current foreground color', () => {
      render(<ColorPanel {...props} />)
      const fgBtn = screen.getByTestId('fg-color-btn')
      expect(fgBtn).toBeTruthy()
      expect(fgBtn.style.backgroundColor).toBe('rgb(170, 170, 170)')
    })

    it('renders BG button with current background color', () => {
      render(<ColorPanel {...props} />)
      const bgBtn = screen.getByTestId('bg-color-btn')
      expect(bgBtn).toBeTruthy()
      expect(bgBtn.style.backgroundColor).toBe('rgb(0, 0, 0)')
    })

    it('FG button updates color when selectedFg changes', () => {
      const { rerender } = render(<ColorPanel {...props} />)
      rerender(<ColorPanel {...props} selectedFg={[255, 0, 0]} />)
      expect(screen.getByTestId('fg-color-btn').style.backgroundColor).toBe('rgb(255, 0, 0)')
    })

    it('BG button updates color when selectedBg changes', () => {
      const { rerender } = render(<ColorPanel {...props} />)
      rerender(<ColorPanel {...props} selectedBg={[0, 255, 0]} />)
      expect(screen.getByTestId('bg-color-btn').style.backgroundColor).toBe('rgb(0, 255, 0)')
    })
  })

  describe('color picker modal', () => {
    it('does not show modal by default', () => {
      render(<ColorPanel {...props} />)
      expect(screen.queryByTestId('color-picker-modal')).toBeNull()
    })

    it('opens modal when FG button is clicked', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      expect(screen.getByTestId('color-picker-modal')).toBeTruthy()
    })

    it('opens modal when BG button is clicked', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('bg-color-btn'))
      expect(screen.getByTestId('color-picker-modal')).toBeTruthy()
    })

    it('shows "Foreground Color" title when opened via FG button', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      expect(screen.getByText('Foreground Color')).toBeTruthy()
    })

    it('shows "Background Color" title when opened via BG button', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('bg-color-btn'))
      expect(screen.getByText('Background Color')).toBeTruthy()
    })

    it('closes modal when close button is clicked', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      expect(screen.getByTestId('color-picker-modal')).toBeTruthy()
      fireEvent.click(screen.getByTestId('picker-close-btn'))
      expect(screen.queryByTestId('color-picker-modal')).toBeNull()
    })

    it('closes modal when clicking the backdrop', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      expect(screen.getByTestId('color-picker-modal')).toBeTruthy()
      fireEvent.click(screen.getByTestId('picker-backdrop'))
      expect(screen.queryByTestId('color-picker-modal')).toBeNull()
    })

    it('renders SV gradient and hue bar inside modal', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      expect(screen.getByTestId('modal-sv-gradient')).toBeTruthy()
      expect(screen.getByTestId('modal-hue-bar')).toBeTruthy()
    })

    it('renders hex input pre-filled with current FG color', () => {
      render(<ColorPanel {...props} selectedFg={[255, 0, 0]} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      expect(hexInput.value).toBe('#ff0000')
    })

    it('renders hex input pre-filled with current BG color', () => {
      render(<ColorPanel {...props} selectedBg={[0, 255, 0]} />)
      fireEvent.click(screen.getByTestId('bg-color-btn'))
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      expect(hexInput.value).toBe('#00ff00')
    })

    it('apply button calls onSetFg when opened via FG', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      fireEvent.change(hexInput, { target: { value: '#ff0000' } })
      fireEvent.click(screen.getByTestId('hex-apply-btn'))
      expect(props.onSetFg).toHaveBeenCalledWith([255, 0, 0])
    })

    it('apply button calls onSetBg when opened via BG', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('bg-color-btn'))
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      fireEvent.change(hexInput, { target: { value: '#0000ff' } })
      fireEvent.click(screen.getByTestId('hex-apply-btn'))
      expect(props.onSetBg).toHaveBeenCalledWith([0, 0, 255])
    })

    it('does not apply invalid hex value', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('fg-color-btn'))
      const hexInput = screen.getByTestId('hex-input') as HTMLInputElement
      fireEvent.change(hexInput, { target: { value: 'xyz' } })
      fireEvent.click(screen.getByTestId('hex-apply-btn'))
      expect(props.onSetFg).not.toHaveBeenCalled()
    })
  })

  describe('inline color picker', () => {
    it('renders SV gradient and hue bar always visible', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('sv-gradient')).toBeTruthy()
      expect(screen.getByTestId('hue-bar')).toBeTruthy()
    })
  })
})
