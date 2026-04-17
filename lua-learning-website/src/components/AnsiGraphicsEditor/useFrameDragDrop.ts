import { useState, useCallback, useEffect, useRef } from 'react'

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
  const rafRef = useRef<number | null>(null)

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
  }, [])

  const clearDragState = useCallback(() => {
    setDraggedIndex(null)
    setDropZoneIndex(null)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, from: number) => {
    e.dataTransfer.setData('text/plain', String(from))
    e.dataTransfer.effectAllowed = 'move'
    // RAF defer so the browser captures the drag image before React restyles the source cell.
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      setDraggedIndex(from)
    })
  }, [])

  const handleDragEnd = useCallback(clearDragState, [clearDragState])

  const handleDragOverZone = useCallback((e: React.DragEvent, zone: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropZoneIndex(zone)
  }, [])

  const handleDropOnZone = useCallback((e: React.DragEvent, zone: number) => {
    e.preventDefault()
    const from = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (!Number.isInteger(from) || from < 0 || from >= frameCount) {
      clearDragState()
      return
    }
    // Zone z ∈ [0, frameCount] is the gap before frame z; zones flanking the source
    // (z === from, z === from + 1) are no-ops. Otherwise compensate for the
    // splice-then-insert semantics of reorderFrame(from, to).
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
