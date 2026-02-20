/* eslint-disable max-lines */
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayerState } from './useLayerState'
import { createLayer, createGroup } from './layerUtils'
import type { DrawableLayer, DrawnLayer, LayerState, RGBColor, Rect, TextLayer, GroupLayer } from './types'
import { MIN_FRAME_DURATION_MS, MAX_FRAME_DURATION_MS, TRANSPARENT_BG, isGroupLayer, isDrawableLayer } from './types'

describe('useLayerState', () => {
  describe('initialization', () => {
    it('initializes with a single "Background" layer', () => {
      const { result } = renderHook(() => useLayerState())
      expect(result.current.layers).toHaveLength(1)
      expect(result.current.layers[0].name).toBe('Background')
    })

    it('sets the background layer as active', () => {
      const { result } = renderHook(() => useLayerState())
      expect(result.current.activeLayerId).toBe(result.current.layers[0].id)
    })

    it('activeLayer returns the background layer', () => {
      const { result } = renderHook(() => useLayerState())
      expect(result.current.activeLayer).toBe(result.current.layers[0])
      expect(result.current.activeLayer.name).toBe('Background')
    })
  })

  describe('addLayer', () => {
    it('appends a new layer', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      expect(result.current.layers).toHaveLength(2)
    })

    it('names layers sequentially', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      expect(result.current.layers[1].name).toBe('Layer 2')
    })

    it('sets the new layer as active', () => {
      const { result } = renderHook(() => useLayerState())
      const firstId = result.current.layers[0].id
      act(() => result.current.addLayer())
      expect(result.current.activeLayerId).toBe(result.current.layers[1].id)
      expect(result.current.activeLayerId).not.toBe(firstId)
      expect(result.current.activeLayer).toBe(result.current.layers[1])
    })
  })

  describe('removeLayer', () => {
    it('removes a layer by id', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const id = result.current.layers[1].id
      act(() => result.current.removeLayer(id))
      expect(result.current.layers).toHaveLength(1)
    })

    it('prevents removing the last layer', () => {
      const { result } = renderHook(() => useLayerState())
      const id = result.current.layers[0].id
      act(() => result.current.removeLayer(id))
      expect(result.current.layers).toHaveLength(1)
    })

    it('switches active to another layer if active was removed', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const activeId = result.current.activeLayerId
      act(() => result.current.removeLayer(activeId))
      expect(result.current.layers).toHaveLength(1)
      expect(result.current.activeLayerId).toBe(result.current.layers[0].id)
    })
  })

  describe('renameLayer', () => {
    it('updates layer name', () => {
      const { result } = renderHook(() => useLayerState())
      const id = result.current.layers[0].id
      act(() => result.current.renameLayer(id, 'Renamed'))
      expect(result.current.layers[0].name).toBe('Renamed')
    })

    it('does not rename other layers', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const firstId = result.current.layers[0].id
      act(() => result.current.renameLayer(firstId, 'Renamed'))
      expect(result.current.layers[1].name).toBe('Layer 2')
    })
  })

  describe('setActiveLayer', () => {
    it('changes the active layer', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const firstId = result.current.layers[0].id
      act(() => result.current.setActiveLayer(firstId))
      expect(result.current.activeLayerId).toBe(firstId)
    })

    it('updates activeLayerIdRef synchronously', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const firstId = result.current.layers[0].id
      // Read the ref immediately after calling setActiveLayer (inside act but before re-render)
      let refValueDuringCall: string | undefined
      act(() => {
        result.current.setActiveLayer(firstId)
        refValueDuringCall = result.current.activeLayerIdRef.current
      })
      expect(refValueDuringCall).toBe(firstId)
    })
  })

  describe('reorderLayer', () => {
    it('moves a layer to index 0 (bottom)', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      act(() => result.current.addLayer())
      // [Background, Layer 2, Layer 3]
      const topId = result.current.layers[2].id
      act(() => result.current.reorderLayer(topId, 0))
      expect(result.current.layers[0].id).toBe(topId)
    })

    it('moves a layer to the last index (top)', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      act(() => result.current.addLayer())
      const bottomId = result.current.layers[0].id
      act(() => result.current.reorderLayer(bottomId, 2))
      expect(result.current.layers[2].id).toBe(bottomId)
    })

    it('is a no-op when newIndex equals current index', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const layersBefore = result.current.layers
      act(() => result.current.reorderLayer(layersBefore[0].id, 0))
      expect(result.current.layers).toBe(layersBefore)
    })

    it('is a no-op for an invalid id', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const layersBefore = result.current.layers
      act(() => result.current.reorderLayer('nonexistent', 0))
      expect(result.current.layers).toBe(layersBefore)
    })

    it('clamps newIndex above array length', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const bottomId = result.current.layers[0].id
      act(() => result.current.reorderLayer(bottomId, 999))
      expect(result.current.layers[1].id).toBe(bottomId)
    })

    it('clamps negative newIndex to 0', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const topId = result.current.layers[1].id
      act(() => result.current.reorderLayer(topId, -5))
      expect(result.current.layers[0].id).toBe(topId)
    })

    it('is a no-op with a single layer', () => {
      const { result } = renderHook(() => useLayerState())
      const layersBefore = result.current.layers
      act(() => result.current.reorderLayer(layersBefore[0].id, 0))
      expect(result.current.layers).toBe(layersBefore)
    })
  })

  describe('toggleVisibility', () => {
    it('flips a visible layer to hidden', () => {
      const { result } = renderHook(() => useLayerState())
      const id = result.current.layers[0].id
      act(() => result.current.toggleVisibility(id))
      expect(result.current.layers[0].visible).toBe(false)
    })

    it('flips a hidden layer back to visible', () => {
      const { result } = renderHook(() => useLayerState())
      const id = result.current.layers[0].id
      act(() => result.current.toggleVisibility(id))
      expect(result.current.layers[0].visible).toBe(false)
      act(() => result.current.toggleVisibility(id))
      expect(result.current.layers[0].visible).toBe(true)
    })

    it('does not toggle visibility of other layers', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const firstId = result.current.layers[0].id
      act(() => result.current.toggleVisibility(firstId))
      expect(result.current.layers[0].visible).toBe(false)
      expect(result.current.layers[1].visible).toBe(true)
    })
  })

  describe('applyToActiveLayer', () => {
    it('modifies the active layer grid cell', () => {
      const { result } = renderHook(() => useLayerState())
      const red: RGBColor = [255, 0, 0]
      act(() => result.current.applyToActiveLayer(0, 0, { char: '#', fg: red, bg: [0, 0, 0] }))
      expect((result.current.activeLayer as DrawableLayer).grid[0][0].char).toBe('#')
      expect((result.current.activeLayer as DrawableLayer).grid[0][0].fg).toEqual(red)
    })

    it('only modifies the active layer, not other layers', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      // Active layer is now layer 2
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'X', fg: [255, 0, 0], bg: [0, 0, 0] }))
      expect((result.current.layers[0] as DrawableLayer).grid[0][0].char).toBe(' ')
      expect((result.current.layers[1] as DrawableLayer).grid[0][0].char).toBe('X')
    })
  })

  describe('getLayerState / restoreLayerState', () => {
    it('round-trips the layer state', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const red: RGBColor = [255, 0, 0]
      act(() => result.current.applyToActiveLayer(5, 5, { char: 'X', fg: red, bg: [0, 0, 0] }))
      const snapshot = result.current.getLayerState()

      // Modify state
      act(() => result.current.removeLayer(result.current.layers[1].id))
      expect(result.current.layers).toHaveLength(1)

      // Restore
      act(() => result.current.restoreLayerState(snapshot))
      expect(result.current.layers).toHaveLength(2)
      expect((result.current.layers[1] as DrawableLayer).grid[5][5].char).toBe('X')
    })

    it('getLayerState returns a deep clone (mutating it does not affect state)', () => {
      const { result } = renderHook(() => useLayerState())
      const snapshot = result.current.getLayerState()
      snapshot.layers[0].name = 'mutated'
      expect(result.current.layers[0].name).toBe('Background')
    })
  })

  describe('getActiveGrid', () => {
    it('returns the grid of the active layer', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'Y', fg: [0, 255, 0], bg: [0, 0, 0] }))
      const grid = result.current.getActiveGrid()
      expect(grid[0][0].char).toBe('Y')
    })
  })

  describe('refs', () => {
    it('layersRef tracks current layers after mutation', () => {
      const { result } = renderHook(() => useLayerState())
      expect(result.current.layersRef.current).toBe(result.current.layers)
      act(() => result.current.addLayer())
      expect(result.current.layersRef.current).toBe(result.current.layers)
      expect(result.current.layersRef.current).toHaveLength(2)
    })

    it('activeLayerIdRef tracks current activeLayerId after change', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      expect(result.current.activeLayerIdRef.current).toBe(result.current.activeLayerId)
      const firstId = result.current.layers[0].id
      act(() => result.current.setActiveLayer(firstId))
      expect(result.current.activeLayerIdRef.current).toBe(firstId)
    })
  })

  describe('syncLayerIds on init', () => {
    it('adding a layer after init with pre-existing IDs produces a unique ID', () => {
      const initial: LayerState = {
        layers: [
          createLayer('Background', 'layer-1'),
          createLayer('Foreground', 'layer-2'),
          createLayer('Details', 'layer-3'),
        ],
        activeLayerId: 'layer-1',
      }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.addLayer())
      const ids = result.current.layers.map(l => l.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('new layer ID is greater than highest existing ID after init', () => {
      const initial: LayerState = {
        layers: [
          createLayer('A', 'layer-5'),
          createLayer('B', 'layer-10'),
        ],
        activeLayerId: 'layer-5',
      }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.addLayer())
      const newLayer = result.current.layers[result.current.layers.length - 1]
      const match = newLayer.id.match(/^layer-(\d+)$/)
      expect(match).not.toBeNull()
      expect(parseInt(match![1], 10)).toBeGreaterThanOrEqual(11)
    })
  })

  describe('syncLayerIds on restore', () => {
    it('adding a layer after restoreLayerState with pre-existing IDs produces a unique ID', () => {
      const { result } = renderHook(() => useLayerState())
      const snapshot: LayerState = {
        layers: [
          createLayer('Background', 'layer-1'),
          createLayer('Foreground', 'layer-2'),
          createLayer('Details', 'layer-3'),
        ],
        activeLayerId: 'layer-1',
      }
      act(() => result.current.restoreLayerState(snapshot))
      act(() => result.current.addLayer())
      const ids = result.current.layers.map(l => l.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('layerCountRef sync on init', () => {
    it('new layer display name is correct after init with existing layers', () => {
      const initial: LayerState = {
        layers: [
          createLayer('Background', 'layer-1'),
          createLayer('Layer 2', 'layer-2'),
          createLayer('Layer 3', 'layer-3'),
        ],
        activeLayerId: 'layer-1',
      }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.addLayer())
      const newLayer = result.current.layers[result.current.layers.length - 1]
      expect(newLayer.name).toBe('Layer 4')
    })
  })

  describe('addTextLayer', () => {
    const red: RGBColor = [255, 0, 0]
    const bounds: Rect = { r0: 0, c0: 0, r1: 2, c1: 10 }

    it('creates a text layer with the given name, bounds, and fg', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      expect(result.current.layers).toHaveLength(2)
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.type).toBe('text')
      expect(textLayer.name).toBe('Text 1')
      expect(textLayer.bounds).toEqual(bounds)
      expect(textLayer.textFg).toEqual(red)
      expect(textLayer.text).toBe('')
    })

    it('sets the new text layer as active', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      expect(result.current.activeLayerId).toBe(result.current.layers[1].id)
    })

    it('syncs layersRef and activeLayerIdRef synchronously', () => {
      const { result } = renderHook(() => useLayerState())
      let refLayers: number | undefined
      let refActiveId: string | undefined
      act(() => {
        result.current.addTextLayer('Text 1', bounds, red)
        refLayers = result.current.layersRef.current.length
        refActiveId = result.current.activeLayerIdRef.current
      })
      // Refs should be updated synchronously, not waiting for re-render
      expect(refLayers).toBe(2)
      const textLayer = result.current.layersRef.current[1]
      expect(textLayer.type).toBe('text')
      expect(refActiveId).toBe(textLayer.id)
    })

    it('initializes grid with default cells for empty text', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.grid[0][0].char).toBe(' ') // empty text = all default cells
    })

    it('initializes textFgColors as empty array', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.textFgColors).toEqual([])
    })
  })

  describe('updateTextLayer', () => {
    const red: RGBColor = [255, 0, 0]
    const blue: RGBColor = [0, 0, 255]
    const bounds: Rect = { r0: 0, c0: 0, r1: 2, c1: 10 }

    it('updates text and re-renders grid', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const id = result.current.layers[1].id
      act(() => result.current.updateTextLayer(id, { text: 'Hello' }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.text).toBe('Hello')
      expect(textLayer.grid[0][0].char).toBe('H')
      expect(textLayer.grid[0][0].bg).toEqual(TRANSPARENT_BG)
    })

    it('updates bounds and re-renders grid', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const id = result.current.layers[1].id
      act(() => result.current.updateTextLayer(id, { text: 'AB' }))
      const newBounds: Rect = { r0: 5, c0: 5, r1: 5, c1: 10 }
      act(() => result.current.updateTextLayer(id, { bounds: newBounds }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.bounds).toEqual(newBounds)
      expect(textLayer.grid[5][5].char).toBe('A')
      expect(textLayer.grid[0][0].char).toBe(' ') // old position cleared
    })

    it('updates textFg and re-renders grid', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const id = result.current.layers[1].id
      act(() => result.current.updateTextLayer(id, { text: 'X', textFg: blue }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.textFg).toEqual(blue)
      expect(textLayer.grid[0][0].fg).toEqual(blue)
    })

    it('is a no-op for non-existent layer id', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      act(() => result.current.updateTextLayer('nonexistent', { text: 'X' }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.text).toBe('')
    })

    it('updates textAlign and re-renders grid with alignment', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const id = result.current.layers[1].id
      // Write "Hi" into a 10-wide bounds, then set center alignment
      const wideBounds: Rect = { r0: 0, c0: 0, r1: 0, c1: 9 }
      act(() => result.current.updateTextLayer(id, { text: 'Hi', bounds: wideBounds, textAlign: 'center' }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.textAlign).toBe('center')
      // "Hi" centered in width 10: offset = floor((10-2)/2) = 4
      expect(textLayer.grid[0][4].char).toBe('H')
      expect(textLayer.grid[0][5].char).toBe('i')
    })

    it('preserves textAlign when updating other fields', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const id = result.current.layers[1].id
      act(() => result.current.updateTextLayer(id, { textAlign: 'right' }))
      act(() => result.current.updateTextLayer(id, { text: 'AB' }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.textAlign).toBe('right')
    })

    it('stores textFgColors and passes to renderTextLayerGrid', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      const id = result.current.layers[1].id
      const colors: RGBColor[] = [red, blue]
      act(() => result.current.updateTextLayer(id, { text: 'AB', textFgColors: colors }))
      const textLayer = result.current.layers[1] as TextLayer
      expect(textLayer.textFgColors).toEqual([red, blue])
      // Grid should use per-char colors
      expect(textLayer.grid[0][0].fg).toEqual(red)
      expect(textLayer.grid[0][1].fg).toEqual(blue)
    })
  })

  describe('mergeDown', () => {
    it('merges upper layer into lower and removes upper', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const red: RGBColor = [255, 0, 0]
      // Paint on the top layer
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'X', fg: red, bg: [0, 0, 0] }))
      const topId = result.current.layers[1].id
      act(() => result.current.mergeDown(topId))
      expect(result.current.layers).toHaveLength(1)
      expect((result.current.layers[0] as DrawableLayer).grid[0][0].char).toBe('X')
    })

    it('switches active to merged layer when active was the upper layer', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const topId = result.current.layers[1].id
      const bottomId = result.current.layers[0].id
      // Active is the top layer (added most recently)
      expect(result.current.activeLayerId).toBe(topId)
      act(() => result.current.mergeDown(topId))
      expect(result.current.activeLayerId).toBe(bottomId)
    })

    it('is a no-op for the bottom layer', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const bottomId = result.current.layers[0].id
      act(() => result.current.mergeDown(bottomId))
      expect(result.current.layers).toHaveLength(2)
    })

    it('preserves active layer when merging a non-active layer', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      act(() => result.current.addLayer())
      // 3 layers: [0]=Background, [1]=Layer 2, [2]=Layer 3
      // Active is Layer 3 (last added)
      const activeId = result.current.layers[2].id
      const mergeId = result.current.layers[1].id
      // Switch active to layer 3 explicitly
      act(() => result.current.setActiveLayer(activeId))
      // Merge Layer 2 down into Background
      act(() => result.current.mergeDown(mergeId))
      expect(result.current.layers).toHaveLength(2)
      // Active should still be layer 3
      expect(result.current.activeLayerId).toBe(activeId)
    })
  })

  describe('applyToActiveLayer guard for text layers', () => {
    it('is a no-op when active layer is a text layer', () => {
      const { result } = renderHook(() => useLayerState())
      const red: RGBColor = [255, 0, 0]
      const bounds: Rect = { r0: 0, c0: 0, r1: 2, c1: 10 }
      act(() => result.current.addTextLayer('Text 1', bounds, red))
      // Active layer is now the text layer
      const textLayer = result.current.layers[1] as TextLayer
      const gridBefore = textLayer.grid[0][0]
      act(() => result.current.applyToActiveLayer(0, 0, { char: '#', fg: [255, 0, 0], bg: [0, 0, 0] }))
      // Should be unchanged — applyToActiveLayer no-ops for text layers
      expect((result.current.layers[1] as TextLayer).grid[0][0]).toEqual(gridBefore)
    })
  })

  describe('wrapInGroup', () => {
    it('wraps a root drawable layer in a new group', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const layerId = result.current.layers[1].id
      act(() => result.current.wrapInGroup(layerId))
      // Should now have 3 items: Background, Group, Layer 2 (as child)
      expect(result.current.layers).toHaveLength(3)
      const group = result.current.layers[1]
      expect(isGroupLayer(group)).toBe(true)
      expect(group.name).toBe('Group')
      const child = result.current.layers[2]
      expect(isDrawableLayer(child) && child.parentId).toBe(group.id)
    })

    it('wraps an already-grouped layer, creating nesting', () => {
      const group = createGroup('G', 'g1')
      const child = createLayer('Child', 'c1')
      child.parentId = 'g1'
      const initial: LayerState = { layers: [group, child], activeLayerId: 'c1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.wrapInGroup('c1'))
      // Should have 3 items: original group, new wrapper group (inheriting g1 parentId), child
      expect(result.current.layers).toHaveLength(3)
      const newGroup = result.current.layers[1]
      expect(isGroupLayer(newGroup)).toBe(true)
      if (isGroupLayer(newGroup)) {
        expect(newGroup.parentId).toBe('g1')
      }
      const updatedChild = result.current.layers[2]
      expect(isDrawableLayer(updatedChild) && updatedChild.parentId).toBe(newGroup.id)
    })

    it('wraps a group layer (creates nesting)', () => {
      const group = createGroup('G', 'g1')
      const child = createLayer('Child', 'c1')
      child.parentId = 'g1'
      const layer = createLayer('L', 'l1')
      const initial: LayerState = { layers: [group, child, layer], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.wrapInGroup('g1'))
      // Should have wrapper group, g1 (now as child), c1, l1
      const g1 = result.current.layers.find(l => l.id === 'g1')
      expect(g1 && isGroupLayer(g1) && g1.parentId).toBeTruthy()
    })
  })

  describe('removeFromGroup', () => {
    it('removes a layer from its parent group', () => {
      const group = createGroup('G', 'g1')
      const child = createLayer('Child', 'c1')
      child.parentId = 'g1'
      const initial: LayerState = { layers: [group, child], activeLayerId: 'c1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.removeFromGroup('c1'))
      const updated = result.current.layers.find(l => l.id === 'c1')
      expect(isDrawableLayer(updated!) && updated!.parentId).toBeFalsy()
    })

    it('is a no-op for a root layer (no parentId)', () => {
      const { result } = renderHook(() => useLayerState())
      const id = result.current.layers[0].id
      const layersBefore = result.current.layers
      act(() => result.current.removeFromGroup(id))
      expect(result.current.layers).toBe(layersBefore)
    })
  })

  describe('toggleGroupCollapsed', () => {
    it('toggles collapsed state of a group', () => {
      const group = createGroup('G', 'g1')
      const layer = createLayer('L', 'l1')
      const initial: LayerState = { layers: [group, layer], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      expect((result.current.layers[0] as GroupLayer).collapsed).toBe(false)
      act(() => result.current.toggleGroupCollapsed('g1'))
      expect((result.current.layers[0] as GroupLayer).collapsed).toBe(true)
      act(() => result.current.toggleGroupCollapsed('g1'))
      expect((result.current.layers[0] as GroupLayer).collapsed).toBe(false)
    })
  })

  describe('setActiveLayer with groups', () => {
    it('allows setting a group as active', () => {
      const group = createGroup('G', 'g1')
      const layer = createLayer('L', 'l1')
      const initial: LayerState = { layers: [group, layer], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.setActiveLayer('g1'))
      expect(result.current.activeLayerId).toBe('g1')
    })
  })

  describe('removeLayer with groups', () => {
    it('promotes children to root when removing a group', () => {
      const group = createGroup('G', 'g1')
      const child1 = createLayer('Child1', 'c1')
      child1.parentId = 'g1'
      const child2 = createLayer('Child2', 'c2')
      child2.parentId = 'g1'
      const initial: LayerState = { layers: [group, child1, child2], activeLayerId: 'c1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.removeLayer('g1'))
      // Group removed, children remain without parentId
      expect(result.current.layers).toHaveLength(2)
      expect(result.current.layers.every(l => isDrawableLayer(l) && !l.parentId)).toBe(true)
    })

    it('does not delete children when removing a group', () => {
      const group = createGroup('G', 'g1')
      const child = createLayer('Child', 'c1')
      child.parentId = 'g1'
      const initial: LayerState = { layers: [group, child], activeLayerId: 'c1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.removeLayer('g1'))
      expect(result.current.layers).toHaveLength(1)
      expect(result.current.layers[0].id).toBe('c1')
    })
  })

  describe('reorderLayer with targetGroupId', () => {
    it('moves a layer into a group when targetGroupId is provided', () => {
      const group = createGroup('G', 'g1')
      const root = createLayer('Root', 'r1')
      const initial: LayerState = { layers: [group, root], activeLayerId: 'r1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.reorderLayer('r1', 0, 'g1'))
      const moved = result.current.layers.find(l => l.id === 'r1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g1')
    })

    it('inserts at newIndex when within the target group child range', () => {
      const group = createGroup('G', 'g1')
      const a = createLayer('A', 'a'); a.parentId = 'g1'
      const b = createLayer('B', 'b'); b.parentId = 'g1'
      const root = createLayer('Root', 'r1')
      // Array: [group, a, b, root]
      const initial: LayerState = { layers: [group, a, b, root], activeLayerId: 'r1' }
      const { result } = renderHook(() => useLayerState(initial))
      // Move root into g1, newIndex=2 (between a and b in the group range [1..2])
      act(() => result.current.reorderLayer('r1', 2, 'g1'))
      // Should insert at position 2 (between a and b), not appended to end
      const ids = result.current.layers.map(l => l.id)
      expect(ids).toEqual(['g1', 'a', 'r1', 'b'])
      const moved = result.current.layers.find(l => l.id === 'r1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g1')
    })

    it('appends to end of group when newIndex is outside the group range', () => {
      const group = createGroup('G', 'g1')
      const a = createLayer('A', 'a'); a.parentId = 'g1'
      const b = createLayer('B', 'b'); b.parentId = 'g1'
      const root = createLayer('Root', 'r1')
      // Array: [group, a, b, root]
      const initial: LayerState = { layers: [group, a, b, root], activeLayerId: 'r1' }
      const { result } = renderHook(() => useLayerState(initial))
      // Move root into g1 with newIndex=0 (outside group range [1..2]) — like handleDropOnGroup
      act(() => result.current.reorderLayer('r1', 0, 'g1'))
      // Should append to end of group (after b)
      const ids = result.current.layers.map(l => l.id)
      expect(ids).toEqual(['g1', 'a', 'b', 'r1'])
      const moved = result.current.layers.find(l => l.id === 'r1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g1')
    })

    it('within-group reorder with targetGroupId preserves contiguity near group boundary', () => {
      const root1 = createLayer('Root1', 'r1')
      const group = createGroup('G', 'g1')
      const a = createLayer('A', 'a'); a.parentId = 'g1'
      const b = createLayer('B', 'b'); b.parentId = 'g1'
      const c = createLayer('C', 'c'); c.parentId = 'g1'
      const root2 = createLayer('Root2', 'r2')
      // Array: [r1, group, a, b, c, r2] — c is the last child before root2
      const initial: LayerState = { layers: [root1, group, a, b, c, root2], activeLayerId: 'a' }
      const { result } = renderHook(() => useLayerState(initial))
      // Move a to after c (insertIdx=5) using targetGroupId to stay within group
      act(() => result.current.reorderLayer('a', 5, 'g1'))
      const ids = result.current.layers.map(l => l.id)
      // a should be at the end of the group, BEFORE root2
      expect(ids).toEqual(['r1', 'g1', 'b', 'c', 'a', 'r2'])
      const moved = result.current.layers.find(l => l.id === 'a')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g1')
    })

    it('moves a layer to root when targetGroupId is null', () => {
      const group = createGroup('G', 'g1')
      const child = createLayer('Child', 'c1')
      child.parentId = 'g1'
      const initial: LayerState = { layers: [group, child], activeLayerId: 'c1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.reorderLayer('c1', 0, null))
      const moved = result.current.layers.find(l => l.id === 'c1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBeFalsy()
    })
  })

  describe('mergeDown with groups', () => {
    it('is a no-op when adjacent layer is a group', () => {
      const group = createGroup('G', 'g1')
      const layer = createLayer('L', 'l1')
      const initial: LayerState = { layers: [group, layer], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.mergeDown('l1'))
      // Should still have 2 layers — merge was blocked
      expect(result.current.layers).toHaveLength(2)
    })
  })

  describe('removeLayer with nested groups', () => {
    it('promotes children to the deleted group parentId (not root)', () => {
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const leaf = createLayer('Leaf', 'l1')
      leaf.parentId = 'g-inner'
      const initial: LayerState = { layers: [outer, inner, leaf], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.removeLayer('g-inner'))
      // Inner group removed; leaf promoted to outer group
      expect(result.current.layers).toHaveLength(2)
      const updatedLeaf = result.current.layers.find(l => l.id === 'l1')
      expect(isDrawableLayer(updatedLeaf!) && updatedLeaf!.parentId).toBe('g-outer')
    })

    it('promotes nested sub-groups to the deleted group parentId', () => {
      const outer = createGroup('Outer', 'g-outer')
      const middle: GroupLayer = { ...createGroup('Middle', 'g-mid'), parentId: 'g-outer' }
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-mid' }
      const leaf = createLayer('Leaf', 'l1')
      leaf.parentId = 'g-inner'
      const initial: LayerState = { layers: [outer, middle, inner, leaf], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.removeLayer('g-mid'))
      // Middle removed; inner promoted to outer
      const updatedInner = result.current.layers.find(l => l.id === 'g-inner')
      expect(updatedInner && isGroupLayer(updatedInner) && updatedInner.parentId).toBe('g-outer')
    })
  })

  describe('removeFromGroup with groups', () => {
    it('moves a group and its descendants out', () => {
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const leaf = createLayer('Leaf', 'l1')
      leaf.parentId = 'g-inner'
      const initial: LayerState = { layers: [outer, inner, leaf], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.removeFromGroup('g-inner'))
      const updatedInner = result.current.layers.find(l => l.id === 'g-inner')
      // Inner's parentId should be cleared
      expect(updatedInner && isGroupLayer(updatedInner) && updatedInner.parentId).toBeFalsy()
      // Leaf's parentId should still be g-inner (unchanged)
      const updatedLeaf = result.current.layers.find(l => l.id === 'l1')
      expect(isDrawableLayer(updatedLeaf!) && updatedLeaf!.parentId).toBe('g-inner')
    })
  })

  describe('reorderLayer with nested groups', () => {
    it('allows moving a group into another group', () => {
      const g1 = createGroup('G1', 'g1')
      const g2 = createGroup('G2', 'g2')
      const layer = createLayer('L', 'l1')
      const initial: LayerState = { layers: [g1, g2, layer], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      act(() => result.current.reorderLayer('g2', 0, 'g1'))
      const movedG2 = result.current.layers.find(l => l.id === 'g2')
      expect(movedG2 && isGroupLayer(movedG2) && movedG2.parentId).toBe('g1')
    })

    it('prevents circular nesting (moving group into its own descendant)', () => {
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const leaf = createLayer('Leaf', 'l1')
      leaf.parentId = 'g-inner'
      const initial: LayerState = { layers: [outer, inner, leaf], activeLayerId: 'l1' }
      const { result } = renderHook(() => useLayerState(initial))
      const layersBefore = result.current.layers
      // Try to move outer into inner — this would create a cycle
      act(() => result.current.reorderLayer('g-outer', 0, 'g-inner'))
      expect(result.current.layers).toBe(layersBefore)
    })

    it('move into outer group appends after full nested block', () => {
      const outer = createGroup('Outer', 'g-outer')
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const innerChild = createLayer('InnerChild', 'ic')
      innerChild.parentId = 'g-inner'
      const root = createLayer('Root', 'r1')
      // Array: [outer, inner, innerChild, root]
      const initial: LayerState = { layers: [outer, inner, innerChild, root], activeLayerId: 'r1' }
      const { result } = renderHook(() => useLayerState(initial))
      // Drop root onto outer group (newIndex=0, outside range → append)
      act(() => result.current.reorderLayer('r1', 0, 'g-outer'))
      const ids = result.current.layers.map(l => l.id)
      // root should be after innerChild (end of outer's full nested block)
      expect(ids).toEqual(['g-outer', 'g-inner', 'ic', 'r1'])
      const moved = result.current.layers.find(l => l.id === 'r1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g-outer')
    })

    it('within-group reorder in outer group respects nested block boundary', () => {
      const outer = createGroup('Outer', 'g-outer')
      const direct = createLayer('Direct', 'd1')
      direct.parentId = 'g-outer'
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const innerChild = createLayer('InnerChild', 'ic')
      innerChild.parentId = 'g-inner'
      const root = createLayer('Root', 'r1')
      // Array: [outer, direct, inner, innerChild, root]
      const initial: LayerState = { layers: [outer, direct, inner, innerChild, root], activeLayerId: 'd1' }
      const { result } = renderHook(() => useLayerState(initial))
      // Move direct to end of outer group (insertIdx=5, within-group with targetGroupId)
      act(() => result.current.reorderLayer('d1', 5, 'g-outer'))
      const ids = result.current.layers.map(l => l.id)
      // direct should move to end of outer block, BEFORE root
      expect(ids).toEqual(['g-outer', 'g-inner', 'ic', 'd1', 'r1'])
      const moved = result.current.layers.find(l => l.id === 'd1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g-outer')
    })

    it('within-group reorder does not split a nested sub-group block', () => {
      const outer = createGroup('Outer', 'g-outer')
      const direct = createLayer('Direct', 'd1')
      direct.parentId = 'g-outer'
      const inner: GroupLayer = { ...createGroup('Inner', 'g-inner'), parentId: 'g-outer' }
      const innerChild = createLayer('InnerChild', 'ic')
      innerChild.parentId = 'g-inner'
      const root = createLayer('Root', 'r1')
      // Array: [outer, direct, inner, innerChild, root]
      // indices:  0       1      2       3          4
      const initial: LayerState = { layers: [outer, direct, inner, innerChild, root], activeLayerId: 'd1' }
      const { result } = renderHook(() => useLayerState(initial))
      // Move direct with insertIdx=3 (between inner and innerChild in the original array).
      // After removing direct: [outer, inner, innerChild, root] (indices 0,1,2,3)
      // adjusted = 3 - 1 = 2, which is between inner(1) and innerChild(2)
      // This would split inner's block. It should snap past to index 3 instead.
      act(() => result.current.reorderLayer('d1', 3, 'g-outer'))
      const ids = result.current.layers.map(l => l.id)
      // direct should land AFTER innerChild, not between inner and innerChild
      expect(ids).toEqual(['g-outer', 'g-inner', 'ic', 'd1', 'r1'])
      const moved = result.current.layers.find(l => l.id === 'd1')
      expect(isDrawableLayer(moved!) && moved!.parentId).toBe('g-outer')
    })

    it('moves group block with all recursive descendants', () => {
      const g1 = createGroup('G1', 'g1')
      const child = createLayer('Child', 'c1')
      child.parentId = 'g1'
      const bottom = createLayer('Bottom', 'b1')
      const initial: LayerState = { layers: [bottom, g1, child], activeLayerId: 'c1' }
      const { result } = renderHook(() => useLayerState(initial))
      // Move g1 block to index 0
      act(() => result.current.reorderLayer('g1', 0))
      expect(result.current.layers[0].id).toBe('g1')
      expect(result.current.layers[1].id).toBe('c1')
      expect(result.current.layers[2].id).toBe('b1')
    })
  })

  describe('applyMoveGrids', () => {
    it('batch-updates multiple layer grids', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const l1 = result.current.layers[0] as DrawableLayer
      const l2 = result.current.layers[1] as DrawableLayer
      const red: RGBColor = [255, 0, 0]
      const blue: RGBColor = [0, 0, 255]
      // Create modified grids
      const grid1 = l1.grid.map(row => row.map(c => ({ ...c })))
      grid1[0][0] = { char: 'A', fg: red, bg: [0, 0, 0] }
      const grid2 = l2.grid.map(row => row.map(c => ({ ...c })))
      grid2[0][0] = { char: 'B', fg: blue, bg: [0, 0, 0] }
      const updates = new Map<string, typeof grid1>()
      updates.set(l1.id, grid1)
      updates.set(l2.id, grid2)
      act(() => result.current.applyMoveGrids(updates))
      expect((result.current.layers[0] as DrawableLayer).grid[0][0].char).toBe('A')
      expect((result.current.layers[1] as DrawableLayer).grid[0][0].char).toBe('B')
    })
  })

  describe('frame operations', () => {
    it('addFrame appends an empty frame and switches to it', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addFrame())
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.frames).toHaveLength(2)
      expect(layer.currentFrameIndex).toBe(1)
      expect(layer.grid).toBe(layer.frames[1])
    })

    it('duplicateFrame clones the current frame and inserts after', () => {
      const { result } = renderHook(() => useLayerState())
      // Paint something on frame 0
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'X', fg: [255, 0, 0], bg: [0, 0, 0] }))
      act(() => result.current.duplicateFrame())
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.frames).toHaveLength(2)
      expect(layer.currentFrameIndex).toBe(1)
      // Content should be duplicated
      expect(layer.frames[1][0][0].char).toBe('X')
      // But it should be a deep copy
      expect(layer.frames[1]).not.toBe(layer.frames[0])
    })

    it('removeFrame removes the current frame', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addFrame())
      act(() => result.current.addFrame())
      // Now 3 frames, on frame 2
      act(() => result.current.setCurrentFrame(1))
      act(() => result.current.removeFrame())
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.frames).toHaveLength(2)
      expect(layer.currentFrameIndex).toBe(1)
    })

    it('removeFrame is no-op when only one frame', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.removeFrame())
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.frames).toHaveLength(1)
    })

    it('setCurrentFrame switches grid alias', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addFrame())
      act(() => result.current.setCurrentFrame(0))
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.currentFrameIndex).toBe(0)
      expect(layer.grid).toBe(layer.frames[0])
    })

    it('setCurrentFrame clamps out-of-range index', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addFrame())
      act(() => result.current.setCurrentFrame(99))
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.currentFrameIndex).toBe(1)
    })

    it('reorderFrame moves frame and adjusts currentFrameIndex', () => {
      const { result } = renderHook(() => useLayerState())
      // Add 3 frames total
      act(() => result.current.addFrame()) // frame 1
      act(() => result.current.addFrame()) // frame 2
      // Paint unique marker on frame 0
      act(() => result.current.setCurrentFrame(0))
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'A', fg: [255, 0, 0], bg: [0, 0, 0] }))
      // Move frame 0 to position 2
      act(() => result.current.reorderFrame(0, 2))
      const layer = result.current.layers[0] as DrawnLayer
      expect(layer.frames).toHaveLength(3)
      // The frame with 'A' should now be at index 2
      expect(layer.frames[2][0][0].char).toBe('A')
      expect(layer.currentFrameIndex).toBe(2)
    })

    it('setFrameDuration clamps to valid range', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.setFrameDuration(5))
      expect((result.current.layers[0] as DrawnLayer).frameDurationMs).toBe(MIN_FRAME_DURATION_MS)
      act(() => result.current.setFrameDuration(99999))
      expect((result.current.layers[0] as DrawnLayer).frameDurationMs).toBe(MAX_FRAME_DURATION_MS)
      act(() => result.current.setFrameDuration(250))
      expect((result.current.layers[0] as DrawnLayer).frameDurationMs).toBe(250)
    })

    it('drawing on one frame does not affect others', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addFrame())
      // Paint on frame 1
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'Z', fg: [0, 255, 0], bg: [0, 0, 0] }))
      // Switch to frame 0
      act(() => result.current.setCurrentFrame(0))
      const layer = result.current.layers[0] as DrawnLayer
      // Frame 0 should be untouched
      expect(layer.grid[0][0].char).toBe(' ')
      // Frame 1 should have the paint
      expect(layer.frames[1][0][0].char).toBe('Z')
    })
  })
})
