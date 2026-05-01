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

  it('should render tab buttons for all 6 categories', () => {
    render(<CharPaletteModal {...defaultProps} />)
    for (const cat of CHAR_PALETTE_CATEGORIES) {
      expect(screen.getByTestId(`char-tab-${cat.id}`)).toBeTruthy()
    }
  })

  it('should show ASCII tab as active by default', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const asciiTab = screen.getByTestId('char-tab-ascii')
    expect(asciiTab.className).toContain('Active')
  })

  it('should render correct number of char cells for ASCII tab', () => {
    render(<CharPaletteModal {...defaultProps} />)
    const asciiCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'ascii')!
    const cells = screen.getAllByTestId('char-cell')
    expect(cells).toHaveLength(asciiCategory.chars.length)
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
    const asciiCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'ascii')!
    expect(onSelect).toHaveBeenCalledWith(asciiCategory.chars[0].char)
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

  it('should fall back to ASCII tab when currentChar is not in any category', () => {
    render(<CharPaletteModal {...defaultProps} currentChar="Z" />)
    const asciiTab = screen.getByTestId('char-tab-ascii')
    expect(asciiTab.className).toContain('Active')
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

  it('shows the IBM_VGA_8x16 atlas + canonical-block fallbacks for the blocks tab', () => {
    render(<CharPaletteModal {...defaultProps} fontId="IBM_VGA_8x16" currentChar="█" />)
    const cellChars = screen.getAllByTestId('char-cell').map(c => c.textContent)
    // The full block-element range is covered for IBM_VGA_8x16 (atlas
    // ships some, canonical fallback fills the rest), so every block
    // entry in the palette should still render.
    const blocksCategory = CHAR_PALETTE_CATEGORIES.find(c => c.id === 'blocks')!
    expect(cellChars).toHaveLength(blocksCategory.chars.length)
    // The user-reported codepoint that previously rendered empty.
    expect(cellChars).toContain('▕')
  })

  it('hides characters the active font cannot render', () => {
    // The CGA atlas does not ship vertical-eighth blocks (no fallback at 8x8).
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
})
