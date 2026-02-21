/* eslint-disable max-lines */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { LayersPanel } from './LayersPanel'
import type { Layer, TextLayer, GroupLayer } from './types'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_CELL } from './types'
import { createLayer, createGroup } from './layerUtils'

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
    onReorder?: (id: string, newIndex: number, targetGroupId?: string | null) => void
    onAdd?: () => void
    onRemove?: (id: string) => void
    onMergeDown?: (id: string) => void
    onWrapInGroup?: (layerId: string) => void
    onRemoveFromGroup?: (layerId: string) => void
    onDuplicate?: (id: string) => void
    onToggleGroupCollapsed?: (groupId: string) => void
    availableTags?: string[]
    onAddTagToLayer?: (layerId: string, tag: string) => void
    onRemoveTagFromLayer?: (layerId: string, tag: string) => void
    onCreateTag?: (tag: string) => void
    onDeleteTag?: (tag: string) => void
    onRenameTag?: (oldTag: string, newTag: string) => void
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
        onWrapInGroup={overrides?.onWrapInGroup ?? noop}
        onRemoveFromGroup={overrides?.onRemoveFromGroup ?? noop}
        onDuplicate={overrides?.onDuplicate ?? noop}
        onToggleGroupCollapsed={overrides?.onToggleGroupCollapsed ?? noop}
        availableTags={overrides?.availableTags ?? []}
        onAddTagToLayer={overrides?.onAddTagToLayer ?? noop}
        onRemoveTagFromLayer={overrides?.onRemoveTagFromLayer ?? noop}
        onCreateTag={overrides?.onCreateTag ?? noop}
        onDeleteTag={overrides?.onDeleteTag ?? noop}
        onRenameTag={overrides?.onRenameTag ?? noop}
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

    it('dragging a layer onto a drop zone calls onReorder with target array index', () => {
      const onReorder = vi.fn()
      const layers = makeLayers('Background', 'Middle', 'Top')
      renderPanel({ layers, onReorder })
      const gripTop = screen.getByTestId('layer-grip-layer-2')
      const zone = screen.getByTestId('layer-drop-zone-layer-0')
      startDrag(gripTop)
      fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(zone, { dataTransfer: { getData: () => 'layer-2' }, preventDefault: vi.fn() })
      expect(onReorder).toHaveBeenCalledWith('layer-2', 1)
    })

    it('hides the dragged row during drag', () => {
      renderPanel()
      const grip = screen.getByTestId('layer-grip-layer-1')
      startDrag(grip)
      const row = screen.getByTestId('layer-row-layer-1')
      expect(row.className).toContain('Dragging')
    })

    it('drop zone gets active class when dragging over it (moving up)', () => {
      const layers = makeLayers('Bot', 'Mid', 'Top')
      renderPanel({ layers })
      const gripBot = screen.getByTestId('layer-grip-layer-0')
      const zoneTop = screen.getByTestId('layer-drop-zone-layer-2')
      startDrag(gripBot)
      fireEvent.dragOver(zoneTop, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      expect(zoneTop.className).toContain('Active')
    })

    it('drop zone gets active class when dragging over it (moving down)', () => {
      const layers = makeLayers('Bot', 'Mid', 'Top')
      renderPanel({ layers })
      const gripTop = screen.getByTestId('layer-grip-layer-2')
      const zoneBot = screen.getByTestId('layer-drop-zone-layer-0')
      startDrag(gripTop)
      fireEvent.dragOver(zoneBot, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      expect(zoneBot.className).toContain('Active')
    })

    it('dropping on drop zone calls onReorder', () => {
      const onReorder = vi.fn()
      const layers = makeLayers('Bot', 'Mid', 'Top')
      renderPanel({ layers, onReorder })
      const gripBot = screen.getByTestId('layer-grip-layer-0')
      const zoneTop = screen.getByTestId('layer-drop-zone-layer-2')
      startDrag(gripBot)
      fireEvent.dragOver(zoneTop, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(zoneTop, { dataTransfer: { getData: () => 'layer-0' }, preventDefault: vi.fn() })
      expect(onReorder).toHaveBeenCalledWith('layer-0', 3)
    })

    it('within-group reorder: drop zone passes targetGroupId for range-aware positioning', () => {
      const onReorder = vi.fn()
      const group = createGroup('Group', 'g1')
      const a = createLayer('A', 'a'); a.parentId = 'g1'
      const b = createLayer('B', 'b'); b.parentId = 'g1'
      const c = createLayer('C', 'c'); c.parentId = 'g1'
      // Array [group, a, b, c] — visual top-to-bottom: Group, C, B, A
      renderPanel({ layers: [group, a, b, c], onReorder, activeLayerId: 'a' })
      // Drag C to drop-zone-a (above A visually = after A in array index 1 → insertIdx 2)
      startDrag(screen.getByTestId('layer-grip-c'))
      const zoneA = screen.getByTestId('layer-drop-zone-a')
      fireEvent.dragOver(zoneA, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(zoneA, { dataTransfer: { getData: () => 'c' }, preventDefault: vi.fn() })
      // Within-group reorder: passes group id for range-aware positioning
      expect(onReorder).toHaveBeenCalledWith('c', 2, 'g1')
    })

    it('cross-group: dragging a child to a root zone passes null targetGroupId', () => {
      const onReorder = vi.fn()
      const group = createGroup('Group', 'g1')
      const child = createLayer('Child', 'c1'); child.parentId = 'g1'
      const root = createLayer('Root', 'r1')
      // Array: [root, group, child]
      renderPanel({ layers: [root, group, child], onReorder, activeLayerId: 'c1' })
      // Drag child to drop-zone-r1 (root layer zone) — cross-group: child→root
      startDrag(screen.getByTestId('layer-grip-c1'))
      const zoneRoot = screen.getByTestId('layer-drop-zone-r1')
      fireEvent.dragOver(zoneRoot, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(zoneRoot, { dataTransfer: { getData: () => 'c1' }, preventDefault: vi.fn() })
      // Should pass null to move to root
      expect(onReorder).toHaveBeenCalledWith('c1', 1, null)
    })

    it('cross-group: dragging a root layer to a grouped zone passes the group id', () => {
      const onReorder = vi.fn()
      const group = createGroup('Group', 'g1')
      const child = createLayer('Child', 'c1'); child.parentId = 'g1'
      const root = createLayer('Root', 'r1')
      // Array: [root, group, child]
      renderPanel({ layers: [root, group, child], onReorder, activeLayerId: 'r1' })
      // Drag root to drop-zone-c1 (grouped child zone) — cross-group: root→g1
      startDrag(screen.getByTestId('layer-grip-r1'))
      const zoneChild = screen.getByTestId('layer-drop-zone-c1')
      fireEvent.dragOver(zoneChild, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(zoneChild, { dataTransfer: { getData: () => 'r1' }, preventDefault: vi.fn() })
      // Should pass 'g1' to move into group
      expect(onReorder).toHaveBeenCalledWith('r1', 3, 'g1')
    })

    it('nested group reorder: preserves parent group context', () => {
      const onReorder = vi.fn()
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const child = createLayer('Child', 'c1'); child.parentId = 'g-outer'
      // Array: [outer, inner, child] — inner and child are siblings in outer
      renderPanel({ layers: [outer, inner, child], onReorder, activeLayerId: 'c1' })
      // Drag inner group to drop-zone-child (within same parent group)
      startDrag(screen.getByTestId('layer-grip-g-inner'))
      const zone = screen.getByTestId('layer-drop-zone-c1')
      fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      fireEvent.drop(zone, { dataTransfer: { getData: () => 'g-inner' }, preventDefault: vi.fn() })
      // Should pass parent group id, NOT null (which would deparent)
      // child is at array index 2, so insertIdx = 3
      expect(onReorder).toHaveBeenCalledWith('g-inner', 3, 'g-outer')
    })

    it('clears drag state on dragEnd', () => {
      renderPanel()
      const grip = screen.getByTestId('layer-grip-layer-1')
      startDrag(grip)
      expect(screen.getByTestId('layer-row-layer-1').className).toContain('Dragging')
      // Hover a drop zone to activate it
      const zone = screen.getByTestId('layer-drop-zone-layer-0')
      fireEvent.dragOver(zone, { dataTransfer: { dropEffect: '' }, preventDefault: vi.fn() })
      expect(zone.className).toContain('Active')
      fireEvent.dragEnd(grip)
      expect(screen.getByTestId('layer-row-layer-1').className).not.toContain('Dragging')
      expect(zone.className).not.toContain('Active')
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

    it('right-clicking backdrop over another layer reopens context menu for that layer', () => {
      renderPanel()
      // Open context menu on layer-1
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-1'))
      expect(screen.getByTestId('layer-context-menu')).toBeTruthy()

      // Simulate right-click on backdrop with elementFromPoint returning layer-0 row
      const targetRow = screen.getByTestId('layer-row-layer-0')
      const originalElementFromPoint = document.elementFromPoint
      document.elementFromPoint = () => targetRow
      try {
        fireEvent.contextMenu(screen.getByTestId('layer-context-backdrop'), {
          clientX: 100,
          clientY: 200,
        })
      } finally {
        document.elementFromPoint = originalElementFromPoint
      }

      // Context menu should still be open, now for layer-0
      expect(screen.getByTestId('layer-context-menu')).toBeTruthy()
      // Merge Down should be disabled for the bottom layer
      expect(screen.getByTestId('context-merge-down')).toBeDisabled()
    })

    it('right-clicking backdrop over non-layer area closes context menu', () => {
      renderPanel()
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-1'))
      expect(screen.getByTestId('layer-context-menu')).toBeTruthy()

      const originalElementFromPoint = document.elementFromPoint
      document.elementFromPoint = () => document.body
      try {
        fireEvent.contextMenu(screen.getByTestId('layer-context-backdrop'), {
          clientX: 100,
          clientY: 200,
        })
      } finally {
        document.elementFromPoint = originalElementFromPoint
      }

      expect(screen.queryByTestId('layer-context-menu')).toBeNull()
    })
  })

  function makeGroupedLayers(): Layer[] {
    const group = createGroup('Characters', 'g1')
    const child1 = createLayer('Hero', 'c1')
    child1.parentId = 'g1'
    const child2 = createLayer('Enemy', 'c2')
    child2.parentId = 'g1'
    const root = createLayer('Background', 'bg')
    return [root, group, child1, child2]
  }

  describe('group layers', () => {
    it('renders group rows with folder badge', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1' })
      const groupRow = screen.getByTestId('layer-row-g1')
      expect(groupRow).toBeTruthy()
      const badge = groupRow.querySelector('[data-testid="group-layer-badge"]')
      expect(badge).not.toBeNull()
    })

    it('renders collapse toggle on group rows', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1' })
      expect(screen.getByTestId('group-toggle-g1')).toBeTruthy()
    })

    it('clicking collapse toggle calls onToggleGroupCollapsed', () => {
      const onToggleGroupCollapsed = vi.fn()
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1', onToggleGroupCollapsed })
      fireEvent.click(screen.getByTestId('group-toggle-g1'))
      expect(onToggleGroupCollapsed).toHaveBeenCalledWith('g1')
    })

    it('hides children when group is collapsed', () => {
      const layers = makeGroupedLayers()
      const group = layers[1] as GroupLayer
      group.collapsed = true
      renderPanel({ layers, activeLayerId: 'bg' })
      // Children should be hidden
      expect(screen.queryByTestId('layer-row-c1')).toBeNull()
      expect(screen.queryByTestId('layer-row-c2')).toBeNull()
      // Group should still be visible
      expect(screen.getByTestId('layer-row-g1')).toBeTruthy()
    })

    it('shows children when group is expanded', () => {
      const layers = makeGroupedLayers()
      renderPanel({ layers, activeLayerId: 'c1' })
      expect(screen.getByTestId('layer-row-c1')).toBeTruthy()
      expect(screen.getByTestId('layer-row-c2')).toBeTruthy()
    })

    it('child rows have indent via inline style', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1' })
      const childRow = screen.getByTestId('layer-row-c1')
      expect(childRow.style.paddingLeft).toBe('28px')
    })

    it('group row gets active styling when active', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'g1' })
      const groupRow = screen.getByTestId('layer-row-g1')
      expect(groupRow.className).toContain('Active')
    })

    it('clicking group row calls onSetActive', () => {
      const onSetActive = vi.fn()
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1', onSetActive })
      const groupRow = screen.getByTestId('layer-row-g1')
      fireEvent.click(groupRow)
      expect(onSetActive).toHaveBeenCalledWith('g1')
    })
  })

  describe('group context menu', () => {
    it('shows "Group with new folder" for root drawable layers', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'bg' })
      const row = screen.getByTestId('layer-row-bg')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-wrap-in-group')).toBeTruthy()
      expect(screen.getByTestId('context-wrap-in-group').textContent).toBe('Group with new folder')
    })

    it('shows "Group with new folder" for grouped layers (enables nesting)', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1' })
      const row = screen.getByTestId('layer-row-c1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-wrap-in-group')).toBeTruthy()
    })

    it('shows "Remove from group" for grouped layers', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1' })
      const row = screen.getByTestId('layer-row-c1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-remove-from-group')).toBeTruthy()
    })

    it('does not show "Remove from group" for root layers', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'bg' })
      const row = screen.getByTestId('layer-row-bg')
      fireEvent.contextMenu(row)
      expect(screen.queryByTestId('context-remove-from-group')).toBeNull()
    })

    it('does not show "Merge Down" for group rows', () => {
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1' })
      const row = screen.getByTestId('layer-row-g1')
      fireEvent.contextMenu(row)
      expect(screen.queryByTestId('context-merge-down')).toBeNull()
    })

    it('clicking "Group with new folder" calls onWrapInGroup', () => {
      const onWrapInGroup = vi.fn()
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'bg', onWrapInGroup })
      const row = screen.getByTestId('layer-row-bg')
      fireEvent.contextMenu(row)
      fireEvent.click(screen.getByTestId('context-wrap-in-group'))
      expect(onWrapInGroup).toHaveBeenCalledWith('bg')
    })

    it('clicking "Remove from group" calls onRemoveFromGroup', () => {
      const onRemoveFromGroup = vi.fn()
      renderPanel({ layers: makeGroupedLayers(), activeLayerId: 'c1', onRemoveFromGroup })
      const row = screen.getByTestId('layer-row-c1')
      fireEvent.contextMenu(row)
      fireEvent.click(screen.getByTestId('context-remove-from-group'))
      expect(onRemoveFromGroup).toHaveBeenCalledWith('c1')
    })

    it('shows "Remove from group" for groups with parentId', () => {
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const leaf = createLayer('Leaf', 'l1')
      leaf.parentId = 'g-inner'
      renderPanel({ layers: [outer, inner, leaf], activeLayerId: 'l1' })
      const row = screen.getByTestId('layer-row-g-inner')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-remove-from-group')).toBeTruthy()
    })

    it('shows "Group with new folder" for group layers', () => {
      const group = createGroup('G', 'g1')
      const layer = createLayer('L', 'l1')
      renderPanel({ layers: [group, layer], activeLayerId: 'l1' })
      const row = screen.getByTestId('layer-row-g1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-wrap-in-group')).toBeTruthy()
    })
  })

  describe('nested groups', () => {
    function makeNestedLayers(): Layer[] {
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const leaf = createLayer('Leaf', 'l1')
      leaf.parentId = 'g-inner'
      const directChild = createLayer('Direct', 'l2')
      directChild.parentId = 'g-outer'
      return [outer, inner, leaf, directChild]
    }

    it('renders multi-level indentation', () => {
      renderPanel({ layers: makeNestedLayers(), activeLayerId: 'l1' })
      const innerRow = screen.getByTestId('layer-row-g-inner')
      // Inner group is depth 1
      expect(innerRow.style.paddingLeft).toBe('28px')
      const leafRow = screen.getByTestId('layer-row-l1')
      // Leaf is depth 2
      expect(leafRow.style.paddingLeft).toBe('56px')
      const directRow = screen.getByTestId('layer-row-l2')
      // Direct child is depth 1
      expect(directRow.style.paddingLeft).toBe('28px')
    })

    it('hides grandchildren when ancestor is collapsed', () => {
      const layers = makeNestedLayers()
      const outer = layers[0] as GroupLayer
      outer.collapsed = true
      renderPanel({ layers, activeLayerId: 'l1' })
      // All children/grandchildren should be hidden
      expect(screen.queryByTestId('layer-row-g-inner')).toBeNull()
      expect(screen.queryByTestId('layer-row-l1')).toBeNull()
      expect(screen.queryByTestId('layer-row-l2')).toBeNull()
    })

    it('hides only inner collapsed group children', () => {
      const layers = makeNestedLayers()
      const inner = layers[1] as GroupLayer
      inner.collapsed = true
      renderPanel({ layers, activeLayerId: 'l2' })
      // Inner group should be visible, leaf should be hidden, direct child visible
      expect(screen.getByTestId('layer-row-g-inner')).toBeTruthy()
      expect(screen.queryByTestId('layer-row-l1')).toBeNull()
      expect(screen.getByTestId('layer-row-l2')).toBeTruthy()
    })
  })

  describe('context menu duplicate', () => {
    it('shows Duplicate button in context menu for a drawable layer', () => {
      renderPanel()
      const row = screen.getByTestId('layer-row-layer-0')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-duplicate')).toBeTruthy()
      expect(screen.getByTestId('context-duplicate').textContent).toBe('Duplicate')
    })

    it('shows Duplicate button in context menu for a group layer', () => {
      const group = createGroup('Folder', 'group-1')
      const child = { ...createLayer('Child', 'layer-10'), parentId: 'group-1' }
      renderPanel({ layers: [group, child], activeLayerId: 'layer-10' })
      const row = screen.getByTestId('layer-row-group-1')
      fireEvent.contextMenu(row)
      expect(screen.getByTestId('context-duplicate')).toBeTruthy()
    })

    it('calls onDuplicate with the layer id and closes the menu', () => {
      const onDuplicate = vi.fn()
      renderPanel({ onDuplicate })
      const row = screen.getByTestId('layer-row-layer-0')
      fireEvent.contextMenu(row)
      fireEvent.click(screen.getByTestId('context-duplicate'))
      expect(onDuplicate).toHaveBeenCalledWith('layer-0')
      expect(screen.queryByTestId('layer-context-menu')).toBeNull()
    })
  })

  describe('tabs', () => {
    it('renders Layers and Tags tabs', () => {
      renderPanel()
      expect(screen.getByTestId('tab-layers')).toBeTruthy()
      expect(screen.getByTestId('tab-tags')).toBeTruthy()
    })

    it('shows layers list by default (Layers tab active)', () => {
      renderPanel()
      expect(screen.getByTestId('tab-layers').className).toContain('Active')
      expect(screen.getByText('Background')).toBeTruthy()
    })

    it('switches to Tags tab when clicked', () => {
      renderPanel()
      fireEvent.click(screen.getByTestId('tab-tags'))
      expect(screen.getByTestId('tab-tags').className).toContain('Active')
      expect(screen.getByTestId('tags-tab-content')).toBeTruthy()
    })

    it('switches back to Layers tab', () => {
      renderPanel()
      fireEvent.click(screen.getByTestId('tab-tags'))
      fireEvent.click(screen.getByTestId('tab-layers'))
      expect(screen.getByText('Background')).toBeTruthy()
    })

    it('hides add button on Tags tab', () => {
      renderPanel()
      fireEvent.click(screen.getByTestId('tab-tags'))
      expect(screen.queryByRole('button', { name: /add layer/i })).toBeNull()
    })

    it('shows add button on Layers tab', () => {
      renderPanel()
      expect(screen.getByRole('button', { name: /add layer/i })).toBeTruthy()
    })
  })

  describe('context menu tags submenu', () => {
    it('shows Tags submenu item in context menu', () => {
      renderPanel({ availableTags: ['Characters'] })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      expect(screen.getByTestId('context-tags-submenu-trigger')).toBeTruthy()
    })

    it('shows "No tags created" when no tags available', () => {
      renderPanel({ availableTags: [] })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      const trigger = screen.getByTestId('context-tags-submenu-trigger')
      fireEvent.mouseEnter(trigger)
      expect(screen.getByTestId('tags-submenu-empty')).toBeTruthy()
    })

    it('shows checkboxes for each available tag', () => {
      renderPanel({ availableTags: ['Characters', 'Props'] })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      fireEvent.mouseEnter(screen.getByTestId('context-tags-submenu-trigger'))
      expect(screen.getByTestId('tag-checkbox-Characters')).toBeTruthy()
      expect(screen.getByTestId('tag-checkbox-Props')).toBeTruthy()
    })

    it('checks tags that the layer already has', () => {
      const layers = makeLayers('Background', 'Foreground')
      layers[0] = { ...layers[0], tags: ['Characters'] }
      renderPanel({ layers, availableTags: ['Characters', 'Props'] })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      fireEvent.mouseEnter(screen.getByTestId('context-tags-submenu-trigger'))
      const charBox = screen.getByTestId('tag-checkbox-Characters') as HTMLInputElement
      const propsBox = screen.getByTestId('tag-checkbox-Props') as HTMLInputElement
      expect(charBox.checked).toBe(true)
      expect(propsBox.checked).toBe(false)
    })

    it('clicking unchecked tag calls onAddTagToLayer', () => {
      const onAddTagToLayer = vi.fn()
      renderPanel({ availableTags: ['Characters'], onAddTagToLayer })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      fireEvent.mouseEnter(screen.getByTestId('context-tags-submenu-trigger'))
      fireEvent.click(screen.getByTestId('tag-checkbox-Characters'))
      expect(onAddTagToLayer).toHaveBeenCalledWith('layer-0', 'Characters')
    })

    it('clicking checked tag calls onRemoveTagFromLayer', () => {
      const onRemoveTagFromLayer = vi.fn()
      const layers = makeLayers('Background')
      layers[0] = { ...layers[0], tags: ['Characters'] }
      renderPanel({ layers, availableTags: ['Characters'], onRemoveTagFromLayer })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      fireEvent.mouseEnter(screen.getByTestId('context-tags-submenu-trigger'))
      fireEvent.click(screen.getByTestId('tag-checkbox-Characters'))
      expect(onRemoveTagFromLayer).toHaveBeenCalledWith('layer-0', 'Characters')
    })

    it('flips submenu to left when it would overflow viewport', () => {
      renderPanel({ availableTags: ['Characters'] })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      const trigger = screen.getByTestId('context-tags-submenu-trigger')
      // Mock getBoundingClientRect to simulate off-screen right edge
      const origGetBCR = Element.prototype.getBoundingClientRect
      Element.prototype.getBoundingClientRect = function () {
        if (this.getAttribute('data-testid') === 'tags-submenu') {
          return { left: 900, right: window.innerWidth + 50, top: 100, bottom: 200, width: 150, height: 100, x: 900, y: 100, toJSON() {} } as DOMRect
        }
        return origGetBCR.call(this)
      }
      fireEvent.mouseEnter(trigger)
      const submenu = screen.getByTestId('tags-submenu')
      expect(submenu.className).toContain('Flipped')
      Element.prototype.getBoundingClientRect = origGetBCR
    })

    it('does not flip submenu when it fits in viewport', () => {
      renderPanel({ availableTags: ['Characters'] })
      fireEvent.contextMenu(screen.getByTestId('layer-row-layer-0'))
      fireEvent.mouseEnter(screen.getByTestId('context-tags-submenu-trigger'))
      const submenu = screen.getByTestId('tags-submenu')
      expect(submenu.className).not.toContain('Flipped')
    })
  })
})
