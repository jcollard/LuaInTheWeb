import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorPanel, type ColorPanelProps } from './ColorPanel'
import { CGA_PALETTE, DEFAULT_FG, DEFAULT_BG } from './types'
import type { RGBColor, Layer } from './types'
import { createLayer } from './layerUtils'

describe('ColorPanel', () => {
  let props: ColorPanelProps

  beforeEach(() => {
    const layer = createLayer('Layer 1', 'layer-default')
    props = {
      selectedFg: DEFAULT_FG,
      selectedBg: DEFAULT_BG,
      onSetFg: vi.fn(),
      onSetBg: vi.fn(),
      onSimplifyColors: vi.fn(),
      layers: [layer],
      activeLayerId: layer.id,
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

  describe('Current palette tab', () => {
    it('renders Current and Layer tab buttons', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('palette-btn-current')).toBeTruthy()
      expect(screen.getByTestId('palette-btn-layer')).toBeTruthy()
    })

    it('tab buttons display correct labels', () => {
      render(<ColorPanel {...props} />)
      expect(screen.getByTestId('palette-btn-current').textContent).toBe('Current')
      expect(screen.getByTestId('palette-btn-layer').textContent).toBe('Layer')
    })

    it('shows empty state when no colors are in use', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      expect(screen.getByTestId('empty-palette')).toBeTruthy()
      expect(screen.getByText('No colors in use')).toBeTruthy()
    })

    it('shows colors from all layers in Current tab', () => {
      const l1 = createLayer('L1', 'l1')
      const l2 = createLayer('L2', 'l2')
      const red: RGBColor = [255, 0, 0]
      const blue: RGBColor = [0, 0, 255]
      l1.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
      l2.grid[0][0] = { char: 'B', fg: blue, bg: DEFAULT_BG }
      render(<ColorPanel {...props} layers={[l1, l2]} activeLayerId="l1" />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      const grid = screen.getByTestId('color-grid')
      const swatches = grid.querySelectorAll('button')
      expect(swatches.length).toBeGreaterThanOrEqual(2)
    })

    it('left-click on Current tab swatch calls onSetFg', () => {
      const layer = createLayer('L1', 'l1')
      const red: RGBColor = [255, 0, 0]
      layer.grid[0][0] = { char: 'A', fg: red, bg: DEFAULT_BG }
      render(<ColorPanel {...props} layers={[layer]} activeLayerId="l1" />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      const grid = screen.getByTestId('color-grid')
      const swatch = grid.querySelectorAll('button')[0]
      fireEvent.click(swatch)
      expect(props.onSetFg).toHaveBeenCalled()
    })
  })

  describe('Layer palette tab', () => {
    it('shows empty state for blank layer', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('palette-btn-layer'))
      expect(screen.getByTestId('empty-palette')).toBeTruthy()
    })

    it('shows only colors from the active layer', () => {
      const l1 = createLayer('L1', 'l1')
      const l2 = createLayer('L2', 'l2')
      const red: RGBColor = [255, 0, 0]
      const blue: RGBColor = [0, 0, 255]
      l1.grid[0][0] = { char: 'A', fg: red, bg: red }
      l2.grid[0][0] = { char: 'B', fg: blue, bg: blue }
      // Active layer is l1, which only has red (fg and bg are same)
      render(<ColorPanel {...props} layers={[l1, l2]} activeLayerId="l1" />)
      fireEvent.click(screen.getByTestId('palette-btn-layer'))
      const grid = screen.getByTestId('color-grid')
      const swatches = grid.querySelectorAll('button')
      // Only red should appear (not blue from l2)
      expect(swatches).toHaveLength(1)
      expect(swatches[0].getAttribute('title')).toBe('#ff0000')
    })

    it('right-click on Layer tab swatch calls onSetBg', () => {
      const layer = createLayer('L1', 'l1')
      const green: RGBColor = [0, 255, 0]
      layer.grid[0][0] = { char: 'A', fg: green, bg: DEFAULT_BG }
      render(<ColorPanel {...props} layers={[layer]} activeLayerId="l1" />)
      fireEvent.click(screen.getByTestId('palette-btn-layer'))
      const grid = screen.getByTestId('color-grid')
      const swatch = grid.querySelectorAll('button')[0]
      fireEvent.contextMenu(swatch)
      expect(props.onSetBg).toHaveBeenCalled()
    })
  })

  describe('Simplify Palette', () => {
    function layersWithColors(colors: RGBColor[]): { layers: Layer[]; activeLayerId: string } {
      const layer = createLayer('L1', 'l1')
      colors.forEach((c, i) => {
        layer.grid[0][i] = { char: 'A', fg: c, bg: DEFAULT_BG }
      })
      return { layers: [layer], activeLayerId: 'l1' }
    }

    it('does not show simplify button on CGA tab', () => {
      render(<ColorPanel {...props} />)
      expect(screen.queryByTestId('simplify-btn')).toBeNull()
    })

    it('does not show simplify button on EGA tab', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('palette-btn-ega'))
      expect(screen.queryByTestId('simplify-btn')).toBeNull()
    })

    it('does not show simplify button on VGA tab', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('palette-btn-vga'))
      expect(screen.queryByTestId('simplify-btn')).toBeNull()
    })

    it('does not show simplify button when dynamic palette is empty', () => {
      render(<ColorPanel {...props} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      expect(screen.queryByTestId('simplify-btn')).toBeNull()
    })

    it('does not show simplify button when palette has only 1 color', () => {
      const layer = createLayer('L1', 'l1')
      const red: RGBColor = [255, 0, 0]
      // Use same color for fg and bg so only 1 unique color is extracted
      layer.grid[0][0] = { char: 'A', fg: red, bg: red }
      render(<ColorPanel {...props} layers={[layer]} activeLayerId="l1" />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      expect(screen.queryByTestId('simplify-btn')).toBeNull()
    })

    it('shows simplify button when current tab has 2+ colors', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [0, 255, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      expect(screen.getByTestId('simplify-btn')).toBeTruthy()
    })

    it('shows simplify button on layer tab with 2+ colors', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [0, 255, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-layer'))
      expect(screen.getByTestId('simplify-btn')).toBeTruthy()
    })

    it('clicking simplify button opens the simplify modal', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [0, 255, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      fireEvent.click(screen.getByTestId('simplify-btn'))
      expect(screen.getByTestId('simplify-modal')).toBeTruthy()
    })

    it('modal shows current color count', () => {
      const layer = createLayer('L1', 'l1')
      const red: RGBColor = [255, 0, 0]
      const green: RGBColor = [0, 255, 0]
      const blue: RGBColor = [0, 0, 255]
      // Use same fg/bg per cell to control exact palette size
      layer.grid[0][0] = { char: 'A', fg: red, bg: red }
      layer.grid[0][1] = { char: 'B', fg: green, bg: green }
      layer.grid[0][2] = { char: 'C', fg: blue, bg: blue }
      render(<ColorPanel {...props} layers={[layer]} activeLayerId="l1" />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      fireEvent.click(screen.getByTestId('simplify-btn'))
      expect(screen.getByText('Current: 3 colors')).toBeTruthy()
    })

    it('modal shows target slider', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [0, 255, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      fireEvent.click(screen.getByTestId('simplify-btn'))
      expect(screen.getByTestId('simplify-slider')).toBeTruthy()
    })

    it('modal shows preview swatches', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [0, 255, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      fireEvent.click(screen.getByTestId('simplify-btn'))
      expect(screen.getByTestId('simplify-preview')).toBeTruthy()
    })

    it('apply button calls onSimplifyColors with mapping', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [254, 0, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      fireEvent.click(screen.getByTestId('simplify-btn'))
      fireEvent.click(screen.getByTestId('simplify-apply-btn'))
      expect(props.onSimplifyColors).toHaveBeenCalled()
      const [mapping, scope] = (props.onSimplifyColors as ReturnType<typeof vi.fn>).mock.calls[0]
      expect(mapping).toBeInstanceOf(Map)
      expect(scope).toBe('current')
    })

    it('modal closes after apply', () => {
      const { layers, activeLayerId } = layersWithColors([[255, 0, 0], [254, 0, 0]])
      render(<ColorPanel {...props} layers={layers} activeLayerId={activeLayerId} />)
      fireEvent.click(screen.getByTestId('palette-btn-current'))
      fireEvent.click(screen.getByTestId('simplify-btn'))
      fireEvent.click(screen.getByTestId('simplify-apply-btn'))
      expect(screen.queryByTestId('simplify-modal')).toBeNull()
    })
  })
})
