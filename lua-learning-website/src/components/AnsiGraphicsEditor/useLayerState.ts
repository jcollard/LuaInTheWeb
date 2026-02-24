import { useState, useCallback, useRef } from 'react'
import type { AnsiCell, AnsiGrid, DrawableLayer, DrawnLayer, Layer, LayerState, RGBColor, Rect, TextAlign, TextLayer } from './types'
import { MIN_FRAME_DURATION_MS, MAX_FRAME_DURATION_MS, isGroupLayer, isDrawableLayer, getParentId } from './types'
import { createLayer, createGroup, cloneLayerState, mergeLayerDown, isAncestorOf, findGroupBlockEnd, snapPastSubBlocks, extractGroupBlock, assertContiguousBlocks, findSafeInsertPos, duplicateLayerBlock, addTagToLayer as addTagToLayerUtil, removeTagFromLayer as removeTagFromLayerUtil } from './layerUtils'
import { createEmptyGrid, cloneGrid } from './gridUtils'
import { replaceColorsInGrid } from './colorUtils'
import { renderTextLayerGrid } from './textLayerGrid'

/** Return a new DrawnLayer with its current frame replaced by newGrid, keeping frames in sync. */
function withUpdatedFrame(layer: DrawnLayer, newGrid: AnsiGrid): DrawnLayer {
  const newFrames = [...layer.frames]
  newFrames[layer.currentFrameIndex] = newGrid
  return { ...layer, grid: newGrid, frames: newFrames }
}

/** Replace ALL frames of a DrawnLayer, keeping currentFrameIndex pointing to the right grid. */
function withUpdatedAllFrames(layer: DrawnLayer, newFrames: AnsiGrid[]): DrawnLayer {
  return { ...layer, grid: newFrames[layer.currentFrameIndex], frames: newFrames }
}

/** Compute the clamped insertion position within a group's contiguous block. */
function computeGroupInsertPos(
  layers: Layer[], targetGroupId: string, rawNewIndex: number, sourceIndex: number,
): number {
  const gIdx = layers.findIndex(l => l.id === targetGroupId)
  const rangeEnd = findGroupBlockEnd(layers, targetGroupId, gIdx)
  const adjusted = rawNewIndex > sourceIndex ? rawNewIndex - 1 : rawNewIndex
  const rawInsert = (adjusted >= gIdx + 1 && adjusted <= rangeEnd) ? adjusted : rangeEnd
  return snapPastSubBlocks(layers, rawInsert, gIdx, rangeEnd)
}

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
  changeLayerId: (oldId: string, newId: string) => { success: boolean; error?: string }
  setActiveLayer: (id: string) => void
  reorderLayer: (id: string, newIndex: number, targetGroupId?: string | null) => void
  toggleVisibility: (id: string) => void
  setLayerVisibility: (ids: string[], visible: boolean) => void
  applyToActiveLayer: (row: number, col: number, cell: AnsiCell) => void
  getActiveGrid: () => AnsiGrid
  mergeDown: (id: string) => void
  replaceColors: (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => void
  getLayerState: () => LayerState
  restoreLayerState: (state: LayerState) => void
  wrapInGroup: (layerId: string) => void
  removeFromGroup: (layerId: string) => void
  toggleGroupCollapsed: (groupId: string) => void
  duplicateLayer: (id: string) => void
  applyMoveGrids: (layerFrames: Map<string, AnsiGrid[]>) => void
  applyMoveGridsImmediate: (layerFrames: Map<string, AnsiGrid[]>) => void
  applyLayerTransform: (transform: (layer: Layer) => Layer) => void
  addFrame: () => void
  duplicateFrame: () => void
  removeFrame: () => void
  setCurrentFrame: (index: number) => void
  reorderFrame: (from: number, to: number) => void
  setFrameDuration: (ms: number) => void
  availableTags: string[]
  availableTagsRef: React.RefObject<string[]>
  addTagToLayer: (layerId: string, tag: string) => void
  removeTagFromLayer: (layerId: string, tag: string) => void
  createTag: (tag: string) => void
  deleteTag: (tag: string) => void
  renameTag: (oldTag: string, newTag: string) => void
}

export function useLayerState(initial?: LayerState): UseLayerStateReturn {
  const [layers, setLayers] = useState<Layer[]>(() => {
    if (initial) {
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

  const [availableTags, setAvailableTags] = useState<string[]>(() => initial?.availableTags ?? [])
  const availableTagsRef = useRef(availableTags)
  availableTagsRef.current = availableTags

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
    layer.frames = [grid]
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
    layersRef.current = [...layersRef.current, textLayer]
    activeLayerIdRef.current = textLayer.id
    setLayers(prev => [...prev, textLayer])
    setActiveLayerId(textLayer.id)
  }, [])

  const updateTextLayer = useCallback((id: string, updates: { text?: string; bounds?: Rect; textFg?: RGBColor; textFgColors?: RGBColor[]; textAlign?: TextAlign }) => {
    const mapLayer = (l: Layer): Layer => {
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
    }
    layersRef.current = layersRef.current.map(mapLayer)
    setLayers(prev => prev.map(mapLayer))
  }, [])

  const removeLayer = useCallback((id: string) => {
    setLayers(prev => {
      const target = prev.find(l => l.id === id)
      if (!target) return prev

      if (isGroupLayer(target)) {
        // Promote children (drawables and sub-groups) to the deleted group's parentId
        const promotedParentId = target.parentId
        const next = prev.filter(l => l.id !== id).map(l => {
          if (getParentId(l) === id) return { ...l, parentId: promotedParentId }
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

  const changeLayerId = useCallback((oldId: string, newId: string): { success: boolean; error?: string } => {
    const trimmed = newId.trim()
    if (trimmed.length === 0) return { success: false, error: 'ID cannot be empty' }
    if (oldId === trimmed) return { success: true }

    const currentLayers = layersRef.current
    const target = currentLayers.find(l => l.id === oldId)
    if (!target) return { success: false, error: 'Layer not found' }
    if (currentLayers.some(l => l.id === trimmed)) return { success: false, error: 'Duplicate ID already exists' }

    const newLayers = currentLayers.map(l => {
      if (l.id === oldId) return { ...l, id: trimmed }
      if (getParentId(l) === oldId) return { ...l, parentId: trimmed }
      return l
    })
    layersRef.current = newLayers
    setLayers(newLayers)

    if (activeLayerIdRef.current === oldId) {
      activeLayerIdRef.current = trimmed
      setActiveLayerId(trimmed)
    }

    return { success: true }
  }, [])

  const setActiveLayer = useCallback((id: string) => {
    activeLayerIdRef.current = id
    setActiveLayerId(id)
  }, [])

  const reorderLayer = useCallback((id: string, newIndex: number, targetGroupId?: string | null) => {
    setLayers(prev => {
      const result = ((): Layer[] => {
        const currentIndex = prev.findIndex(l => l.id === id)
        if (currentIndex < 0) return prev

        const layer = prev[currentIndex]

        // If dragging a group, move entire block (group + ALL recursive descendants)
        if (isGroupLayer(layer) && targetGroupId === undefined) {
          const { block, rest } = extractGroupBlock(prev, layer.id)
          const restIndex = rest.findIndex(l => l.id === prev[newIndex]?.id)
          const raw = Math.max(0, Math.min(rest.length, restIndex >= 0 ? restIndex : (newIndex > currentIndex ? rest.length : 0)))
          rest.splice(findSafeInsertPos(rest, raw), 0, ...block)
          return rest
        }

        // Handle targetGroupId for moving in/out of groups
        if (targetGroupId !== undefined) {
          if (targetGroupId === null) {
            // Move to root — clear parentId
            if (isGroupLayer(layer)) {
              const { block, rest } = extractGroupBlock(prev, layer.id)
              const updatedBlock = block.map(l => {
                if (l.id === id && isGroupLayer(l)) return { ...l, parentId: undefined }
                return l
              })
              const clamped = Math.max(0, Math.min(rest.length, newIndex))
              rest.splice(findSafeInsertPos(rest, clamped), 0, ...updatedBlock)
              return rest
            }
            const next = [...prev]
            const [removed] = next.splice(currentIndex, 1)
            const updated = isDrawableLayer(removed) ? { ...removed, parentId: undefined } : removed
            const clamped = Math.max(0, Math.min(next.length, newIndex))
            next.splice(findSafeInsertPos(next, clamped), 0, updated)
            return next
          }

          // Move into group — set parentId, insert after group's last child
          if (isAncestorOf(targetGroupId, id, prev)) return prev
          if (id === targetGroupId) return prev

          const groupIdx = prev.findIndex(l => l.id === targetGroupId)
          if (groupIdx < 0) return prev
          const group = prev[groupIdx]
          if (!isGroupLayer(group)) return prev

          if (isGroupLayer(layer)) {
            const { block, rest } = extractGroupBlock(prev, layer.id)
            const updatedBlock = block.map(l => {
              if (l.id === id && isGroupLayer(l)) return { ...l, parentId: targetGroupId }
              return l
            })
            const insertPos = computeGroupInsertPos(rest, targetGroupId, newIndex, currentIndex)
            rest.splice(insertPos, 0, ...updatedBlock)
            return rest
          }

          if (!isDrawableLayer(layer)) return prev
          const next = [...prev]
          const [removed] = next.splice(currentIndex, 1)
          const insertPos = computeGroupInsertPos(next, targetGroupId, newIndex, currentIndex)
          next.splice(insertPos, 0, { ...removed, parentId: targetGroupId })
          return next
        }

        // Simple reorder (no group change)
        const clamped = Math.max(0, Math.min(prev.length - 1, newIndex))
        if (currentIndex === clamped) return prev
        const next = [...prev]
        const [removed] = next.splice(currentIndex, 1)
        next.splice(findSafeInsertPos(next, clamped), 0, removed)
        return next
      })()
      if (import.meta.env.DEV && result !== prev) assertContiguousBlocks(result)
      return result
    })
  }, [])

  const toggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])

  const setLayerVisibility = useCallback((ids: string[], visible: boolean) => {
    if (ids.length === 0) return
    const idSet = new Set(ids)
    setLayers(prev => prev.map(l => idSet.has(l.id) ? { ...l, visible } : l))
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
      const existingParentId = getParentId(layer)
      if (existingParentId) {
        group.parentId = existingParentId
      }
      const next = [...prev]
      next.splice(idx, 1, group, { ...layer, parentId: group.id })
      if (import.meta.env.DEV) assertContiguousBlocks(next)
      return next
    })
  }, [])

  const removeFromGroup = useCallback((layerId: string) => {
    setLayers(prev => {
      const result = ((): Layer[] => {
        const idx = prev.findIndex(l => l.id === layerId)
        if (idx < 0) return prev
        const layer = prev[idx]
        const groupId = getParentId(layer)
        if (!groupId) return prev

        if (isGroupLayer(layer)) {
          const groupIdx = prev.findIndex(l => l.id === groupId)
          if (groupIdx < 0) return prev

          const { block, rest } = extractGroupBlock(prev, layerId)
          const updatedBlock = block.map(l => {
            if (l.id === layerId && isGroupLayer(l)) return { ...l, parentId: undefined }
            return l
          })

          const groupIdxInRest = rest.findIndex(l => l.id === groupId)
          const insertIdx = findGroupBlockEnd(rest, groupId, groupIdxInRest)
          rest.splice(insertIdx, 0, ...updatedBlock)
          return rest
        }

        if (!isDrawableLayer(layer)) return prev

        const groupIdx = prev.findIndex(l => l.id === groupId)
        if (groupIdx < 0) return prev
        const groupEnd = findGroupBlockEnd(prev, groupId, groupIdx)
        const next = prev.filter(l => l.id !== layerId)
        const insertIdx = idx < groupEnd ? groupEnd - 1 : groupEnd
        next.splice(insertIdx, 0, { ...layer, parentId: undefined })
        return next
      })()
      if (import.meta.env.DEV && result !== prev) assertContiguousBlocks(result)
      return result
    })
  }, [])

  const toggleGroupCollapsed = useCallback((groupId: string) => {
    setLayers(prev => prev.map(l =>
      isGroupLayer(l) && l.id === groupId ? { ...l, collapsed: !l.collapsed } : l
    ))
  }, [])

  const duplicateLayer = useCallback((id: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx < 0) return prev
      const dupes = duplicateLayerBlock(prev, id)
      if (dupes.length === 0) return prev

      const insertIdx = isGroupLayer(prev[idx])
        ? findGroupBlockEnd(prev, id, idx)
        : idx + 1

      const next = [...prev.slice(0, insertIdx), ...dupes, ...prev.slice(insertIdx)]
      if (import.meta.env.DEV) assertContiguousBlocks(next)
      return next
    })
  }, [])

  const applyMoveGridsImmediate = useCallback((layerFrames: Map<string, AnsiGrid[]>) => {
    layersRef.current = layersRef.current.map(l => {
      const frames = layerFrames.get(l.id)
      if (!frames) return l
      if (l.type === 'drawn') return withUpdatedAllFrames(l, frames)
      if (l.type === 'text') return { ...l, grid: frames[0] }
      return l
    })
  }, [layersRef])

  const applyMoveGrids = useCallback((layerFrames: Map<string, AnsiGrid[]>) => {
    applyMoveGridsImmediate(layerFrames)
    setLayers(layersRef.current)
  }, [applyMoveGridsImmediate, layersRef])

  const applyToActiveLayer = useCallback((row: number, col: number, cell: AnsiCell) => {
    const activeId = activeLayerIdRef.current
    const active = layersRef.current.find(l => l.id === activeId)
    if (!active || !isDrawableLayer(active)) return // no-op for text/group layers
    if (active.type === 'text') return
    const newLayers = layersRef.current.map(l => {
      if (l.id !== activeId || l.type !== 'drawn') return l
      const newRow = [...l.grid[row]]
      newRow[col] = { ...cell, fg: [...cell.fg] as RGBColor, bg: [...cell.bg] as RGBColor }
      const newGrid = [...l.grid]
      newGrid[row] = newRow
      return withUpdatedFrame(l, newGrid)
    })
    layersRef.current = newLayers // sync update for compositing in same handler
    setLayers(newLayers)
  }, [])

  const replaceColors = useCallback((mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => {
    const activeId = activeLayerIdRef.current
    const newLayers = layersRef.current.map(l => {
      if (!isDrawableLayer(l)) return l
      if (scope === 'layer' && l.id !== activeId) return l
      const newGrid = replaceColorsInGrid(l.grid, mapping)
      if (l.type === 'drawn') return withUpdatedFrame(l, newGrid)
      return { ...l, grid: newGrid }
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
    layersRef.current = state.layers
    activeLayerIdRef.current = state.activeLayerId
    setLayers(state.layers)
    setActiveLayerId(state.activeLayerId)
  }, [])

  const updateActiveDrawnLayer = useCallback((updater: (layer: DrawnLayer) => DrawnLayer) => {
    const activeId = activeLayerIdRef.current
    const newLayers = layersRef.current.map(l => {
      if (l.id !== activeId || l.type !== 'drawn') return l
      return updater(l)
    })
    layersRef.current = newLayers
    setLayers(newLayers)
  }, [])

  const addFrame = useCallback(() => {
    updateActiveDrawnLayer(l => {
      const newGrid = createEmptyGrid()
      const newFrames = [...l.frames, newGrid]
      return { ...l, grid: newGrid, frames: newFrames, currentFrameIndex: newFrames.length - 1 }
    })
  }, [updateActiveDrawnLayer])

  const duplicateFrame = useCallback(() => {
    updateActiveDrawnLayer(l => {
      const cloned = cloneGrid(l.frames[l.currentFrameIndex])
      const newFrames = [...l.frames]
      const newIndex = l.currentFrameIndex + 1
      newFrames.splice(newIndex, 0, cloned)
      return { ...l, grid: cloned, frames: newFrames, currentFrameIndex: newIndex }
    })
  }, [updateActiveDrawnLayer])

  const removeFrame = useCallback(() => {
    updateActiveDrawnLayer(l => {
      if (l.frames.length <= 1) return l
      const newFrames = [...l.frames]
      newFrames.splice(l.currentFrameIndex, 1)
      const newIndex = Math.min(l.currentFrameIndex, newFrames.length - 1)
      return { ...l, grid: newFrames[newIndex], frames: newFrames, currentFrameIndex: newIndex }
    })
  }, [updateActiveDrawnLayer])

  const setCurrentFrame = useCallback((index: number) => {
    updateActiveDrawnLayer(l => {
      const clamped = Math.max(0, Math.min(l.frames.length - 1, index))
      if (clamped === l.currentFrameIndex) return l
      return { ...l, grid: l.frames[clamped], currentFrameIndex: clamped }
    })
  }, [updateActiveDrawnLayer])

  const reorderFrame = useCallback((from: number, to: number) => {
    updateActiveDrawnLayer(l => {
      if (from < 0 || from >= l.frames.length || to < 0 || to >= l.frames.length || from === to) return l
      const newFrames = [...l.frames]
      const [moved] = newFrames.splice(from, 1)
      newFrames.splice(to, 0, moved)
      let newIndex = l.currentFrameIndex
      if (l.currentFrameIndex === from) {
        newIndex = to
      } else if (from < l.currentFrameIndex && to >= l.currentFrameIndex) {
        newIndex = l.currentFrameIndex - 1
      } else if (from > l.currentFrameIndex && to <= l.currentFrameIndex) {
        newIndex = l.currentFrameIndex + 1
      }
      return { ...l, grid: newFrames[newIndex], frames: newFrames, currentFrameIndex: newIndex }
    })
  }, [updateActiveDrawnLayer])

  const setFrameDuration = useCallback((ms: number) => {
    const clamped = Math.max(MIN_FRAME_DURATION_MS, Math.min(MAX_FRAME_DURATION_MS, ms))
    updateActiveDrawnLayer(l => ({ ...l, frameDurationMs: clamped }))
  }, [updateActiveDrawnLayer])

  const applyLayerTransform = useCallback((transform: (layer: Layer) => Layer) => {
    const newLayers = layersRef.current.map(transform)
    layersRef.current = newLayers
    setLayers(newLayers)
  }, [])

  const addTagToLayerCb = useCallback((layerId: string, tag: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? addTagToLayerUtil(l, tag) : l))
    // Auto-add to availableTags if new
    setAvailableTags(prev => prev.includes(tag) ? prev : [...prev, tag])
  }, [])

  const removeTagFromLayerCb = useCallback((layerId: string, tag: string) => {
    setLayers(prev => prev.map(l => l.id === layerId ? removeTagFromLayerUtil(l, tag) : l))
  }, [])

  const createTag = useCallback((tag: string) => {
    setAvailableTags(prev => prev.includes(tag) ? prev : [...prev, tag])
  }, [])

  const deleteTag = useCallback((tag: string) => {
    setAvailableTags(prev => prev.filter(t => t !== tag))
    setLayers(prev => prev.map(l => removeTagFromLayerUtil(l, tag)))
  }, [])

  const renameTag = useCallback((oldTag: string, newTag: string) => {
    setAvailableTags(prev => prev.map(t => t === oldTag ? newTag : t))
    setLayers(prev => prev.map(l => {
      if (!l.tags?.includes(oldTag)) return l
      return { ...l, tags: l.tags.map(t => t === oldTag ? newTag : t) }
    }))
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
    changeLayerId,
    setActiveLayer,
    reorderLayer,
    toggleVisibility,
    setLayerVisibility,
    mergeDown,
    applyToActiveLayer,
    replaceColors,
    getActiveGrid,
    getLayerState,
    restoreLayerState,
    wrapInGroup,
    removeFromGroup,
    toggleGroupCollapsed,
    duplicateLayer,
    applyMoveGrids,
    applyMoveGridsImmediate,
    applyLayerTransform,
    addFrame,
    duplicateFrame,
    removeFrame,
    setCurrentFrame,
    reorderFrame,
    setFrameDuration,
    availableTags,
    availableTagsRef,
    addTagToLayer: addTagToLayerCb,
    removeTagFromLayer: removeTagFromLayerCb,
    createTag,
    deleteTag,
    renameTag,
  }
}
