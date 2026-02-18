import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLayerState } from './useLayerState'
import { createLayer } from './layerUtils'
import type { LayerState, RGBColor } from './types'

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
  })

  describe('moveLayerUp / moveLayerDown', () => {
    it('moveLayerUp moves a layer higher in the stack', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const bottomId = result.current.layers[0].id
      act(() => result.current.moveLayerUp(bottomId))
      expect(result.current.layers[1].id).toBe(bottomId)
    })

    it('moveLayerDown moves a layer lower in the stack', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const topId = result.current.layers[1].id
      act(() => result.current.moveLayerDown(topId))
      expect(result.current.layers[0].id).toBe(topId)
    })

    it('moveLayerUp on topmost layer is a no-op', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const topId = result.current.layers[1].id
      act(() => result.current.moveLayerUp(topId))
      expect(result.current.layers[1].id).toBe(topId)
    })

    it('moveLayerDown on bottom layer is a no-op', () => {
      const { result } = renderHook(() => useLayerState())
      act(() => result.current.addLayer())
      const bottomId = result.current.layers[0].id
      act(() => result.current.moveLayerDown(bottomId))
      expect(result.current.layers[0].id).toBe(bottomId)
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
})
