import { useState, useCallback } from 'react'
import type { Layer } from './types'
import { isGroupLayer, getParentId } from './types'
import { getGroupDescendantIds, isAncestorOf, findGroupBlockEnd } from './layerUtils'

export interface UseLayerDragDropReturn {
  draggedId: string | null
  dropZoneTargetId: string | null
  dropOnGroup: string | null
  draggedGroupChildIds: Set<string>
  clearDragState: () => void
  handleDragStart: (e: React.DragEvent, id: string) => void
  handleDragEnd: () => void
  handleDragOverGroup: (e: React.DragEvent, groupId: string) => void
  handleDragOverZone: (e: React.DragEvent, layerId: string) => void
  handleDropOnBottomZone: (e: React.DragEvent) => void
  handleDropOnZone: (e: React.DragEvent, targetLayerId: string) => void
  handleDropOnGroup: (e: React.DragEvent, groupId: string) => void
}

export function useLayerDragDrop(
  layers: Layer[],
  onReorder: (id: string, newIndex: number, targetGroupId?: string | null) => void,
): UseLayerDragDropReturn {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropZoneTargetId, setDropZoneTargetId] = useState<string | null>(null)
  const [dropOnGroup, setDropOnGroup] = useState<string | null>(null)

  const clearDragState = useCallback(() => {
    setDraggedId(null)
    setDropZoneTargetId(null)
    setDropOnGroup(null)
  }, [])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    // Defer state update so the browser captures the drag image
    // before React re-renders and collapses the row
    requestAnimationFrame(() => setDraggedId(id))
  }, [])

  const handleDragEnd = useCallback(clearDragState, [clearDragState])

  const handleDragOverGroup = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    e.dataTransfer.dropEffect = 'move'
    setDropOnGroup(groupId)
    setDropZoneTargetId(null)
  }, [])

  const handleDragOverZone = useCallback((e: React.DragEvent, layerId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropZoneTargetId(layerId)
    setDropOnGroup(null)
  }, [])

  const handleDropOnBottomZone = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId) {
      // Bottom visually = index 0 in the flat array
      onReorder(sourceId, 0)
    }
    clearDragState()
  }, [onReorder, clearDragState])

  const handleDropOnZone = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    const targetArrayIdx = layers.findIndex(l => l.id === targetLayerId)
    if (sourceId && targetArrayIdx >= 0) {
      // Drop zones sit visually above their layer. "Above X visually" means
      // "after X in the flat array" (which is ordered bottom-to-top).
      // For groups, skip past the entire block to avoid splitting it.
      const target = layers[targetArrayIdx]
      const insertIdx = target && isGroupLayer(target)
        ? findGroupBlockEnd(layers, target.id, targetArrayIdx)
        : targetArrayIdx + 1
      const source = layers.find(l => l.id === sourceId)
      const targetContext = target ? getParentId(target) : undefined
      const sourceContext = source ? getParentId(source) : undefined
      if (targetContext !== sourceContext) {
        // Cross-group: explicitly set the new parent (null for root)
        onReorder(sourceId, insertIdx, targetContext ?? null)
      } else if (targetContext !== undefined) {
        // Within-group: pass group id for range-aware positioning
        onReorder(sourceId, insertIdx, targetContext)
      } else {
        // Both root: simple positional reorder
        onReorder(sourceId, insertIdx)
      }
    }
    clearDragState()
  }, [layers, onReorder, clearDragState])

  const handleDropOnGroup = useCallback((e: React.DragEvent, groupId: string) => {
    e.preventDefault()
    e.stopPropagation()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (!sourceId) return
    // Prevent circular nesting
    if (isAncestorOf(groupId, sourceId, layers)) return
    if (sourceId === groupId) return
    const groupIdx = layers.findIndex(l => l.id === groupId)
    if (groupIdx >= 0) {
      onReorder(sourceId, groupIdx, groupId)
    }
    clearDragState()
  }, [layers, onReorder, clearDragState])

  const draggedGroupChildIds = draggedId && layers.find(l => l.id === draggedId && isGroupLayer(l))
    ? getGroupDescendantIds(draggedId, layers)
    : new Set<string>()

  return {
    draggedId,
    dropZoneTargetId,
    dropOnGroup,
    draggedGroupChildIds,
    clearDragState,
    handleDragStart,
    handleDragEnd,
    handleDragOverGroup,
    handleDragOverZone,
    handleDropOnBottomZone,
    handleDropOnZone,
    handleDropOnGroup,
  }
}
