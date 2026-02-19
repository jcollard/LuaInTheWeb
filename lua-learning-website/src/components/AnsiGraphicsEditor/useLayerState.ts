import { useState, useCallback, useRef } from 'react'
import type { AnsiCell, AnsiGrid, Layer, LayerState, RGBColor, Rect, TextAlign, TextLayer } from './types'
import { createLayer, cloneLayerState, syncLayerIds, mergeLayerDown } from './layerUtils'
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
  reorderLayer: (id: string, newIndex: number) => void
  toggleVisibility: (id: string) => void
  applyToActiveLayer: (row: number, col: number, cell: AnsiCell) => void
  getActiveGrid: () => Layer['grid']
  mergeDown: (id: string) => void
  replaceColors: (mapping: Map<string, RGBColor>, scope: 'current' | 'layer') => void
  getLayerState: () => LayerState
  restoreLayerState: (state: LayerState) => void
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

  const activeLayer = layers.find(l => l.id === activeLayerId) ?? layers[0]

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
      if (prev.length <= 1) return prev
      const next = prev.filter(l => l.id !== id)
      // If we removed the active layer, switch to the last remaining layer
      setActiveLayerId(prevActive => {
        if (prevActive === id) return next[next.length - 1].id
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

  const reorderLayer = useCallback((id: string, newIndex: number) => {
    setLayers(prev => {
      const currentIndex = prev.findIndex(l => l.id === id)
      if (currentIndex < 0) return prev
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
      const result = mergeLayerDown(prev, id)
      if (!result) return prev
      setActiveLayerId(prevActive => prevActive === id ? prev[idx - 1].id : prevActive)
      return result
    })
  }, [])

  const applyToActiveLayer = useCallback((row: number, col: number, cell: AnsiCell) => {
    const activeId = activeLayerIdRef.current
    const active = layersRef.current.find(l => l.id === activeId)
    if (active?.type === 'text') return // no-op for text layers
    const newLayers = layersRef.current.map(l => {
      if (l.id !== activeId) return l
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
      if (scope === 'layer' && l.id !== activeId) return l
      return { ...l, grid: replaceColorsInGrid(l.grid, mapping) }
    })
    layersRef.current = newLayers
    setLayers(newLayers)
  }, [])

  const getActiveGrid = useCallback(() => {
    const activeId = activeLayerIdRef.current
    const layer = layersRef.current.find(l => l.id === activeId)
    return layer ? layer.grid : layersRef.current[0].grid
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
  }
}
