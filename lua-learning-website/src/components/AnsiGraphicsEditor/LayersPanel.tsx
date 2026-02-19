import { useState, useCallback, useEffect, Fragment } from 'react'
import type { Layer } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayersPanelProps {
  layers: Layer[]
  activeLayerId: string
  onSetActive: (id: string) => void
  onToggleVisibility: (id: string) => void
  onRename: (id: string, name: string) => void
  onReorder: (id: string, newIndex: number) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onMergeDown: (id: string) => void
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
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ layerId: string; x: number; y: number } | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)

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
    setDropTargetId(null)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, id: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(id)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, targetLayerId: string) => {
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    const targetArrayIdx = layers.findIndex(l => l.id === targetLayerId)
    if (sourceId && targetArrayIdx >= 0) {
      onReorder(sourceId, targetArrayIdx)
    }
    setDraggedId(null)
    setDropTargetId(null)
  }, [layers, onReorder])

  useEffect(() => {
    if (!contextMenu) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [contextMenu])

  // Display layers in reverse order: topmost layer first in the list
  const reversed = [...layers].reverse()
  const singleLayer = layers.length <= 1
  const draggedVisualIdx = draggedId ? reversed.findIndex(l => l.id === draggedId) : -1

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
        {reversed.map((layer, visualIdx) => {
          const isDragged = draggedId === layer.id
          const isActive = layer.id === activeLayerId
          const isEditing = editingId === layer.id
          const isDropTarget = !isDragged && dropTargetId === layer.id && draggedId !== null
          const showPlaceholderBefore = isDropTarget && draggedVisualIdx > visualIdx
          const showPlaceholderAfter = isDropTarget && draggedVisualIdx < visualIdx

          const rowClassName = [
            styles.layerRow,
            isActive && styles.layerRowActive,
            isDragged && styles.layerRowDragging,
          ].filter(Boolean).join(' ')

          const placeholder = (
            <div
              className={styles.layerDropPlaceholder}
              data-testid="layer-drop-placeholder"
              onDragOver={e => handleDragOver(e, layer.id)}
              onDrop={e => handleDrop(e, layer.id)}
            />
          )

          return (
            <Fragment key={layer.id}>
              {showPlaceholderBefore && placeholder}
              <div
                data-testid={`layer-row-${layer.id}`}
                className={rowClassName}
                onClick={() => onSetActive(layer.id)}
                onContextMenu={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({ layerId: layer.id, x: e.clientX, y: e.clientY })
                }}
                onDragOver={e => handleDragOver(e, layer.id)}
                onDrop={e => handleDrop(e, layer.id)}
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
                  disabled={singleLayer}
                >
                  &#x1F5D1;
                </button>
              </div>
              {showPlaceholderAfter && placeholder}
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
            <button
              className={styles.layerContextMenuItem}
              data-testid="context-merge-down"
              onClick={() => { onMergeDown(contextMenu.layerId); setContextMenu(null) }}
              disabled={contextMenu.layerId === layers[0]?.id}
            >
              Merge Down
            </button>
          </div>
        </>
      )}
    </div>
  )
}
