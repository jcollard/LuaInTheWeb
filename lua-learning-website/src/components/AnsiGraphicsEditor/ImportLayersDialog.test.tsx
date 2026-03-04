import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ImportLayersDialog } from './ImportLayersDialog'
import type { ImportEntry } from './layerImport'
import { createLayer, createGroup } from './layerUtils'
import type { GroupLayer, Layer } from './types'

function makeEntries(layers: Layer[]): ImportEntry[] {
  // Simplified: compute depth based on parentId chain
  const depthMap = new Map<string, number>()
  for (const layer of layers) {
    const parentId = layer.parentId
    if (parentId !== undefined && depthMap.has(parentId)) {
      depthMap.set(layer.id, depthMap.get(parentId)! + 1)
    } else {
      depthMap.set(layer.id, 0)
    }
  }
  return layers.map(layer => ({ layer, depth: depthMap.get(layer.id) ?? 0 }))
}

const defaultProps = {
  entries: [] as ImportEntry[],
  groups: [] as GroupLayer[],
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
  warnings: [] as string[],
}

describe('ImportLayersDialog', () => {
  it('does not render when entries is empty and no dialog is shown', () => {
    const { container } = render(<ImportLayersDialog {...defaultProps} entries={[]} />)
    // Dialog should still render (it's the parent that controls visibility)
    expect(container.querySelector('[role="dialog"]')).toBeInTheDocument()
  })

  it('renders layer entries with correct names', () => {
    const bg = createLayer('Background', 'bg-1')
    const fg = createLayer('Foreground', 'fg-1')
    const entries = makeEntries([bg, fg])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Foreground')).toBeInTheDocument()
  })

  it('renders type badges', () => {
    const bg = createLayer('Background', 'bg-1')
    const group: GroupLayer = { ...createGroup('Characters', 'g-1'), collapsed: false }
    const entries = makeEntries([bg, group])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    expect(screen.getByText('(drawn)')).toBeInTheDocument()
    expect(screen.getByText('(group)')).toBeInTheDocument()
  })

  it('applies indentation for nested layers', () => {
    const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
    const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
    const entries = makeEntries([group, child])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    const childItem = screen.getByTestId('import-layer-c-1')
    expect(childItem.style.paddingLeft).toBe('32px') // 8px base + 24px * 1
  })

  it('checkboxes are all checked by default', () => {
    const bg = createLayer('Background', 'bg-1')
    const entries = makeEntries([bg])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    const checkbox = screen.getByTestId('import-check-bg-1') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('toggling checkbox deselects a layer', () => {
    const bg = createLayer('Background', 'bg-1')
    const entries = makeEntries([bg])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    const checkbox = screen.getByTestId('import-check-bg-1')
    fireEvent.click(checkbox)
    expect((checkbox as HTMLInputElement).checked).toBe(false)
  })

  it('Deselect All unchecks all layers', () => {
    const bg = createLayer('Background', 'bg-1')
    const fg = createLayer('Foreground', 'fg-1')
    const entries = makeEntries([bg, fg])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    fireEvent.click(screen.getByText('Deselect All'))

    const cb1 = screen.getByTestId('import-check-bg-1') as HTMLInputElement
    const cb2 = screen.getByTestId('import-check-fg-1') as HTMLInputElement
    expect(cb1.checked).toBe(false)
    expect(cb2.checked).toBe(false)
  })

  it('Select All re-checks all layers', () => {
    const bg = createLayer('Background', 'bg-1')
    const entries = makeEntries([bg])

    render(<ImportLayersDialog {...defaultProps} entries={entries} />)

    // Deselect first
    fireEvent.click(screen.getByText('Deselect All'))
    // Then select all
    fireEvent.click(screen.getByText('Select All'))

    const checkbox = screen.getByTestId('import-check-bg-1') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('parent dropdown lists groups plus Root option', () => {
    const group: GroupLayer = { ...createGroup('Characters', 'g-1'), collapsed: false }
    const entries = makeEntries([group])

    render(
      <ImportLayersDialog
        {...defaultProps}
        entries={entries}
        groups={[group]}
      />,
    )

    const select = screen.getByTestId('import-parent-select') as HTMLSelectElement
    expect(select.options).toHaveLength(2)
    expect(select.options[0].text).toBe('Root')
    expect(select.options[1].text).toBe('Characters')
  })

  it('Cancel button calls onCancel', () => {
    const onCancel = vi.fn()
    render(<ImportLayersDialog {...defaultProps} onCancel={onCancel} />)

    fireEvent.click(screen.getByText('Cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Import button calls onConfirm with selected IDs and target parent', () => {
    const bg = createLayer('Background', 'bg-1')
    const fg = createLayer('Foreground', 'fg-1')
    const entries = makeEntries([bg, fg])
    const onConfirm = vi.fn()

    render(<ImportLayersDialog {...defaultProps} entries={entries} onConfirm={onConfirm} />)

    // Deselect fg
    fireEvent.click(screen.getByTestId('import-check-fg-1'))
    fireEvent.click(screen.getByText('Import'))

    expect(onConfirm).toHaveBeenCalledWith(
      new Set(['bg-1']),
      undefined,
    )
  })

  it('Import button passes selected parent group id', () => {
    const group: GroupLayer = { ...createGroup('Characters', 'g-1'), collapsed: false }
    const bg = createLayer('Background', 'bg-1')
    const entries = makeEntries([bg])
    const onConfirm = vi.fn()

    render(
      <ImportLayersDialog
        {...defaultProps}
        entries={entries}
        groups={[group]}
        onConfirm={onConfirm}
      />,
    )

    const select = screen.getByTestId('import-parent-select')
    fireEvent.change(select, { target: { value: 'g-1' } })
    fireEvent.click(screen.getByText('Import'))

    expect(onConfirm).toHaveBeenCalledWith(
      new Set(['bg-1']),
      'g-1',
    )
  })

  it('displays warnings', () => {
    render(
      <ImportLayersDialog
        {...defaultProps}
        warnings={['Ref "Shadow" source missing']}
      />,
    )

    expect(screen.getByText('Ref "Shadow" source missing')).toBeInTheDocument()
  })

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn()
    render(<ImportLayersDialog {...defaultProps} onCancel={onCancel} />)

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })
})
