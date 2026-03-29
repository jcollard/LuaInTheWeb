import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExportLayersDialog } from './ExportLayersDialog'
import { deduplicateFileName } from './layerExport'
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

describe('ExportLayersDialog — tags, groups, dedup', () => {
  describe('Select by tag', () => {
    it('tag dropdown renders when availableTags are provided', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const layers: Layer[] = [bg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky', 'ground'],
      })} />)

      expect(screen.getByTestId('export-tag-select')).toBeInTheDocument()
    })

    it('selecting a tag shows a pill and selects matching layers', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const fg = { ...createLayer('Foreground', 'fg-1'), tags: ['ground'] }
      const layers: Layer[] = [bg, fg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky', 'ground'],
      })} />)


      fireEvent.click(screen.getByText('Deselect All'))
      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'sky' } })

      expect(screen.getByTestId('export-pill-sky')).toBeInTheDocument()
      expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(false)
    })

    it('selecting multiple tags unions their layers', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const fg = { ...createLayer('Foreground', 'fg-1'), tags: ['ground'] }
      const layers: Layer[] = [bg, fg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky', 'ground'],
      })} />)


      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'sky' } })
      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'ground' } })

      expect(screen.getByTestId('export-pill-sky')).toBeInTheDocument()
      expect(screen.getByTestId('export-pill-ground')).toBeInTheDocument()
      expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(true)
    })

    it('clicking a pill removes the tag and deselects its layers', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const fg = { ...createLayer('Foreground', 'fg-1'), tags: ['ground'] }
      const layers: Layer[] = [bg, fg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky', 'ground'],
      })} />)


      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'sky' } })
      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'ground' } })

      fireEvent.click(screen.getByTestId('export-pill-sky'))

      expect(screen.queryByTestId('export-pill-sky')).not.toBeInTheDocument()
      expect(screen.getByTestId('export-pill-ground')).toBeInTheDocument()
      expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(false)
      expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(true)
    })

    it('adding a tag preserves existing manual selection', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const fg = { ...createLayer('Foreground', 'fg-1'), tags: ['ground'] }
      const extra = createLayer('Extra', 'ex-1')
      const layers: Layer[] = [bg, fg, extra]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky', 'ground'],
      })} />)

      // Switch to manual mode (all selected), deselect all, manually select extra

      fireEvent.click(screen.getByText('Deselect All'))
      fireEvent.click(screen.getByTestId('export-check-ex-1'))

      // Now add sky tag — extra should still be selected
      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'sky' } })

      expect((screen.getByTestId('export-check-ex-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-fg-1') as HTMLInputElement).checked).toBe(false)
    })

    it('removing a tag preserves manually selected layers', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const extra = createLayer('Extra', 'ex-1')
      const layers: Layer[] = [bg, extra]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky'],
      })} />)

      // Switch to manual, select extra manually, add sky tag

      fireEvent.click(screen.getByText('Deselect All'))
      fireEvent.click(screen.getByTestId('export-check-ex-1'))
      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'sky' } })

      // Both selected
      expect((screen.getByTestId('export-check-ex-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(true)

      // Remove sky — extra should remain, bg should not
      fireEvent.click(screen.getByTestId('export-pill-sky'))
      expect((screen.getByTestId('export-check-ex-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-bg-1') as HTMLInputElement).checked).toBe(false)
    })

    it('active tags are removed from the dropdown options', () => {
      const bg = { ...createLayer('Background', 'bg-1'), tags: ['sky'] }
      const layers: Layer[] = [bg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, availableTags: ['sky', 'ground'],
      })} />)


      fireEvent.change(screen.getByTestId('export-tag-select'), { target: { value: 'sky' } })

      expect(screen.queryByTestId('export-tag-sky')).not.toBeInTheDocument()
      expect(screen.getByTestId('export-tag-ground')).toBeInTheDocument()
    })

    it('no tag dropdown renders when availableTags is undefined', () => {
      const bg = createLayer('Background', 'bg-1')
      const layers = [bg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      expect(screen.queryByTestId('export-tags-row')).not.toBeInTheDocument()
    })

  })

  describe('collapsible groups', () => {
    it('group shows collapse toggle', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
      const layers: Layer[] = [group, child]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      expect(screen.getByTestId('export-collapse-g-1')).toBeInTheDocument()
    })

    it('clicking collapse toggle hides children', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
      const layers: Layer[] = [group, child]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      expect(screen.getByTestId('export-layer-c-1')).toBeInTheDocument()
      fireEvent.click(screen.getByTestId('export-collapse-g-1'))
      expect(screen.queryByTestId('export-layer-c-1')).not.toBeInTheDocument()
    })

    it('clicking collapse toggle again shows children', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
      const layers: Layer[] = [group, child]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      fireEvent.click(screen.getByTestId('export-collapse-g-1'))
      fireEvent.click(screen.getByTestId('export-collapse-g-1'))
      expect(screen.getByTestId('export-layer-c-1')).toBeInTheDocument()
    })

    it('non-group layers do not have collapse toggle', () => {
      const bg = createLayer('Background', 'bg-1')
      const layers = [bg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      expect(screen.queryByTestId('export-collapse-bg-1')).not.toBeInTheDocument()
    })
  })

  describe('group tri-state checkbox', () => {
    it('group checkbox is indeterminate when some children selected', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child1 = { ...createLayer('Child1', 'c-1'), parentId: 'g-1' }
      const child2 = { ...createLayer('Child2', 'c-2'), parentId: 'g-1', visible: false }
      const layers: Layer[] = [group, child1, child2]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      const groupCheckbox = screen.getByTestId('export-check-g-1') as HTMLInputElement
      expect(groupCheckbox.indeterminate).toBe(true)
    })

    it('group checkbox is checked when all children selected', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child1 = { ...createLayer('Child1', 'c-1'), parentId: 'g-1' }
      const child2 = { ...createLayer('Child2', 'c-2'), parentId: 'g-1' }
      const layers: Layer[] = [group, child1, child2]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      const groupCheckbox = screen.getByTestId('export-check-g-1') as HTMLInputElement
      expect(groupCheckbox.checked).toBe(true)
      expect(groupCheckbox.indeterminate).toBe(false)
    })

    it('group checkbox is unchecked when no children selected', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child1 = { ...createLayer('Child1', 'c-1'), parentId: 'g-1', visible: false }
      const child2 = { ...createLayer('Child2', 'c-2'), parentId: 'g-1', visible: false }
      const layers: Layer[] = [group, child1, child2]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

      const groupCheckbox = screen.getByTestId('export-check-g-1') as HTMLInputElement
      expect(groupCheckbox.checked).toBe(false)
      expect(groupCheckbox.indeterminate).toBe(false)
    })

    it('clicking group checkbox in manual mode toggles all descendants', () => {
      const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
      const child1 = { ...createLayer('Child1', 'c-1'), parentId: 'g-1' }
      const child2 = { ...createLayer('Child2', 'c-2'), parentId: 'g-1' }
      const layers: Layer[] = [group, child1, child2]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)



      fireEvent.click(screen.getByTestId('export-check-g-1'))
      expect((screen.getByTestId('export-check-c-1') as HTMLInputElement).checked).toBe(false)
      expect((screen.getByTestId('export-check-c-2') as HTMLInputElement).checked).toBe(false)

      fireEvent.click(screen.getByTestId('export-check-g-1'))
      expect((screen.getByTestId('export-check-c-1') as HTMLInputElement).checked).toBe(true)
      expect((screen.getByTestId('export-check-c-2') as HTMLInputElement).checked).toBe(true)
    })
  })

  it('Export Empty Groups checkbox is unchecked by default', () => {
    render(<ExportLayersDialog {...defaultProps()} />)
    const cb = screen.getByTestId('export-empty-groups-checkbox') as HTMLInputElement
    expect(cb.checked).toBe(false)
  })

  it('passes includeEmptyGroups=true when checkbox is checked', () => {
    const bg = createLayer('Background', 'bg-1')
    const layers = [bg]
    const entries = makeEntries(layers)
    const onConfirm = vi.fn()

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers, onConfirm })} />)

    fireEvent.click(screen.getByTestId('export-empty-groups-checkbox'))
    fireEvent.click(screen.getByTestId('export-confirm-button'))

    expect(onConfirm).toHaveBeenCalledWith(
      expect.anything(), false, true, '/', 'export.ansi.lua',
    )
  })

  describe('file name deduplication', () => {
    it('returns original name when no conflict', () => {
      const result = deduplicateFileName('/', 'export.ansi.lua', () => false)
      expect(result).toEqual({ finalName: 'export.ansi.lua', renamed: false })
    })

    it('appends -1 when file exists', () => {
      const exists = (p: string) => p === '/export.ansi.lua'
      const result = deduplicateFileName('/', 'export.ansi.lua', exists)
      expect(result).toEqual({ finalName: 'export-1.ansi.lua', renamed: true })
    })

    it('appends -2 when -1 also exists', () => {
      const existing = new Set(['/dir/export.ansi.lua', '/dir/export-1.ansi.lua'])
      const result = deduplicateFileName('/dir', 'export.ansi.lua', p => existing.has(p))
      expect(result).toEqual({ finalName: 'export-2.ansi.lua', renamed: true })
    })

    it('shows rename warning in dialog when file exists', () => {
      const bg = createLayer('Background', 'bg-1')
      const layers = [bg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers,
        defaultFileName: 'export.ansi.lua',
        checkFileExists: (p: string) => p === '/export.ansi.lua',
      })} />)

      expect(screen.getByTestId('export-rename-warning')).toBeInTheDocument()
      expect(screen.getByTestId('export-rename-warning').textContent).toContain('export-1.ansi.lua')
    })

    it('does not show rename warning when no conflict', () => {
      const bg = createLayer('Background', 'bg-1')
      const layers = [bg]
      const entries = makeEntries(layers)

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers,
        checkFileExists: () => false,
      })} />)

      expect(screen.queryByTestId('export-rename-warning')).not.toBeInTheDocument()
    })

    it('confirm uses deduplicated name', () => {
      const bg = createLayer('Background', 'bg-1')
      const layers = [bg]
      const entries = makeEntries(layers)
      const onConfirm = vi.fn()

      render(<ExportLayersDialog {...defaultProps({
        entries, allLayers: layers, onConfirm,
        defaultFileName: 'export.ansi.lua',
        checkFileExists: (p: string) => p === '/export.ansi.lua',
      })} />)

      fireEvent.click(screen.getByTestId('export-confirm-button'))
      expect(onConfirm).toHaveBeenCalledWith(
        expect.anything(), false, false, '/', 'export-1.ansi.lua',
      )
    })
  })

  it('applies indentation for nested layers', () => {
    const group: GroupLayer = { ...createGroup('Group', 'g-1'), collapsed: false }
    const child = { ...createLayer('Child', 'c-1'), parentId: 'g-1' }
    const layers: Layer[] = [group, child]
    const entries = makeEntries(layers)

    render(<ExportLayersDialog {...defaultProps({ entries, allLayers: layers })} />)

    const childItem = screen.getByTestId('export-layer-c-1')
    expect(childItem.style.paddingLeft).toBe('32px')
  })
})
