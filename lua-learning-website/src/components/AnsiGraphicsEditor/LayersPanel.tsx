import { useState, useCallback, useEffect } from 'react'
import type { Layer } from './types'
import { isGroupLayer, isDrawableLayer, getParentId } from './types'
import { getAncestorGroupIds, buildDisplayOrder, filterLayers } from './layerUtils'
import { LayerRow } from './LayerRow'
import { TagsTabContent } from './TagsTabContent'
import { useLayerDragDrop } from './useLayerDragDrop'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayersPanelProps {
  filePath?: string
  layers: Layer[]
  activeLayerId: string
  onSetActive: (id: string) => void
  onToggleVisibility: (id: string) => void
  onSetLayerVisibility: (ids: string[], visible: boolean) => void
  onRename: (id: string, name: string) => void
  onChangeLayerId: (oldId: string, newId: string) => { success: boolean; error?: string }
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

const EXPANDED_TAGS_PREFIX = 'ansi-expanded-tags:'

function loadExpandedTags(filePath?: string): Set<string> {
  if (!filePath) return new Set()
  try {
    const raw = localStorage.getItem(`${EXPANDED_TAGS_PREFIX}${filePath}`)
    const parsed = raw ? JSON.parse(raw) : null
    if (Array.isArray(parsed) && parsed.every((s: unknown) => typeof s === 'string')) return new Set(parsed as string[])
  } catch { /* ignore corrupt data */ }
  return new Set()
}

export function LayersPanel({
  filePath,
  layers,
  activeLayerId,
  onSetActive,
  onToggleVisibility,
  onSetLayerVisibility,
  onRename,
  onChangeLayerId,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editingIdFor, setEditingIdFor] = useState<string | null>(null)
  const [editIdValue, setEditIdValue] = useState('')
  const [idError, setIdError] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ layerId: string; x: number; y: number } | null>(null)
  const [tagsSubmenuOpen, setTagsSubmenuOpen] = useState(false)
  const [tagsSubmenuFlipped, setTagsSubmenuFlipped] = useState(false)
  const [expandedTags, setExpandedTags] = useState<Set<string>>(() => loadExpandedTags(filePath))

  const toggleTagExpanded = useCallback((tag: string) => {
    setExpandedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      if (filePath) {
        try {
          localStorage.setItem(`${EXPANDED_TAGS_PREFIX}${filePath}`, JSON.stringify([...next]))
        } catch { /* quota exceeded, etc. */ }
      }
      return next
    })
  }, [filePath])

  const {
    draggedId, dropZoneTargetId, dropOnGroup, draggedGroupChildIds,
    handleDragStart, handleDragEnd, handleDragOverGroup, handleDragOverZone,
    handleDropOnBottomZone, handleDropOnZone, handleDropOnGroup,
  } = useLayerDragDrop(layers, onReorder)

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

  const startEditId = useCallback((layerId: string) => {
    setEditingIdFor(layerId)
    setEditIdValue(layerId)
    setIdError(null)
  }, [])

  const commitEditId = useCallback(() => {
    if (!editingIdFor) return
    const trimmed = editIdValue.trim()
    if (trimmed === editingIdFor) {
      setEditingIdFor(null)
      setIdError(null)
      return
    }
    const result = onChangeLayerId(editingIdFor, trimmed)
    if (result.success) {
      setEditingIdFor(null)
      setIdError(null)
    } else {
      setIdError(result.error ?? 'Invalid ID')
    }
  }, [editingIdFor, editIdValue, onChangeLayerId])

  const cancelEditId = useCallback(() => {
    setEditingIdFor(null)
    setIdError(null)
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
  const filteredLayers = filterLayers(layers, searchQuery)
  const reversed = buildDisplayOrder(filteredLayers)
  const drawableCount = layers.filter(isDrawableLayer).length
  const singleDrawable = drawableCount <= 1
  const singleLayer = layers.length <= 1

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
      <div className={styles.layerSearchRow}>
        <input
          className={styles.layerSearchInput}
          data-testid="layer-search-input"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Filter layers..."
        />
      </div>
      {activeTab === 'tags' ? (
        <TagsTabContent
          layers={layers}
          availableTags={availableTags}
          activeLayerId={activeLayerId}
          expandedTags={expandedTags}
          searchQuery={searchQuery}
          onSetActive={onSetActive}
          onCreateTag={onCreateTag}
          onDeleteTag={onDeleteTag}
          onRenameTag={onRenameTag}
          onToggleVisibility={onToggleVisibility}
          onSetLayerVisibility={onSetLayerVisibility}
          onRenameLayer={onRename}
          onToggleExpanded={toggleTagExpanded}
        />
      ) : (
      <div className={styles.layersList}>
        {reversed.length === 0 && searchQuery.trim() !== '' && (
          <div className={styles.layersEmpty} data-testid="layers-empty">No matching layers</div>
        )}
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
              isEditingId={editingIdFor === layer.id}
              editIdValue={editIdValue}
              idError={editingIdFor === layer.id ? (idError ?? undefined) : undefined}
              onStartEditId={() => startEditId(layer.id)}
              onEditIdChange={setEditIdValue}
              onCommitEditId={commitEditId}
              onCancelEditId={cancelEditId}
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
            <button
              className={styles.layerContextMenuItem}
              data-testid="context-copy-layer-id"
              onClick={() => { void navigator.clipboard.writeText(contextMenu.layerId); closeContextMenu() }}
            >
              Copy Layer ID
            </button>
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
