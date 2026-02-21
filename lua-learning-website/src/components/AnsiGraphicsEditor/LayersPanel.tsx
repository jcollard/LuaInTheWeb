import { useState, useCallback, useEffect } from 'react'
import type { Layer } from './types'
import { isGroupLayer, isDrawableLayer, getParentId } from './types'
import { getAncestorGroupIds, getGroupDescendantIds, isAncestorOf, buildDisplayOrder, findGroupBlockEnd } from './layerUtils'
import { LayerRow } from './LayerRow'
import { TagsTabContent } from './TagsTabContent'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayersPanelProps {
  layers: Layer[]
  activeLayerId: string
  onSetActive: (id: string) => void
  onToggleVisibility: (id: string) => void
  onSetLayerVisibility: (ids: string[], visible: boolean) => void
  onRename: (id: string, name: string) => void
  onReorder: (id: string, newIndex: number, targetGroupId?: string | null) => void
  onAdd: () => void
  onRemove: (id: string) => void
  onMergeDown: (id: string) => void
  onWrapInGroup: (layerId: string) => void
  onRemoveFromGroup: (layerId: string) => void
  onDuplicate: (id: string) => void
  onToggleGroupCollapsed: (groupId: string) => void
  availableTags: string[]
  onAddTagToLayer: (layerId: string, tag: string) => void
  onRemoveTagFromLayer: (layerId: string, tag: string) => void
  onCreateTag: (tag: string) => void
  onDeleteTag: (tag: string) => void
  onRenameTag: (oldTag: string, newTag: string) => void
}

export function LayersPanel({
  layers,
  activeLayerId,
  onSetActive,
  onToggleVisibility,
  onSetLayerVisibility,
  onRename,
  onReorder,
  onAdd,
  onRemove,
  onMergeDown,
  onWrapInGroup,
  onRemoveFromGroup,
  onDuplicate,
  onToggleGroupCollapsed,
  availableTags,
  onAddTagToLayer,
  onRemoveTagFromLayer,
  onCreateTag,
  onDeleteTag,
  onRenameTag,
}: LayersPanelProps) {
  const [activeTab, setActiveTab] = useState<'layers' | 'tags'>('layers')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{ layerId: string; x: number; y: number } | null>(null)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dropZoneTargetId, setDropZoneTargetId] = useState<string | null>(null)
  const [dropOnGroup, setDropOnGroup] = useState<string | null>(null)
  const [tagsSubmenuOpen, setTagsSubmenuOpen] = useState(false)
  const [tagsSubmenuFlipped, setTagsSubmenuFlipped] = useState(false)

  const tagsSubmenuRef = useCallback((el: HTMLDivElement | null) => {
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTagsSubmenuFlipped(rect.right > window.innerWidth)
  }, [])

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

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
    setTagsSubmenuOpen(false)
    setTagsSubmenuFlipped(false)
  }, [])

  const handleBackdropContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const backdrop = e.currentTarget as HTMLElement
    backdrop.style.pointerEvents = 'none'
    const el = document.elementFromPoint(e.clientX, e.clientY)
    backdrop.style.pointerEvents = ''
    const row = el?.closest<HTMLElement>('[data-layer-id]')
    if (row?.dataset.layerId) {
      setTagsSubmenuOpen(false)
      setTagsSubmenuFlipped(false)
      setContextMenu({ layerId: row.dataset.layerId, x: e.clientX, y: e.clientY })
    } else {
      closeContextMenu()
    }
  }, [closeContextMenu])

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

  useEffect(() => {
    if (!contextMenu) return
    function onKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') setContextMenu(null)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [contextMenu])

  const collapsedGroups = new Set(
    layers.filter(l => isGroupLayer(l) && l.collapsed).map(l => l.id)
  )

  // Display layers in reverse order with recursive tree-walk
  const reversed = buildDisplayOrder(layers)
  const drawableCount = layers.filter(isDrawableLayer).length
  const singleDrawable = drawableCount <= 1
  const singleLayer = layers.length <= 1

  const draggedGroupChildIds = draggedId && layers.find(l => l.id === draggedId && isGroupLayer(l))
    ? getGroupDescendantIds(draggedId, layers)
    : new Set<string>()

  const contextLayer = contextMenu ? layers.find(l => l.id === contextMenu.layerId) : undefined
  const contextIsGroup = contextLayer != null && isGroupLayer(contextLayer)
  const contextHasParentId = contextLayer != null && getParentId(contextLayer) != null

  return (
    <div className={styles.layersPanel} data-testid="layers-panel">
      <div className={styles.layersPanelHeader}>
        <div className={styles.layersPanelTabs}>
          <button
            className={[styles.layersPanelTab, activeTab === 'layers' && styles.layersPanelTabActive].filter(Boolean).join(' ')}
            data-testid="tab-layers"
            onClick={() => setActiveTab('layers')}
          >
            Layers
          </button>
          <button
            className={[styles.layersPanelTab, activeTab === 'tags' && styles.layersPanelTabActive].filter(Boolean).join(' ')}
            data-testid="tab-tags"
            onClick={() => setActiveTab('tags')}
          >
            Tags
          </button>
        </div>
        {activeTab === 'layers' && (
          <button
            className={styles.layersPanelAdd}
            onClick={onAdd}
            aria-label="Add layer"
            title="Add layer"
          >
            +
          </button>
        )}
      </div>
      {activeTab === 'tags' ? (
        <TagsTabContent
          layers={layers}
          availableTags={availableTags}
          activeLayerId={activeLayerId}
          onSetActive={onSetActive}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
          onRenameTag={onRenameTag}
          onToggleVisibility={onToggleVisibility}
          onSetLayerVisibility={onSetLayerVisibility}
          onRenameLayer={onRename}
        />
      ) : (
      <div className={styles.layersList}>
        {reversed.map((layer) => {
          const isGroup = isGroupLayer(layer)
          const isDragged = draggedId === layer.id || draggedGroupChildIds.has(layer.id)
          const isActive = layer.id === activeLayerId
          const isEditing = editingId === layer.id
          const isGroupDropTarget = !isDragged && dropOnGroup === layer.id && draggedId !== null

          // Hide children of collapsed groups
          const ancestors = getAncestorGroupIds(layer, layers)
          if (ancestors.some(aid => collapsedGroups.has(aid))) {
            return null
          }

          const depthStyle = ancestors.length > 0 ? { paddingLeft: `${ancestors.length * 28}px` } : undefined

          const rowClassName = [
            styles.layerRow,
            isActive && styles.layerRowActive,
            isDragged && styles.layerRowDragging,
            isGroup && styles.layerRowGroup,
            isGroupDropTarget && styles.layerRowGroupDropTarget,
          ].filter(Boolean).join(' ')

          const isZoneActive = dropZoneTargetId === layer.id && draggedId !== null && !isDragged
          const dropZoneClassName = [
            styles.layerDropZone,
            isZoneActive && styles.layerDropZoneActive,
          ].filter(Boolean).join(' ')
          const dropZone = (
            <div
              className={dropZoneClassName}
              data-testid={`layer-drop-zone-${layer.id}`}
              onDragOver={e => handleDragOverZone(e, layer.id)}
              onDrop={e => handleDropOnZone(e, layer.id)}
            />
          )

          return (
            <LayerRow
              key={layer.id}
              layer={layer}
              isEditing={isEditing}
              singleLayer={singleLayer}
              singleDrawable={singleDrawable}
              depthStyle={depthStyle}
              rowClassName={rowClassName}
              editValue={editValue}
              dropZone={dropZone}
              onSetActive={() => onSetActive(layer.id)}
              onContextMenu={e => {
                e.preventDefault()
                e.stopPropagation()
                setContextMenu({ layerId: layer.id, x: e.clientX, y: e.clientY })
              }}
              onToggleVisibility={() => onToggleVisibility(layer.id)}
              onRemove={() => onRemove(layer.id)}
              onDragStart={e => handleDragStart(e, layer.id)}
              onDragEnd={handleDragEnd}
              onStartRename={() => startRename(layer.id, layer.name)}
              onEditChange={setEditValue}
              onCommitRename={commitRename}
              onCancelRename={cancelRename}
              onDragOverGroup={isGroup ? e => handleDragOverGroup(e, layer.id) : undefined}
              onDropOnGroup={isGroup ? e => handleDropOnGroup(e, layer.id) : undefined}
              onToggleCollapsed={isGroup ? () => onToggleGroupCollapsed(layer.id) : undefined}
            />
          )
        })}
        {draggedId && (
          <div
            className={[
              styles.layerDropZone,
              dropZoneTargetId === '__bottom__' && styles.layerDropZoneActive,
            ].filter(Boolean).join(' ')}
            data-testid="layer-drop-zone-bottom"
            onDragOver={e => handleDragOverZone(e, '__bottom__')}
            onDrop={handleDropOnBottomZone}
          />
        )}
      </div>
      )}
      {contextMenu && (
        <>
          <div
            className={styles.layerContextBackdrop}
            data-testid="layer-context-backdrop"
            onClick={closeContextMenu}
            onContextMenu={handleBackdropContextMenu}
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
            <button
              className={styles.layerContextMenuItem}
              data-testid="context-duplicate"
              onClick={() => { onDuplicate(contextMenu.layerId); setContextMenu(null) }}
            >
              Duplicate
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
            <div
              className={[styles.layerContextMenuItem, styles.layerContextMenuItemSubmenu].filter(Boolean).join(' ')}
              data-testid="context-tags-submenu-trigger"
              onMouseEnter={() => setTagsSubmenuOpen(true)}
              onMouseLeave={() => setTagsSubmenuOpen(false)}
            >
              Tags &gt;
              {tagsSubmenuOpen && (
                <div ref={tagsSubmenuRef} className={[styles.layerTagsSubmenu, tagsSubmenuFlipped && styles.layerTagsSubmenuFlipped].filter(Boolean).join(' ')} data-testid="tags-submenu">
                  {availableTags.length === 0 ? (
                    <div className={styles.layerTagsSubmenuEmpty} data-testid="tags-submenu-empty">No tags created</div>
                  ) : (
                    availableTags.map(tag => {
                      const hasTag = contextLayer?.tags?.includes(tag) ?? false
                      return (
                        <label key={tag} className={styles.layerTagsSubmenuItem}>
                          <input
                            type="checkbox"
                            data-testid={`tag-checkbox-${tag}`}
                            checked={hasTag}
                            onChange={() => {
                              if (hasTag) {
                                onRemoveTagFromLayer(contextMenu.layerId, tag)
                              } else {
                                onAddTagToLayer(contextMenu.layerId, tag)
                              }
                            }}
                          />
                          {tag}
                        </label>
                      )
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
