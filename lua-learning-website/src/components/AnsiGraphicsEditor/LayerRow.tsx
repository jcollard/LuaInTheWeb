import type { Layer, GroupLayer } from './types'
import { isGroupLayer } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayerRowProps {
  layer: Layer
  isEditing: boolean
  singleLayer: boolean
  singleDrawable: boolean
  depthStyle?: React.CSSProperties
  rowClassName: string
  editValue: string
  dropZone: React.ReactNode
  onSetActive: () => void
  onContextMenu: (e: React.MouseEvent) => void
  onToggleVisibility: () => void
  onRemove: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onStartRename: () => void
  onEditChange: (value: string) => void
  onCommitRename: () => void
  onCancelRename: () => void
  onDragOverGroup?: (e: React.DragEvent) => void
  onDropOnGroup?: (e: React.DragEvent) => void
  onToggleCollapsed?: () => void
}

export function LayerRow({
  layer,
  isEditing,
  singleLayer,
  singleDrawable,
  depthStyle,
  rowClassName,
  editValue,
  dropZone,
  onSetActive,
  onContextMenu,
  onToggleVisibility,
  onRemove,
  onDragStart,
  onDragEnd,
  onStartRename,
  onEditChange,
  onCommitRename,
  onCancelRename,
  onDragOverGroup,
  onDropOnGroup,
  onToggleCollapsed,
}: LayerRowProps) {
  const isGroup = isGroupLayer(layer)
  const groupLayer = isGroup ? (layer as GroupLayer) : null
  const collapsedLabel = groupLayer?.collapsed ? 'Expand group' : 'Collapse group'

  return (
    <>
      {dropZone}
      <div
        data-testid={`layer-row-${layer.id}`}
        className={rowClassName}
        style={depthStyle}
        onClick={onSetActive}
        onContextMenu={onContextMenu}
        onDragOver={isGroup ? onDragOverGroup : undefined}
        onDrop={isGroup ? onDropOnGroup : undefined}
      >
        {!singleLayer && (
          <span
            className={styles.layerDragHandle}
            data-testid={`layer-grip-${layer.id}`}
            draggable
            onDragStart={e => { e.stopPropagation(); onDragStart(e) }}
            onDragEnd={onDragEnd}
            title="Drag to reorder"
          >&#x2630;</span>
        )}
        {groupLayer && (
          <button
            className={styles.layerGroupToggle}
            data-testid={`group-toggle-${layer.id}`}
            onClick={e => { e.stopPropagation(); onToggleCollapsed?.() }}
            aria-label={collapsedLabel}
            title={collapsedLabel}
          >
            {groupLayer.collapsed ? '\u25B6' : '\u25BC'}
          </button>
        )}
        <button
          className={styles.layerVisibility}
          onClick={e => { e.stopPropagation(); onToggleVisibility() }}
          aria-label="Toggle visibility"
          title="Toggle visibility"
        >
          {layer.visible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
        </button>
        {isGroup && (
          <span className={styles.layerTypeBadge} data-testid="group-layer-badge">
            {'\uD83D\uDCC1'}
          </span>
        )}
        {!isGroup && layer.type === 'text' && (
          <span className={styles.layerTypeBadge} data-testid="text-layer-badge">T</span>
        )}
        <span
          className={styles.layerName}
          onDoubleClick={e => { e.stopPropagation(); onStartRename() }}
        >
          {isEditing ? (
            <input
              role="textbox"
              className={styles.layerNameInput}
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onCommitRename()
                if (e.key === 'Escape') onCancelRename()
              }}
              onBlur={onCommitRename}
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          ) : (
            layer.name
          )}
        </span>
        <button
          className={styles.layerBtn}
          onClick={e => { e.stopPropagation(); onRemove() }}
          aria-label={isGroup ? 'Delete group' : 'Delete layer'}
          title={isGroup ? 'Delete group (children promoted to root)' : 'Delete layer'}
          disabled={!isGroup && singleDrawable}
        >
          &#x1F5D1;
        </button>
      </div>
    </>
  )
}
