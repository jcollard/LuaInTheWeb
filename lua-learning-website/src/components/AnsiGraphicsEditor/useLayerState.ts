import { useState, useCallback, useRef } from 'react'
import type { AnsiCell, AnsiGrid, Layer, LayerState, RGBColor } from './types'
import { createLayer, cloneLayerState, syncLayerIds } from './layerUtils'

export interface UseLayerStateReturn {
  layers: Layer[]
  activeLayerId: string
  layersRef: React.RefObject<Layer[]>
  activeLayerIdRef: React.RefObject<string>
  activeLayer: Layer
  addLayer: () => void
  addLayerWithGrid: (name: string, grid: AnsiGrid) => void
  removeLayer: (id: string) => void
  renameLayer: (id: string, name: string) => void
  setActiveLayer: (id: string) => void
  moveLayerUp: (id: string) => void
  moveLayerDown: (id: string) => void
  toggleVisibility: (id: string) => void
  applyToActiveLayer: (row: number, col: number, cell: AnsiCell) => void
  getActiveGrid: () => Layer['grid']
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
    setActiveLayerId(id)
  }, [])

  const moveLayerUp = useCallback((id: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx < 0 || idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }, [])

  const moveLayerDown = useCallback((id: string) => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }, [])

  const toggleVisibility = useCallback((id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l))
  }, [])

  const applyToActiveLayer = useCallback((row: number, col: number, cell: AnsiCell) => {
    const activeId = activeLayerIdRef.current
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
    removeLayer,
    renameLayer,
    setActiveLayer,
    moveLayerUp,
    moveLayerDown,
    toggleVisibility,
    applyToActiveLayer,
    getActiveGrid,
    getLayerState,
    restoreLayerState,
  }
}
