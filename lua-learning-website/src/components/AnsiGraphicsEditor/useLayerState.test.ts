import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayerState } from './useLayerState'
import { createLayer } from './layerUtils'
import type { LayerState, RGBColor, Rect, TextLayer } from './types'
import { TRANSPARENT_BG } from './types'

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
      expect(result.current.activeLayer.grid[0][0].char).toBe('#')
      expect(result.current.activeLayer.grid[0][0].fg).toEqual(red)
    })

    it('only modifies the active layer, not other layers', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      // Active layer is now layer 2
      act(() => result.current.applyToActiveLayer(0, 0, { char: 'X', fg: [255, 0, 0], bg: [0, 0, 0] }))
      expect(result.current.layers[0].grid[0][0].char).toBe(' ')
      expect(result.current.layers[1].grid[0][0].char).toBe('X')
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
      expect(result.current.layers[1].grid[5][5].char).toBe('X')
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
      expect(result.current.layers[0].grid[0][0].char).toBe('X')
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
      expect(result.current.layers[1].grid[0][0]).toEqual(gridBefore)
    })
  })
})
