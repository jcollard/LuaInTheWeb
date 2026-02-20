import { useState, useCallback, useEffect, Fragment } from 'react'
import type { Layer } from './types'
import { isGroupLayer, isDrawableLayer } from './types'
import { getAncestorGroupIds, getGroupDescendantIds, getNestingDepth, isAncestorOf } from './layerUtils'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayersPanelProps {
  layers: Layer[]
  activeLayerId: string
  onSetActive: (id: string) => void
  onToggleVisibility: (id: string) => void
  onRename: (id: string, name: string) => void
  onReorder: (id: string, newIndex: number, targetGroupId?: string | null) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onMergeDown: (id: string) => void
  onWrapInGroup: (layerId: string) => void
  onRemoveFromGroup: (layerId: string) => void
  onToggleGroupCollapsed: (groupId: string) => void
}

export function LayersPanel({
  layers,
  activeLayerId,
  onSetActive,
  onToggleVisibility,
  onRename,
  onReorder,
  onAdd,
  onRemove,
  onMergeDown,
  onWrapInGroup,
  onRemoveFromGroup,
  onToggleGroupCollapsed,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ layerId: string; x: number; y: number } | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropZoneTargetId, setDropZoneTargetId] = useState<string | null>(null)
  const [dropOnGroup, setDropOnGroup] = useState<string | null>(null)

  const startRename = useCallback((id: string, currentName: string) => {
    setEditingId(id)
    setEditValue(currentName)
  }, [])

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim())
    }
    setEditingId(null)
  }, [editingId, editValue, onRename])

  const cancelRename = useCallback(() => {
    setEditingId(null)
  }, [])

  const closeContextMenu = useCallback(() => setContextMenu(null), [])

  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    // Defer state update so the browser captures the drag image
    // before React re-renders and collapses the row
    requestAnimationFrame(() => setDraggedId(id))
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedId(null)
    setDropZoneTargetId(null)
    setDropOnGroup(null)
  }, [])

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

  const handleDropOnZone = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    const targetArrayIdx = layers.findIndex(l => l.id === targetLayerId)
    if (sourceId && targetArrayIdx >= 0) {
      // Check if source is a group — don't allow dropping group into another group
      const source = layers.find(l => l.id === sourceId)
      const target = layers.find(l => l.id === targetLayerId)
      if (source && isGroupLayer(source) && target && isDrawableLayer(target) && target.parentId) {
        // Dropping group near a grouped child — just reorder to root
        onReorder(sourceId, targetArrayIdx, null)
      } else {
        onReorder(sourceId, targetArrayIdx)
      }
    }
    setDraggedId(null)
    setDropZoneTargetId(null)
    setDropOnGroup(null)
  }, [layers, onReorder])

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
    setDraggedId(null)
    setDropZoneTargetId(null)
    setDropOnGroup(null)
  }, [layers, onReorder])

  useEffect(() => {
    if (!contextMenu) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [contextMenu])

  // Build a set of collapsed group IDs for hiding children
  const collapsedGroups = new Set<string>()
  for (const layer of layers) {
    if (isGroupLayer(layer) && layer.collapsed) collapsedGroups.add(layer.id)
  }

  // Display layers in reverse order with recursive tree-walk
  // Build parentId → children[] map from reversed array
  const childrenMap = new Map<string | undefined, Layer[]>()
  const rawReversed = [...layers].reverse()
  for (const layer of rawReversed) {
    const pid = isGroupLayer(layer) ? layer.parentId : (isDrawableLayer(layer) ? layer.parentId : undefined)
    const existing = childrenMap.get(pid) ?? []
    existing.push(layer)
    childrenMap.set(pid, existing)
  }
  // DFS from roots, emitting group before its children at each level
  const reversed: Layer[] = []
  function buildDisplayOrder(parentId: string | undefined): void {
    const children = childrenMap.get(parentId)
    if (!children) return
    for (const layer of children) {
      reversed.push(layer)
      if (isGroupLayer(layer)) {
        buildDisplayOrder(layer.id)
      }
    }
  }
  buildDisplayOrder(undefined)
  const drawableCount = layers.filter(isDrawableLayer).length
  const singleDrawable = drawableCount <= 1
  const singleLayer = layers.length <= 1

  const draggedGroupChildIds = draggedId && layers.find(l => l.id === draggedId && isGroupLayer(l))
    ? getGroupDescendantIds(draggedId, layers)
    : new Set<string>()

  // Context menu layer info
  const contextLayer = contextMenu ? layers.find(l => l.id === contextMenu.layerId) : null
  const contextIsGroup = contextLayer ? isGroupLayer(contextLayer) : false
  const contextHasParentId = contextLayer ? (isGroupLayer(contextLayer) ? !!contextLayer.parentId : (isDrawableLayer(contextLayer) ? !!contextLayer.parentId : false)) : false

  return (
    <div className={styles.layersPanel} data-testid="layers-panel">
      <div className={styles.layersPanelHeader}>
        <span className={styles.layersPanelTitle}>Layers</span>
        <button
          className={styles.layersPanelAdd}
          onClick={onAdd}
          aria-label="Add layer"
          title="Add layer"
        >
          +
        </button>
      </div>
      <div className={styles.layersList}>
        {reversed.map((layer) => {
          const isGroup = isGroupLayer(layer)
          const isDragged = draggedId === layer.id || draggedGroupChildIds.has(layer.id)
          const isActive = layer.id === activeLayerId
          const isEditing = editingId === layer.id
          const isGroupDropTarget = !isDragged && dropOnGroup === layer.id && draggedId !== null

          // Hide children of collapsed groups — check if ANY ancestor is collapsed
          const ancestors = getAncestorGroupIds(layer, layers)
          if (ancestors.some(aid => collapsedGroups.has(aid))) {
            return null
          }

          const depth = getNestingDepth(layer, layers)
          const depthStyle = depth > 0 ? { paddingLeft: `${depth * 28}px` } : undefined

          const rowClassName = [
            styles.layerRow,
            isActive && styles.layerRowActive,
            isDragged && styles.layerRowDragging,
            isGroup && styles.layerRowGroup,
            isGroupDropTarget && styles.layerRowGroupDropTarget,
          ].filter(Boolean).join(' ')

          const isZoneActive = dropZoneTargetId === layer.id && draggedId !== null && !isDragged
          const dropZone = (
            <div
              className={`${styles.layerDropZone} ${isZoneActive ? styles.layerDropZoneActive : ''}`}
              data-testid={`layer-drop-zone-${layer.id}`}
              onDragOver={e => handleDragOverZone(e, layer.id)}
              onDrop={e => handleDropOnZone(e, layer.id)}
            />
          )

          if (isGroup) {
            return (
              <Fragment key={layer.id}>
                {dropZone}
                <div
                  data-testid={`layer-row-${layer.id}`}
                  className={rowClassName}
                  style={depthStyle}
                  onClick={() => onSetActive(layer.id)}
                  onContextMenu={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setContextMenu({ layerId: layer.id, x: e.clientX, y: e.clientY })
                  }}
                  onDragOver={e => handleDragOverGroup(e, layer.id)}
                  onDrop={e => handleDropOnGroup(e, layer.id)}
                >
                  {!singleLayer && (
                    <span
                      className={styles.layerDragHandle}
                      data-testid={`layer-grip-${layer.id}`}
                      draggable
                      onDragStart={e => { e.stopPropagation(); handleDragStart(e, layer.id) }}
                      onDragEnd={handleDragEnd}
                      title="Drag to reorder"
                    >&#x2630;</span>
                  )}
                  <button
                    className={styles.layerGroupToggle}
                    data-testid={`group-toggle-${layer.id}`}
                    onClick={e => { e.stopPropagation(); onToggleGroupCollapsed(layer.id) }}
                    aria-label={layer.collapsed ? 'Expand group' : 'Collapse group'}
                    title={layer.collapsed ? 'Expand group' : 'Collapse group'}
                  >
                    {layer.collapsed ? '\u25B6' : '\u25BC'}
                  </button>
                  <button
                    className={styles.layerVisibility}
                    onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }}
                    aria-label="Toggle visibility"
                    title="Toggle visibility"
                  >
                    {layer.visible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
                  </button>
                  <span className={styles.layerTypeBadge} data-testid="group-layer-badge">
                    {'\uD83D\uDCC1'}
                  </span>
                  <span
                    className={styles.layerName}
                    onDoubleClick={e => { e.stopPropagation(); startRename(layer.id, layer.name) }}
                  >
                    {isEditing ? (
                      <input
                        role="textbox"
                        className={styles.layerNameInput}
                        value={editValue}
                        onChange={e => setEditValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRename()
                          if (e.key === 'Escape') cancelRename()
                        }}
                        onBlur={commitRename}
                        autoFocus
                        onClick={e => e.stopPropagation()}
                      />
                    ) : (
                      layer.name
                    )}
                  </span>
                  <button
                    className={styles.layerBtn}
                    onClick={e => { e.stopPropagation(); onRemove(layer.id) }}
                    aria-label="Delete group"
                    title="Delete group (children promoted to root)"
                  >
                    &#x1F5D1;
                  </button>
                </div>
              </Fragment>
            )
          }

          return (
            <Fragment key={layer.id}>
              {dropZone}
              <div
                data-testid={`layer-row-${layer.id}`}
                className={rowClassName}
                style={depthStyle}
                onClick={() => onSetActive(layer.id)}
                onContextMenu={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ layerId: layer.id, x: e.clientX, y: e.clientY })
                }}
              >
                {!singleLayer && (
                  <span
                    className={styles.layerDragHandle}
                    data-testid={`layer-grip-${layer.id}`}
                    draggable
                    onDragStart={e => { e.stopPropagation(); handleDragStart(e, layer.id) }}
                    onDragEnd={handleDragEnd}
                    title="Drag to reorder"
                  >&#x2630;</span>
                )}
                <button
                  className={styles.layerVisibility}
                  onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }}
                  aria-label="Toggle visibility"
                  title="Toggle visibility"
                >
                  {layer.visible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
                </button>
                {layer.type === 'text' && (
                  <span className={styles.layerTypeBadge} data-testid="text-layer-badge">T</span>
                )}
                <span
                  className={styles.layerName}
                  onDoubleClick={e => { e.stopPropagation(); startRename(layer.id, layer.name) }}
                >
                  {isEditing ? (
                    <input
                      role="textbox"
                      className={styles.layerNameInput}
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') cancelRename()
                      }}
                      onBlur={commitRename}
                      autoFocus
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    layer.name
                  )}
                </span>
                <button
                  className={styles.layerBtn}
                  onClick={e => { e.stopPropagation(); onRemove(layer.id) }}
                  aria-label="Delete layer"
                  title="Delete layer"
                  disabled={singleDrawable}
                >
                  &#x1F5D1;
                </button>
              </div>
            </Fragment>
          )
        })}
      </div>
      {contextMenu && (
        <>
          <div
            className={styles.layerContextBackdrop}
            data-testid="layer-context-backdrop"
            onClick={closeContextMenu}
          />
          <div
            className={styles.layerContextMenu}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            data-testid="layer-context-menu"
          >
            {!contextIsGroup && (
              <button
                className={styles.layerContextMenuItem}
                data-testid="context-merge-down"
                onClick={() => { onMergeDown(contextMenu.layerId); setContextMenu(null) }}
                disabled={contextMenu.layerId === layers[0]?.id}
              >
                Merge Down
              </button>
            )}
            <button
              className={styles.layerContextMenuItem}
              data-testid="context-wrap-in-group"
              onClick={() => { onWrapInGroup(contextMenu.layerId); setContextMenu(null) }}
            >
              Group with new folder
            </button>
            {contextHasParentId && (
              <button
                className={styles.layerContextMenuItem}
                data-testid="context-remove-from-group"
                onClick={() => { onRemoveFromGroup(contextMenu.layerId); setContextMenu(null) }}
              >
                Remove from group
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
