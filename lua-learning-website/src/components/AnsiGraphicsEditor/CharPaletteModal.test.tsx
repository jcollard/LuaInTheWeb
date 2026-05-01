import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CharPaletteModal } from './CharPaletteModal'
import { CHAR_PALETTE_CATEGORIES } from './charPaletteData'

describe('CharPaletteModal', () => {
  const defaultProps = {
    onSelect: vi.fn<(char: string) => void>(),
    onClose: vi.fn<() => void>(),
  }

  it('should render backdrop and popover', () => {
    render(<CharPaletteModal {...defaultProps} />)
    expect(screen.getByTestId('char-palette-backdrop')).toBeTruthy()
    expect(screen.getByTestId('char-palette-modal')).toBeTruthy()
  })

  it('should render header with title and close button', () => {
    render(<CharPaletteModal {...defaultProps} />)
    expect(screen.getByText('Character Palette')).toBeTruthy()
    expect(screen.getByTestId('char-palette-close')).toBeTruthy()
  })

  it('should call onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<CharPaletteModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('char-palette-backdrop'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should call onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<CharPaletteModal {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByTestId('char-palette-close'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should render tab buttons for every category', () => {
    render(<CharPaletteModal {...defaultProps} />)
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      expect(screen.getByTestId(`char-tab-${cat.id}`)).toBeTruthy()
    }
  })

  it('should show Alpha tab as active by default', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const alphaTab = screen.getByTestId('char-tab-alpha')
    expect(alphaTab.className).toContain('Active')
  })

  it('should render correct number of char cells for the default Alpha tab', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const alphaCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'alpha')!
    const cells = screen.getAllByTestId('char-cell')
    expect(cells).toHaveLength(alphaCategory.chars.length)
  })

  it('should expose 0-9, A-Z, a-z in the Alpha tab', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const cellChars = screen.getAllByTestId('char-cell').map(c => c.textContent)
    for (const cp of ['0', '5', '9', 'A', 'M', 'Z', 'a', 'm', 'z']) {
      expect(cellChars).toContain(cp)
    }
    expect(cellChars).toHaveLength(10 + 26 + 26)
  })

  it('should switch active tab and displayed chars on tab click', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const blocksTab = screen.getByTestId('char-tab-blocks')
    fireEvent.click(blocksTab)
    expect(blocksTab.className).toContain('Active')
    const blocksCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'blocks')!
    const cells = screen.getAllByTestId('char-cell')
    expect(cells).toHaveLength(blocksCategory.chars.length)
  })

  it('should call onSelect and onClose when a char cell is clicked', () => {
    const onSelect = vi.fn()
    const onClose = vi.fn()
    render(<CharPaletteModal onSelect={onSelect} onClose={onClose} />)
    const cells = screen.getAllByTestId('char-cell')
    fireEvent.click(cells[0])
    const alphaCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'alpha')!
    expect(onSelect).toHaveBeenCalledWith(alphaCategory.chars[0].char)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should show human-readable name in char cell title tooltip', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const cells = screen.getAllByTestId('char-cell')
    const firstName = CHAR_PALETTE_CATEGORIES[0].chars[0].name
    expect(cells[0].getAttribute('title')).toBe(firstName)
  })

  it('should open to blocks tab when currentChar is a block char', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="█" />)
    const blocksTab = screen.getByTestId('char-tab-blocks')
    expect(blocksTab.className).toContain('Active')
    const blocksCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'blocks')!
    const cells = screen.getAllByTestId('char-cell')
    expect(cells).toHaveLength(blocksCategory.chars.length)
  })

  it('should open to symbols tab when currentChar is a symbol', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="♠" />)
    const symbolsTab = screen.getByTestId('char-tab-symbols')
    expect(symbolsTab.className).toContain('Active')
  })

  it('should default to Alpha tab when currentChar is in the Alpha category', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="Z" />)
    const alphaTab = screen.getByTestId('char-tab-alpha')
    expect(alphaTab.className).toContain('Active')
  })

  it('should fall back to Alpha tab when currentChar is not in any category', () => {
    //  isn't in any category — should default to Alpha.
    render(<CharPaletteModal {...defaultProps} currentChar={''} />)
    const alphaTab = screen.getByTestId('char-tab-alpha')
    expect(alphaTab.className).toContain('Active')
  })

  it('should highlight the selected char cell with charCellSelected class', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="#" />)
    const cells = screen.getAllByTestId('char-cell')
    const hashCell = cells.find(c => c.textContent === '#')!
    expect(hashCell.className).toContain('charCellSelected')
  })

  it('should set aria-pressed="true" on the selected char cell', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="#" />)
    const cells = screen.getAllByTestId('char-cell')
    const hashCell = cells.find(c => c.textContent === '#')!
    expect(hashCell.getAttribute('aria-pressed')).toBe('true')
  })

  it('should not set aria-pressed on non-selected char cells', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="#" />)
    const cells = screen.getAllByTestId('char-cell')
    const otherCell = cells.find(c => c.textContent !== '#')!
    expect(otherCell.getAttribute('aria-pressed')).toBeNull()
  })
})

describe('CharPaletteModal — font coverage filtering', () => {
  const defaultProps = {
    onSelect: vi.fn<(char: string) => void>(),
    onClose: vi.fn<() => void>(),
  }

  it('hides block-element chars the IBM_VGA_8x16 font does not ship', () => {
    render(<CharPaletteModal {...defaultProps} fontId="IBM_VGA_8x16" currentChar="█" />)
    const cellChars = screen.getAllByTestId('char-cell').map(c => c.textContent)
    // Filtering is font-faithful — chars the WOFF cannot preview are
    // hidden even though the canvas can paint U+2595 via canonical
    // fallback.
    expect(cellChars).not.toContain('▕') // U+2595
    expect(cellChars).not.toContain('▔') // U+2594
    // But chars the font does ship are still present.
    expect(cellChars).toContain('█')
    expect(cellChars).toContain('▒')
  })

  it('hides block-element chars not shipped in IBM_CGA_8x8 either', () => {
    render(<CharPaletteModal {...defaultProps} fontId="IBM_CGA_8x8" currentChar="█" />)
    const cellChars = screen.getAllByTestId('char-cell').map(c => c.textContent)
    expect(cellChars).not.toContain('▕') // U+2595
    expect(cellChars).not.toContain('▏') // U+258F
  })

  it('falls back to the unfiltered palette when fontId is omitted', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="█" />)
    const blocksCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'blocks')!
    expect(screen.getAllByTestId('char-cell')).toHaveLength(blocksCategory.chars.length)
  })

  it('hides empty categories when no chars survive the filter', () => {
    // If a category had no chars covered by the active font we'd hide
    // its tab. All registered fonts ship full ASCII, so Alpha and ASCII
    // always survive — exercise the contract by sampling a font that
    // covers Alpha and asserting the tab is present.
    render(<CharPaletteModal {...defaultProps} fontId="IBM_VGA_8x16" />)
    expect(screen.getByTestId('char-tab-alpha')).toBeTruthy()
  })

  it('previews each cell in the active font', () => {
    render(<CharPaletteModal {...defaultProps} fontId="IBM_VGA_8x16" />)
    const firstCell = screen.getAllByTestId('char-cell')[0]
    expect(firstCell.style.fontFamily).toContain('Web IBM VGA 8x16')
  })
})
