import { useState, useCallback } from 'react'

export interface UseFrameDragDropReturn {
  draggedIndex: number | null
  dropZoneIndex: number | null
  handleDragStart: (e: React.DragEvent, from: number) => void
  handleDragEnd: () => void
  handleDragOverZone: (e: React.DragEvent, zone: number) => void
  handleDropOnZone: (e: React.DragEvent, zone: number) => void
}

export function useFrameDragDrop(
  frameCount: number,
  onReorder: (from: number, to: number) => void,
): UseFrameDragDropReturn {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dropZoneIndex, setDropZoneIndex] = useState<number | null>(null)

  const clearDragState = useCallback(() => {
    setDraggedIndex(null)
    setDropZoneIndex(null)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, from: number) => {
    e.dataTransfer.setData('text/plain', String(from))
    e.dataTransfer.effectAllowed = 'move'
    // Defer so the browser captures the drag image before React re-renders
    // and restyles the dragged cell (mirrors useLayerDragDrop).
    requestAnimationFrame(() => setDraggedIndex(from))
  }, [])

  const handleDragEnd = useCallback(clearDragState, [clearDragState])

  const handleDragOverZone = useCallback((e: React.DragEvent, zone: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropZoneIndex(zone)
  }, [])

  const handleDropOnZone = useCallback((e: React.DragEvent, zone: number) => {
    e.preventDefault()
    const raw = e.dataTransfer.getData('text/plain')
    const from = parseInt(raw, 10)
    if (!Number.isFinite(from) || from < 0 || from >= frameCount) {
      clearDragState()
      return
    }
    // Zone index z ∈ [0, frameCount] represents the gap before frame z
    // (so zone frameCount is the gap after the last frame). Zones flanking
    // the dragged frame (z === from, z === from + 1) are no-ops.
    // Otherwise map to the final `to` passed to reorderFrame, compensating
    // for the splice-then-insert semantics.
    if (zone !== from && zone !== from + 1) {
      const to = zone > from ? zone - 1 : zone
      onReorder(from, to)
    }
    clearDragState()
  }, [frameCount, onReorder, clearDragState])

  return {
    draggedIndex,
    dropZoneIndex,
    handleDragStart,
    handleDragEnd,
    handleDragOverZone,
    handleDropOnZone,
  }
}
