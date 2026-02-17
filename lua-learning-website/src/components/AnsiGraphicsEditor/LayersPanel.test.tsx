import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LayersPanel } from './LayersPanel'
import type { Layer } from './types'
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
    onMoveUp?: (id: string) => void
    onMoveDown?: (id: string) => void
    onAdd?: () => void
    onRemove?: (id: string) => void
  }) {
    const layers = overrides?.layers ?? makeLayers('Background', 'Foreground')
    return render(
      <LayersPanel
        layers={layers}
        activeLayerId={overrides?.activeLayerId ?? layers[0].id}
        onSetActive={overrides?.onSetActive ?? noop}
        onToggleVisibility={overrides?.onToggleVisibility ?? noop}
        onRename={overrides?.onRename ?? noop}
        onMoveUp={overrides?.onMoveUp ?? noop}
        onMoveDown={overrides?.onMoveDown ?? noop}
        onAdd={overrides?.onAdd ?? noop}
        onRemove={overrides?.onRemove ?? noop}
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

  it('up button calls onMoveUp', () => {
    const onMoveUp = vi.fn()
    renderPanel({ onMoveUp })
    const upButtons = screen.getAllByRole('button', { name: /move up/i })
    fireEvent.click(upButtons[0])
    expect(onMoveUp).toHaveBeenCalled()
  })

  it('down button calls onMoveDown', () => {
    const onMoveDown = vi.fn()
    renderPanel({ onMoveDown })
    const downButtons = screen.getAllByRole('button', { name: /move down/i })
    fireEvent.click(downButtons[0])
    expect(onMoveDown).toHaveBeenCalled()
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
})
