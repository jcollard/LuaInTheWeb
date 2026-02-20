import { useState, useCallback, useRef } from 'react'
import type { AnsiCell, AnsiGrid, DrawableLayer, Layer, LayerState, RGBColor, Rect, TextAlign, TextLayer } from './types'
import { isGroupLayer, isDrawableLayer, getParentId } from './types'
import { createLayer, createGroup, cloneLayerState, syncLayerIds, mergeLayerDown, getGroupDescendantIds, isAncestorOf } from './layerUtils'
import { replaceColorsInGrid } from './colorUtils'
import { renderTextLayerGrid } from './textLayerGrid'

export interface UseLayerStateReturn {
  layers: Layer[]
  activeLayerId: string
  layersRef: React.RefObject<Layer[]>
  activeLayerIdRef: React.RefObject<string>
  activeLayer: Layer
  addLayer: () => void
  addLayerWithGrid: (name: string, grid: AnsiGrid) => void
  addTextLayer: (name: string, bounds: Rect, textFg: RGBColor) => void
  updateTextLayer: (id: string, updates: { text?: string; bounds?: Rect; textFg?: RGBColor; textFgColors?: RGBColor[]; textAlign?: TextAlign }) => void
  removeLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setActiveLayer: (id: string) => void
  reorderLayer: (id: string, newIndex: number, targetGroupId?: string | null) => void
  toggleVisibility: (id: string) => void
  applyToActiveLayer: (row: number, col: number, cell: AnsiCell) => void
  getActiveGrid: () => AnsiGrid
  mergeDown: (id: string) => void
  replaceColors: (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => void
  getLayerState: () => LayerState
  restoreLayerState: (state: LayerState) => void
  wrapInGroup: (layerId: string) => void
  removeFromGroup: (layerId: string) => void
  toggleGroupCollapsed: (groupId: string) => void
  applyMoveGrids: (layerGrids: Map<string, AnsiGrid>) => void
}

export function useLayerState(initial?: LayerState): UseLayerStateReturn {
  const [layers, setLayers] = useState<Layer[]>(() => {
    if (initial) {
      syncLayerIds(initial.layers)
      return initial.layers
    }
    return [createLayer('Background')]
  })
  const [activeLayerId, setActiveLayerId] = useState<string>(() => {
    if (initial) return initial.activeLayerId
    return layers[0].id
  })

  const layersRef = useRef(layers)
  layersRef.current = layers
  const activeLayerIdRef = useRef(activeLayerId)
  activeLayerIdRef.current = activeLayerId
  const layerCountRef = useRef(initial ? initial.layers.length : 1)

  const activeLayer = layers.find(l => l.id === activeLayerId) ?? layers.find(isDrawableLayer) ?? layers[0]

  const addLayer = useCallback(() => {
    layerCountRef.current++
    const layer = createLayer(`Layer ${layerCountRef.current}`)
    setLayers(prev => [...prev, layer])
    setActiveLayerId(layer.id)
  }, [])

  const addLayerWithGrid = useCallback((name: string, grid: AnsiGrid) => {
    layerCountRef.current++
    const layer = createLayer(`Layer ${layerCountRef.current}`)
    layer.name = name
    layer.grid = grid
    setLayers(prev => [...prev, layer])
    setActiveLayerId(layer.id)
  }, [])

  const addTextLayer = useCallback((name: string, bounds: Rect, textFg: RGBColor) => {
    layerCountRef.current++
    const base = createLayer(name)
    const textLayer: TextLayer = {
      ...base,
      type: 'text',
      text: '',
      bounds,
      textFg,
      textFgColors: [],
      grid: renderTextLayerGrid('', bounds, textFg),
    }
    const newLayers = [...layersRef.current, textLayer]
    layersRef.current = newLayers
    activeLayerIdRef.current = textLayer.id
    setLayers(newLayers)
    setActiveLayerId(textLayer.id)
  }, [])

  const updateTextLayer = useCallback((id: string, updates: { text?: string; bounds?: Rect; textFg?: RGBColor; textFgColors?: RGBColor[]; textAlign?: TextAlign }) => {
    const newLayers = layersRef.current.map(l => {
      if (l.id !== id || l.type !== 'text') return l
      const updated: TextLayer = {
        ...l,
        text: updates.text ?? l.text,
        bounds: updates.bounds ?? l.bounds,
        textFg: updates.textFg ?? l.textFg,
        textFgColors: updates.textFgColors !== undefined ? updates.textFgColors : l.textFgColors,
        textAlign: updates.textAlign !== undefined ? updates.textAlign : l.textAlign,
      }
      updated.grid = renderTextLayerGrid(updated.text, updated.bounds, updated.textFg, updated.textFgColors, updated.textAlign)
      return updated
    })
    layersRef.current = newLayers
    setLayers(newLayers)
  }, [layersRef])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const target = prev.find(l => l.id === id)
      if (!target) return prev

      if (isGroupLayer(target)) {
        // Promote children (drawables and sub-groups) to the deleted group's parentId
        const promotedParentId = target.parentId
        const next = prev.filter(l => l.id !== id).map(l => {
          if (isDrawableLayer(l) && l.parentId === id) {
            return { ...l, parentId: promotedParentId }
          }
          if (isGroupLayer(l) && l.parentId === id) {
            return { ...l, parentId: promotedParentId }
          }
          return l
        })
        // Don't allow deleting if it would leave no drawable layers
        if (next.filter(isDrawableLayer).length === 0) return prev
        return next
      }

      // For drawable layers, guard against deleting the last one
      const drawableCount = prev.filter(isDrawableLayer).length
      if (drawableCount <= 1 && isDrawableLayer(target)) return prev

      const next = prev.filter(l => l.id !== id)
      setActiveLayerId(prevActive => {
        if (prevActive === id) {
          const lastDrawable = [...next].reverse().find(isDrawableLayer)
          return lastDrawable ? lastDrawable.id : next[next.length - 1].id
        }
        return prevActive
      })
      return next
    })
  }, [])

  const renameLayer = useCallback((id: string, name: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, name } : l))
  }, [])

  const setActiveLayer = useCallback((id: string) => {
    activeLayerIdRef.current = id
    setActiveLayerId(id)
  }, [])

  const reorderLayer = useCallback((id: string, newIndex: number, targetGroupId?: string | null) => {
    setLayers(prev => {
      const currentIndex = prev.findIndex(l => l.id === id)
      if (currentIndex < 0) return prev

      const layer = prev[currentIndex]

      // If dragging a group, move entire block (group + ALL recursive descendants)
      if (isGroupLayer(layer) && targetGroupId === undefined) {
        const descendantIds = getGroupDescendantIds(layer.id, prev)
        const blockIds = new Set([layer.id, ...descendantIds])
        const block = prev.filter(l => blockIds.has(l.id))
        const rest = prev.filter(l => !blockIds.has(l.id))
        // Clamp target in the remaining array
        const restIndex = rest.findIndex(l => l.id === prev[newIndex]?.id)
        const target = Math.max(0, Math.min(rest.length, restIndex >= 0 ? restIndex : (newIndex > currentIndex ? rest.length : 0)))
        rest.splice(target, 0, ...block)
        return rest
      }

      // Handle targetGroupId for moving in/out of groups
      if (targetGroupId !== undefined) {
        if (targetGroupId === null) {
          // Move to root — clear parentId
          if (isGroupLayer(layer)) {
            // Moving a group block to root
            const descendantIds = getGroupDescendantIds(layer.id, prev)
            const blockIds = new Set([layer.id, ...descendantIds])
            const block = prev.filter(l => blockIds.has(l.id))
            const rest = prev.filter(l => !blockIds.has(l.id))
            const updatedBlock = block.map(l => {
              if (l.id === id && isGroupLayer(l)) return { ...l, parentId: undefined }
              return l
            })
            const clamped = Math.max(0, Math.min(rest.length, newIndex))
            rest.splice(clamped, 0, ...updatedBlock)
            return rest
          }
          const next = [...prev]
          const [removed] = next.splice(currentIndex, 1)
          const updated = isDrawableLayer(removed) ? { ...removed, parentId: undefined } : removed
          const clamped = Math.max(0, Math.min(next.length, newIndex))
          next.splice(clamped, 0, updated)
          return next
        }

        // Move into group — set parentId, insert after group's last child
        // Check for circular nesting: prevent moving a group into its own descendant
        if (isAncestorOf(targetGroupId, id, prev)) return prev
        // Also prevent moving into self
        if (id === targetGroupId) return prev

        const groupIdx = prev.findIndex(l => l.id === targetGroupId)
        if (groupIdx < 0) return prev
        const group = prev[groupIdx]
        if (!isGroupLayer(group)) return prev

        if (isGroupLayer(layer)) {
          // Moving a group into another group
          const descendantIds = getGroupDescendantIds(layer.id, prev)
          const blockIds = new Set([layer.id, ...descendantIds])
          const block = prev.filter(l => blockIds.has(l.id))
          const rest = prev.filter(l => !blockIds.has(l.id))
          const updatedBlock = block.map(l => {
            if (l.id === id && isGroupLayer(l)) return { ...l, parentId: targetGroupId }
            return l
          })
          // Find insert position after group's last child in rest
          const gIdx = rest.findIndex(l => l.id === targetGroupId)
          let insertIdx = gIdx + 1
          for (let i = gIdx + 1; i < rest.length; i++) {
            const child = rest[i]
            const pid = getParentId(child)
            if (pid === targetGroupId) insertIdx = i + 1
            else break
          }
          rest.splice(insertIdx, 0, ...updatedBlock)
          return rest
        }

        if (!isDrawableLayer(layer)) return prev
        const next = [...prev]
        const [removed] = next.splice(currentIndex, 1)
        const gIdx = next.findIndex(l => l.id === targetGroupId)
        let insertIdx = gIdx + 1
        for (let i = gIdx + 1; i < next.length; i++) {
          const child = next[i]
          const pid = getParentId(child)
          if (pid === targetGroupId) insertIdx = i + 1
          else break
        }
        next.splice(insertIdx, 0, { ...removed, parentId: targetGroupId })
        return next
      }

      // Simple reorder (no group change)
      const clamped = Math.max(0, Math.min(prev.length - 1, newIndex))
      if (currentIndex === clamped) return prev
      const next = [...prev]
      const [removed] = next.splice(currentIndex, 1)
      next.splice(clamped, 0, removed)
      return next
    })
  }, [])

  const toggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])

  const mergeDown = useCallback((id: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx <= 0) return prev
      // mergeLayerDown already returns null if either layer is a group
      const result = mergeLayerDown(prev, id)
      if (!result) return prev
      setActiveLayerId(prevActive => prevActive === id ? prev[idx - 1].id : prevActive)
      return result
    })
  }, [])

  const wrapInGroup = useCallback((layerId: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === layerId)
      if (idx < 0) return prev
      const layer = prev[idx]
      const group = createGroup('Group')
      // Inherit parentId from the wrapped layer (for nesting)
      const existingParentId = getParentId(layer)
      if (existingParentId) {
        group.parentId = existingParentId
      }
      const next = [...prev]
      next.splice(idx, 1, group, { ...layer, parentId: group.id })
      return next
    })
  }, [])

  const removeFromGroup = useCallback((layerId: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === layerId)
      if (idx < 0) return prev
      const layer = prev[idx]
      // Get parentId from either drawable or group layer
      const parentId = getParentId(layer)
      if (!parentId) return prev
      const groupId = parentId

      if (isGroupLayer(layer)) {
        // Moving a group out: collect the group + its entire descendant block
        const descendantIds = getGroupDescendantIds(layerId, prev)
        const blockIds = new Set([layerId, ...descendantIds])
        // Find the parent group's block end
        const parentGroupIdx = prev.findIndex(l => l.id === groupId)
        if (parentGroupIdx < 0) return prev

        // Remove the entire block from prev
        const block = prev.filter(l => blockIds.has(l.id))
        const rest = prev.filter(l => !blockIds.has(l.id))

        // Clear only the group's own parentId; descendant parentIds stay unchanged
        const updatedBlock = block.map(l => {
          if (l.id === layerId && isGroupLayer(l)) return { ...l, parentId: undefined }
          return l
        })

        // Find where parent group's block ends in rest
        const parentIdxInRest = rest.findIndex(l => l.id === groupId)
        let insertIdx = parentIdxInRest + 1
        for (let i = parentIdxInRest + 1; i < rest.length; i++) {
          const child = rest[i]
          const pid = getParentId(child)
          if (pid === groupId) insertIdx = i + 1
          else break
        }
        rest.splice(insertIdx, 0, ...updatedBlock)
        return rest
      }

      if (!isDrawableLayer(layer)) return prev

      // Find the group's block end
      const groupIdx = prev.findIndex(l => l.id === groupId)
      if (groupIdx < 0) return prev
      let groupEnd = groupIdx
      for (let i = groupIdx + 1; i < prev.length; i++) {
        const child = prev[i]
        const pid = getParentId(child)
        if (pid === groupId) groupEnd = i
        else break
      }
      // Remove from current position, clear parentId, insert after group's last child
      const next = prev.filter(l => l.id !== layerId)
      // groupEnd might have shifted by 1 if the layer was before groupEnd
      const insertIdx = idx <= groupEnd ? groupEnd : groupEnd + 1
      next.splice(insertIdx, 0, { ...layer, parentId: undefined })
      return next
    })
  }, [])

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setLayers(prev => prev.map(l =>
      isGroupLayer(l) && l.id === groupId ? { ...l, collapsed: !l.collapsed } : l
    ))
  }, [])

  const applyMoveGrids = useCallback((layerGrids: Map<string, AnsiGrid>) => {
    const newLayers = layersRef.current.map(l => {
      if (!isDrawableLayer(l)) return l
      const newGrid = layerGrids.get(l.id)
      if (!newGrid) return l
      return { ...l, grid: newGrid }
    })
    layersRef.current = newLayers
    setLayers(newLayers)
  }, [layersRef])

  const applyToActiveLayer = useCallback((row: number, col: number, cell: AnsiCell) => {
    const activeId = activeLayerIdRef.current
    const active = layersRef.current.find(l => l.id === activeId)
    if (!active || !isDrawableLayer(active)) return // no-op for text/group layers
    if (active.type === 'text') return
    const newLayers = layersRef.current.map(l => {
      if (l.id !== activeId || !isDrawableLayer(l)) return l
      const newRow = [...l.grid[row]]
      newRow[col] = { ...cell, fg: [...cell.fg] as RGBColor, bg: [...cell.bg] as RGBColor }
      const newGrid = [...l.grid]
      newGrid[row] = newRow
      return { ...l, grid: newGrid }
    })
    layersRef.current = newLayers // sync update for compositing in same handler
    setLayers(newLayers)
  }, [])

  const replaceColors = useCallback((mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => {
    const activeId = activeLayerIdRef.current
    const newLayers = layersRef.current.map(l => {
      if (!isDrawableLayer(l)) return l
      if (scope === 'layer' && l.id !== activeId) return l
      return { ...l, grid: replaceColorsInGrid(l.grid, mapping) }
    })
    layersRef.current = newLayers
    setLayers(newLayers)
  }, [])

  const getActiveGrid = useCallback((): AnsiGrid => {
    const activeId = activeLayerIdRef.current
    const layer = layersRef.current.find(l => l.id === activeId)
    if (layer && isDrawableLayer(layer)) return layer.grid
    const firstDrawable = layersRef.current.find(isDrawableLayer)
    return firstDrawable ? firstDrawable.grid : (layersRef.current[0] as DrawableLayer).grid
  }, [])

  const getLayerState = useCallback((): LayerState => {
    return cloneLayerState({ layers: layersRef.current, activeLayerId: activeLayerIdRef.current })
  }, [])

  const restoreLayerState = useCallback((state: LayerState) => {
    syncLayerIds(state.layers)
    layersRef.current = state.layers
    activeLayerIdRef.current = state.activeLayerId
    setLayers(state.layers)
    setActiveLayerId(state.activeLayerId)
  }, [])

  return {
    layers,
    activeLayerId,
    layersRef,
    activeLayerIdRef,
    activeLayer,
    addLayer,
    addLayerWithGrid,
    addTextLayer,
    updateTextLayer,
    removeLayer,
    renameLayer,
    setActiveLayer,
    reorderLayer,
    toggleVisibility,
    mergeDown,
    applyToActiveLayer,
    replaceColors,
    getActiveGrid,
    getLayerState,
    restoreLayerState,
    wrapInGroup,
    removeFromGroup,
    toggleGroupCollapsed,
    applyMoveGrids,
  }
}
