/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { CharacterPanel } from './CharacterPanel'
import type { AnsiCell, AnsiGrid, DrawnLayer, Layer } from './types'

function cell(char: string): AnsiCell {
  return { char, fg: [255, 255, 255], bg: [0, 0, 0] }
}

function grid(...rows: string[][]): AnsiGrid {
  return rows.map(r => r.map(cell))
}

function drawn(id: string, frames: AnsiGrid[]): DrawnLayer {
  return {
    id, name: id, visible: true, type: 'drawn',
    grid: frames[0],
    frames,
    currentFrameIndex: 0,
    frameDurationMs: 100,
  }
}

const noop = () => { /* no-op */ }

const baseProps = {
  currentChar: 'A',
  fontId: 'IBM_VGA_8x16',
  layers: [] as Layer[],
  activeLayerId: '',
  recent: [] as readonly string[],
  onSelect: noop,
}

describe('CharacterPanel', () => {
  it('renders curated tabs plus Layer / Current / Recent / All', () => {
    render(<CharacterPanel {...baseProps} />)
    for (const id of ['alpha', 'ascii', 'blocks', 'borders', 'geometric', 'arrows', 'symbols']) {
      expect(screen.getByTestId(`character-panel-tab-${id}`)).toBeTruthy()
    }
    for (const id of ['layer', 'current', 'recent', 'all']) {
      expect(screen.getByTestId(`character-panel-tab-${id}`)).toBeTruthy()
    }
  })

  it('Alpha tab is active by default and shows letters/digits', () => {
    render(<CharacterPanel {...baseProps} />)
    expect(screen.getByTestId('character-panel-tab-alpha').className).toContain('Active')
    const cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells).toContain('A')
    expect(cells).toContain('z')
    expect(cells).toContain('5')
  })

  it('Layer tab shows only chars in the active drawable layer', () => {
    const layers = [
      drawn('a', [grid(['X', 'Y'])]),
      drawn('b', [grid(['Q'])]),
    ]
    render(<CharacterPanel {...baseProps} layers={layers} activeLayerId="a" />)
    fireEvent.click(screen.getByTestId('character-panel-tab-layer'))
    const cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells.sort()).toEqual(['X', 'Y'])
  })

  it('Current tab unions chars across all visible layers', () => {
    const layers = [drawn('a', [grid(['X'])]), drawn('b', [grid(['Y'])])]
    render(<CharacterPanel {...baseProps} layers={layers} activeLayerId="a" />)
    fireEvent.click(screen.getByTestId('character-panel-tab-current'))
    const cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells.sort()).toEqual(['X', 'Y'])
  })

  it('Recent tab shows recents in order, filtered by active font', () => {
    // U+FFFE is a non-character — guaranteed absent from any registered font.
    render(<CharacterPanel {...baseProps} recent={['☺', 'A', '￾']} />)
    fireEvent.click(screen.getByTestId('character-panel-tab-recent'))
    const cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells).toEqual(['☺', 'A'])
  })

  it('All tab surfaces every glyph in the active font atlas', () => {
    render(<CharacterPanel {...baseProps} fontId="IBM_VGA_8x16" />)
    fireEvent.click(screen.getByTestId('character-panel-tab-all'))
    const cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    // All atlas codepoints surface here — sample a few.
    expect(cells).toContain('A')
    expect(cells).toContain('☺')
    expect(cells).toContain('™')
    expect(cells).toContain('▒')
  })

  it('filter narrows by char, by name (case-insensitive), and by hex code', () => {
    render(<CharacterPanel {...baseProps} />)
    const filter = screen.getByTestId('character-panel-filter')

    // Curated name for ☺ is "White Smiley" — switch to All so it's a candidate.
    fireEvent.click(screen.getByTestId('character-panel-tab-all'))
    fireEvent.change(filter, { target: { value: 'smiley' } })
    let cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells).toContain('☺')

    fireEvent.change(filter, { target: { value: 'U+263A' } })
    cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells).toEqual(['☺'])

    fireEvent.change(filter, { target: { value: '263a' } })
    cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells).toEqual(['☺'])

    // Filtering by a literal char.
    fireEvent.change(filter, { target: { value: '☺' } })
    cells = screen.getAllByTestId('character-panel-cell').map(c => c.textContent)
    expect(cells).toEqual(['☺'])
  })

  it('shows an empty hint when no entries match the filter', () => {
    render(<CharacterPanel {...baseProps} />)
    fireEvent.change(screen.getByTestId('character-panel-filter'), {
      target: { value: 'definitely-not-a-char-name' },
    })
    expect(screen.getByTestId('character-panel-empty')).toBeTruthy()
  })

  it('calls onSelect when a cell is clicked', () => {
    const onSelect = vi.fn()
    render(<CharacterPanel {...baseProps} onSelect={onSelect} />)
    const cell = screen.getAllByTestId('character-panel-cell')[0]
    fireEvent.click(cell)
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(typeof onSelect.mock.calls[0][0]).toBe('string')
  })
})
