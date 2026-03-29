import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportLayersDialog } from './ExportLayersDialog'
import type { ImportEntry } from './layerImport'
import { createLayer, createGroup } from './layerUtils'
import type { GroupLayer, Layer } from './types'

function makeEntries(layers: Layer[]): ImportEntry[] {
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

function defaultProps(overrides: Partial<Parameters<typeof ExportLayersDialog>[0]> = {}) {
  return {
    entries: [] as ImportEntry[],
    allLayers: [] as Layer[],
    tree: [],
    defaultFileName: 'export.ansi.lua',
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
    availableTags: undefined as string[] | undefined,
    ...overrides,
  }
}

describe('ExportLayersDialog', () => {
  it('renders all layer entries with names and type badges', () => {
    const bg = createLayer('Background', 'bg-1')
    const group: GroupLayer = { ...createGroup('Characters', 'g-1'), collapsed: false }
    const layers = [bg, group]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Characters')).toBeInTheDocument()
    expect(screen.getByText('(drawn)')).toBeInTheDocument()
    expect(screen.getByText('(group)')).toBeInTheDocument()
  })

  it('visible layers start selected by default', () => {
    const bg = createLayer('Background', 'bg-1')
    const hidden = { ...createLayer('Hidden', 'hid-1'), visible: false }
    const layers = [bg, hidden]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('export-check-hid-1') as HTMLInputElement).checked).toBe(false)
  })

  it('layers in hidden groups are not initially selected', () => {
    const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false, visible: false }
    const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
    const standalone = createLayer('Standalone', 's-1')
    const layers: Layer[] = [group, child, standalone]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    expect((screen.getByTestId('export-check-c-1') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByTestId('export-check-s-1') as HTMLInputElement).checked).toBe(true)
  })

  it('toggle deselects and reselects a layer', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    const checkbox = screen.getByTestId('export-check-bg-1') as HTMLInputElement
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)

    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(true)
  })

  it('Select All and Deselect All work', () => {
    const bg = createLayer('Background', 'bg-1')
    const fg = createLayer('Foreground', 'fg-1')
    const layers = [bg, fg]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    fireEvent.click(screen.getByText('Deselect All'))
    expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(false)
    expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(false)

    fireEvent.click(screen.getByText('Select All'))
    expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(true)
  })

  it('Select Visible Layers adds visible layers to current selection', () => {
    const bg = createLayer('Background', 'bg-1')
    const hidden = { ...createLayer('Hidden', 'hid-1'), visible: false }
    const fg = createLayer('Foreground', 'fg-1')
    const layers = [bg, hidden, fg]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    // Deselect all first
    fireEvent.click(screen.getByText('Deselect All'))
    expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(false)

    // Select Visible Layers — should add bg and fg but not hidden
    fireEvent.click(screen.getByTestId('export-select-visible'))
    expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('export-check-hid-1') as HTMLInputElement).checked).toBe(false)
  })

  it('filter input filters layer list', () => {
    const bg = createLayer('Background', 'bg-1')
    const fg = createLayer('Foreground', 'fg-1')
    const layers = [bg, fg]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    fireEvent.change(screen.getByTestId('export-filter-input'), { target: { value: 'back' } })
    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.queryByText('Foreground')).not.toBeInTheDocument()
  })

  it('checking child auto-checks parent groups when Export to Root is unchecked', () => {
    const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
    const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
    const layers: Layer[] = [group, child]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    fireEvent.click(screen.getByText('Deselect All'))
    expect((screen.getByTestId('export-check-g-1') as HTMLInputElement).checked).toBe(false)

    fireEvent.click(screen.getByTestId('export-check-c-1'))
    expect((screen.getByTestId('export-check-c-1') as HTMLInputElement).checked).toBe(true)
    expect((screen.getByTestId('export-check-g-1') as HTMLInputElement).checked).toBe(true)
  })

  it('Export to Root checkbox is present with tooltip', () => {
    render(<ExportLayersDialog {...defaultProps()} />)

    const checkbox = screen.getByTestId('export-flatten-checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    const tooltip = screen.getByTestId('export-flatten-tooltip')
    expect(tooltip.getAttribute('title')).toContain('Ignores the group structure')
  })

  it('Export to Root checkbox disables auto-parent-selection in selected set', () => {
    const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
    const child1 = { ...createLayer('Child1', 'c-1'), parentId: 'g-1' }
    const child2 = { ...createLayer('Child2', 'c-2'), parentId: 'g-1' }
    const layers: Layer[] = [group, child1, child2]
    const entries = makeEntries(layers)
    const onConfirm = vi.fn()

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers, onConfirm })} />)

    fireEvent.click(screen.getByTestId('export-flatten-checkbox'))
    fireEvent.click(screen.getByText('Deselect All'))
    fireEvent.click(screen.getByTestId('export-check-c-1'))

    const groupCb = screen.getByTestId('export-check-g-1') as HTMLInputElement
    expect(groupCb.indeterminate).toBe(true)

    fireEvent.click(screen.getByTestId('export-confirm-button'))
    const selectedIds = onConfirm.mock.calls[0][0] as Set<string>
    expect(selectedIds.has('c-1')).toBe(true)
    expect(selectedIds.has('g-1')).toBe(false)
  })

  it('filename input and directory picker render', () => {
    render(<ExportLayersDialog {...defaultProps()} />)

    expect(screen.getByTestId('export-filename')).toBeInTheDocument()
    expect(screen.getByText('Location')).toBeInTheDocument()
  })

  it('confirm calls onConfirm with correct args', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)
    const onConfirm = vi.fn()

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers, onConfirm })} />)

    fireEvent.click(screen.getByTestId('export-confirm-button'))

    expect(onConfirm).toHaveBeenCalledWith(
      new Set(['bg-1']),
      false,
      false,
      '/',
      'export.ansi.lua',
    )
  })

  it('confirm passes flattenToRoot=true when checkbox is checked', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)
    const onConfirm = vi.fn()

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers, onConfirm })} />)

    fireEvent.click(screen.getByTestId('export-flatten-checkbox'))
    fireEvent.click(screen.getByTestId('export-confirm-button'))

    expect(onConfirm).toHaveBeenCalledWith(
      new Set(['bg-1']),
      true,
      false,
      '/',
      'export.ansi.lua',
    )
  })

  it('Cancel calls onCancel', () => {
    const onCancel = vi.fn()
    render(<ExportLayersDialog {...defaultProps({ onCancel })} />)

    fireEvent.click(screen.getByTestId('export-cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Escape key calls onCancel', () => {
    const onCancel = vi.fn()
    render(<ExportLayersDialog {...defaultProps({ onCancel })} />)

    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('Export button is disabled when nothing is selected', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    fireEvent.click(screen.getByText('Deselect All'))

    const exportBtn = screen.getByTestId('export-confirm-button') as HTMLButtonElement
    expect(exportBtn.disabled).toBe(true)
  })

  it('shows error when filename is empty and confirm is clicked', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)
    const onConfirm = vi.fn()

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers, onConfirm, defaultFileName: '' })} />)

    fireEvent.click(screen.getByTestId('export-confirm-button'))
    expect(screen.getByTestId('export-error')).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('adds .ansi.lua extension if missing', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)
    const onConfirm = vi.fn()

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers, onConfirm, defaultFileName: 'myfile' })} />)

    fireEvent.click(screen.getByTestId('export-confirm-button'))
    expect(onConfirm).toHaveBeenCalledWith(
      expect.anything(),
      false,
      false,
      '/',
      'myfile.ansi.lua',
    )
  })
})
