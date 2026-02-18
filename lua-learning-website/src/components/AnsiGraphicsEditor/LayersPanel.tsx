import { useState, useCallback } from 'react'
import type { Layer } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayersPanelProps {
  layers: Layer[]
  activeLayerId: string
  onSetActive: (id: string) => void
  onToggleVisibility: (id: string) => void
  onRename: (id: string, name: string) => void
  onMoveUp: (id: string) => void
  onMoveDown: (id: string) => void
  onAdd: () => void
  onRemove: (id: string) => void
}

export function LayersPanel({
  layers,
  activeLayerId,
  onSetActive,
  onToggleVisibility,
  onRename,
  onMoveUp,
  onMoveDown,
  onAdd,
  onRemove,
}: LayersPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

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

  // Display layers in reverse order: topmost layer first in the list
  const reversed = [...layers].reverse()
  const singleLayer = layers.length <= 1

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
        {reversed.map(layer => {
          const isActive = layer.id === activeLayerId
          const isEditing = editingId === layer.id
          return (
            <div
              key={layer.id}
              data-testid={`layer-row-${layer.id}`}
              className={`${styles.layerRow} ${isActive ? styles.layerRowActive : ''}`}
              onClick={() => onSetActive(layer.id)}
            >
              <button
                className={styles.layerVisibility}
                onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }}
                aria-label="Toggle visibility"
                title="Toggle visibility"
              >
                {layer.visible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
              </button>
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
                onClick={e => { e.stopPropagation(); onMoveUp(layer.id) }}
                aria-label="Move up"
                title="Move up"
              >
                ▲
              </button>
              <button
                className={styles.layerBtn}
                onClick={e => { e.stopPropagation(); onMoveDown(layer.id) }}
                aria-label="Move down"
                title="Move down"
              >
                ▼
              </button>
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
          )
        })}
      </div>
    </div>
  )
}
