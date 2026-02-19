import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LayersPanel } from './LayersPanel'
import type { Layer, TextLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL } from './types'
import { createLayer } from './layerUtils'

function makeLayers(...names: string[]): Layer[] {
  return names.map((name, i) => createLayer(name, `layer-${i}`))
}

describe('LayersPanel', () => {
  const noop = () => {}

  function renderPanel(overrides?: {
    layers?: Layer[]
    activeLayerId?: string
    onSetActive?: (id: string) => void
    onToggleVisibility?: (id: string) => void
    onRename?: (id: string, name: string) => void
    onReorder?: (id: string, newIndex: number) => void
    onAdd?: () => void
    onRemove?: (id: string) => void
    onMergeDown?: (id: string) => void
  }) {
    const layers = overrides?.layers ?? makeLayers('Background', 'Foreground')
    return render(
      <LayersPanel
        layers={layers}
        activeLayerId={overrides?.activeLayerId ?? layers[0].id}
        onSetActive={overrides?.onSetActive ?? noop}
        onToggleVisibility={overrides?.onToggleVisibility ?? noop}
        onRename={overrides?.onRename ?? noop}
        onReorder={overrides?.onReorder ?? noop}
        onAdd={overrides?.onAdd ?? noop}
        onRemove={overrides?.onRemove ?? noop}
        onMergeDown={overrides?.onMergeDown ?? noop}
      />
    )
  }

  it('renders layer names', () => {
    renderPanel()
    expect(screen.getByText('Background')).toBeTruthy()
    expect(screen.getByText('Foreground')).toBeTruthy()
  })

  it('renders layers in reverse order (topmost first in UI)', () => {
    const { container } = renderPanel()
    const items = container.querySelectorAll('[data-testid^="layer-row-"]')
    // Topmost layer (Foreground, index 1) should appear first in the list
    expect(items[0].getAttribute('data-testid')).toBe('layer-row-layer-1')
    expect(items[1].getAttribute('data-testid')).toBe('layer-row-layer-0')
  })

  it('clicking a layer row calls onSetActive', () => {
    const onSetActive = vi.fn()
    renderPanel({ onSetActive })
    fireEvent.click(screen.getByText('Foreground'))
    expect(onSetActive).toHaveBeenCalledWith('layer-1')
  })

  it('visibility toggle calls onToggleVisibility', () => {
    const onToggleVisibility = vi.fn()
    renderPanel({ onToggleVisibility })
    const toggles = screen.getAllByRole('button', { name: /visibility/i })
    fireEvent.click(toggles[0])
    expect(onToggleVisibility).toHaveBeenCalled()
  })

  it('add button calls onAdd', () => {
    const onAdd = vi.fn()
    renderPanel({ onAdd })
    fireEvent.click(screen.getByRole('button', { name: /add layer/i }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('delete button calls onRemove', () => {
    const onRemove = vi.fn()
    renderPanel({ onRemove })
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    fireEvent.click(deleteButtons[0])
    expect(onRemove).toHaveBeenCalled()
  })

  it('delete button is disabled when only 1 layer', () => {
    const layers = makeLayers('Background')
    renderPanel({ layers })
    const deleteButton = screen.getByRole('button', { name: /delete/i })
    expect(deleteButton).toBeDisabled()
  })

  it('rename via double-click shows input and commits on enter', () => {
    const onRename = vi.fn()
    renderPanel({ onRename })
    fireEvent.doubleClick(screen.getByText('Background'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onRename).toHaveBeenCalledWith('layer-0', 'Renamed')
  })

  it('rename cancels on Escape', () => {
    const onRename = vi.fn()
    renderPanel({ onRename })
    fireEvent.doubleClick(screen.getByText('Background'))
    const input = screen.getByRole('textbox')
    fireEvent.change(input, { target: { value: 'Renamed' } })
    fireEvent.keyDown(input, { key: 'Escape' })
    expect(onRename).not.toHaveBeenCalled()
    // Original name should still be displayed
    expect(screen.getByText('Background')).toBeTruthy()
  })

  it('highlights the active layer', () => {
    const { container } = renderPanel({ activeLayerId: 'layer-0' })
    const activeRow = container.querySelector('[data-testid="layer-row-layer-0"]')
    expect(activeRow?.className).toContain('Active')
  })

  it('non-active layer does not have active class', () => {
    const { container } = renderPanel({ activeLayerId: 'layer-0' })
    const inactiveRow = container.querySelector('[data-testid="layer-row-layer-1"]')
    expect(inactiveRow?.className).not.toContain('Active')
  })

  it('shows eye icon for visible layers', () => {
    renderPanel()
    const toggles = screen.getAllByRole('button', { name: /visibility/i })
    expect(toggles[0].textContent).toContain('\u{1F441}')
  })

  it('shows different icon for hidden layers', () => {
    const layers = makeLayers('Background', 'Foreground')
    layers[1].visible = false
    renderPanel({ layers })
    const toggles = screen.getAllByRole('button', { name: /visibility/i })
    // Hidden layer (Foreground) appears first due to reverse order
    expect(toggles[0].textContent).toContain('\u{200D}')
  })

  it('delete button is enabled when multiple layers exist', () => {
    renderPanel()
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    expect(deleteButtons[0]).not.toBeDisabled()
  })

  it('add button renders the + text', () => {
    renderPanel()
    const addButton = screen.getByRole('button', { name: /add layer/i })
    expect(addButton.textContent).toBe('+')
  })

  it('onSetActive passes the correct layer id', () => {
    const onSetActive = vi.fn()
    renderPanel({ onSetActive })
    fireEvent.click(screen.getByText('Background'))
    expect(onSetActive).toHaveBeenCalledWith('layer-0')
  })

  it('shows T badge on text layer rows', () => {
    const drawnLayer = createLayer('Background', 'layer-0')
    const emptyGrid = Array.from({ length: ANSI_ROWS }, () =>
      Array.from({ length: ANSI_COLS }, () => ({ ...DEFAULT_CELL }))
    )
    const textLayer: TextLayer = {
      type: 'text',
      id: 'text-1',
      name: 'My Text',
      visible: true,
      text: 'Hello',
      bounds: { r0: 0, c0: 0, r1: 2, c1: 10 },
      textFg: [255, 255, 255],
      grid: emptyGrid,
    }
    renderPanel({ layers: [drawnLayer, textLayer] })
    const textRow = screen.getByTestId('layer-row-text-1')
    const textBadge = textRow.querySelector('[data-testid="text-layer-badge"]')
    expect(textBadge).not.toBeNull()
    expect(textBadge!.textContent).toBe('T')
    // Drawn layer should not have T badge
    const drawnRow = screen.getByTestId('layer-row-layer-0')
    const drawnBadge = drawnRow.querySelector('[data-testid="text-layer-badge"]')
    expect(drawnBadge).toBeNull()
  })

  describe('drag-and-drop reordering', () => {
    beforeEach(() => { vi.useFakeTimers() })
    afterEach(() => { vi.useRealTimers() })

    /** Fire dragStart and flush the deferred requestAnimationFrame. */
    function startDrag(grip: HTMLElement): void {
      fireEvent.dragStart(grip, { dataTransfer: { setData: vi.fn(), effectAllowed: '' } })
      act(() => { vi.runAllTimers() })
    }

    it('renders a drag grip for each layer when multiple layers exist', () => {
      renderPanel()
      expect(screen.getByTestId('layer-grip-layer-0')).toBeTruthy()
      expect(screen.getByTestId('layer-grip-layer-1')).toBeTruthy()
    })

    it('drag grip has draggable attribute', () => {
      renderPanel()
      const grip = screen.getByTestId('layer-grip-layer-0')
      expect(grip.getAttribute('draggable')).toBe('true')
    })

    it('does not render drag grip when only one layer exists', () => {
      const layers = makeLayers('Background')
      renderPanel({ layers })
      expect(screen.queryByTestId('layer-grip-layer-0')).toBeNull()
    })

    it('dragging a layer onto another calls onReorder with target array index', () => {
      const onReorder = vi.fn()
      const layers = makeLayers('Background', 'Middle', 'Top')
      renderPanel({ layers, onReorder })
      const gripTop = screen.getByTestId('layer-grip-layer-2')
      const rowBottom = screen.getByTestId('layer-row-layer-0')
      startDrag(gripTop)
      fireEvent.dragOver(rowBottom, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(rowBottom, { dataTransfer: { getData: () => 'layer-2' }, preventDefault: vi.fn() })
      expect(onReorder).toHaveBeenCalledWith('layer-2', 0)
    })

    it('hides the dragged row during drag', () => {
      renderPanel()
      const grip = screen.getByTestId('layer-grip-layer-1')
      startDrag(grip)
      const row = screen.getByTestId('layer-row-layer-1')
      expect(row.className).toContain('Dragging')
    })

    it('shows placeholder when dragging over a row (moving up)', () => {
      const layers = makeLayers('Bot', 'Mid', 'Top')
      renderPanel({ layers })
      const gripBot = screen.getByTestId('layer-grip-layer-0')
      const rowTop = screen.getByTestId('layer-row-layer-2')
      startDrag(gripBot)
      fireEvent.dragOver(rowTop, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      const placeholder = screen.getByTestId('layer-drop-placeholder')
      expect(placeholder).toBeTruthy()
      expect(placeholder.nextElementSibling).toBe(rowTop)
    })

    it('shows placeholder when dragging over a row (moving down)', () => {
      const layers = makeLayers('Bot', 'Mid', 'Top')
      renderPanel({ layers })
      const gripTop = screen.getByTestId('layer-grip-layer-2')
      const rowBot = screen.getByTestId('layer-row-layer-0')
      startDrag(gripTop)
      fireEvent.dragOver(rowBot, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      const placeholder = screen.getByTestId('layer-drop-placeholder')
      expect(placeholder).toBeTruthy()
      expect(rowBot.nextElementSibling).toBe(placeholder)
    })

    it('dropping on placeholder calls onReorder', () => {
      const onReorder = vi.fn()
      const layers = makeLayers('Bot', 'Mid', 'Top')
      renderPanel({ layers, onReorder })
      const gripBot = screen.getByTestId('layer-grip-layer-0')
      const rowTop = screen.getByTestId('layer-row-layer-2')
      startDrag(gripBot)
      fireEvent.dragOver(rowTop, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      const placeholder = screen.getByTestId('layer-drop-placeholder')
      fireEvent.drop(placeholder, { dataTransfer: { getData: () => 'layer-0' }, preventDefault: vi.fn() })
      expect(onReorder).toHaveBeenCalledWith('layer-0', 2)
    })

    it('clears drag state on dragEnd', () => {
      renderPanel()
      const grip = screen.getByTestId('layer-grip-layer-1')
      startDrag(grip)
      expect(screen.getByTestId('layer-row-layer-1').className).toContain('Dragging')
      fireEvent.dragEnd(grip)
      expect(screen.getByTestId('layer-row-layer-1').className).not.toContain('Dragging')
      expect(screen.queryByTestId('layer-drop-placeholder')).toBeNull()
    })
  })

  describe('context menu', () => {
    it('opens context menu on right-click of a layer row', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('layer-context-menu')).toBeTruthy()
    })

    it('shows "Merge Down" option in context menu', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-merge-down')).toBeTruthy()
      expect(screen.getByTestId('context-merge-down').textContent).toBe('Merge Down')
    })

    it('clicking "Merge Down" calls onMergeDown with the layer id', () => {
      const onMergeDown = vi.fn()
      renderPanel({ onMergeDown })
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      fireEvent.click(screen.getByTestId('context-merge-down'))
      expect(onMergeDown).toHaveBeenCalledWith('layer-1')
    })

    it('closes context menu after clicking "Merge Down"', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      fireEvent.click(screen.getByTestId('context-merge-down'))
      expect(screen.queryByTestId('layer-context-menu')).toBeNull()
    })

    it('disables "Merge Down" for the bottom layer', () => {
      renderPanel()
      // layer-0 is the bottom layer. In reversed display, it's last.
      const row = screen.getByTestId('layer-row-layer-0')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-merge-down')).toBeDisabled()
    })

    it('"Merge Down" is enabled for non-bottom layer', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-merge-down')).not.toBeDisabled()
    })

    it('closes context menu on Escape key', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('layer-context-menu')).toBeTruthy()
      fireEvent.keyDown(document, { key: 'Escape' })
      expect(screen.queryByTestId('layer-context-menu')).toBeNull()
    })

    it('closes context menu on backdrop click', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('layer-context-menu')).toBeTruthy()
      fireEvent.click(screen.getByTestId('layer-context-backdrop'))
      expect(screen.queryByTestId('layer-context-menu')).toBeNull()
    })

    it('does not show context menu initially', () => {
      renderPanel()
      expect(screen.queryByTestId('layer-context-menu')).toBeNull()
    })
  })
})
