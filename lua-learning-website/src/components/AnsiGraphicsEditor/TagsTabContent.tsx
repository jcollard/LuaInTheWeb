import { useState, useCallback } from 'react'
import type { Layer } from './types'
import { filterTagsTab } from './layerUtils'
import styles from './AnsiGraphicsEditor.module.css'

export interface TagsTabContentProps {
  layers: Layer[]
  availableTags: string[]
  activeLayerId: string
  expandedTags: Set<string>
  searchQuery?: string
  onSetActive: (id: string) => void
  onCreateTag: (tag: string) => void
  onDeleteTag: (tag: string) => void
  onRenameTag: (oldTag: string, newTag: string) => void
  onToggleVisibility: (id: string) => void
  onSetLayerVisibility: (ids: string[], visible: boolean) => void
  onRenameLayer: (id: string, name: string) => void
  onToggleExpanded: (tag: string) => void
}

export function TagsTabContent({
  layers,
  availableTags,
  activeLayerId,
  expandedTags,
  searchQuery,
  onSetActive,
  onCreateTag,
  onDeleteTag,
  onRenameTag,
  onToggleVisibility,
  onSetLayerVisibility,
  onRenameLayer,
  onToggleExpanded,
}: TagsTabContentProps) {
  const [newTagValue, setNewTagValue] = useState('')
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editTagValue, setEditTagValue] = useState('')
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null)
  const [editLayerValue, setEditLayerValue] = useState('')
  const [editLayerOriginal, setEditLayerOriginal] = useState('')

  const startRenameLayer = useCallback((id: string, currentName: string) => {
    setEditingLayerId(id)
    setEditLayerValue(currentName)
    setEditLayerOriginal(currentName)
  }, [])

  const commitRenameLayer = useCallback(() => {
    const trimmed = editLayerValue.trim()
    if (editingLayerId && trimmed && trimmed !== editLayerOriginal) {
      onRenameLayer(editingLayerId, trimmed)
    }
    setEditingLayerId(null)
  }, [editingLayerId, editLayerValue, editLayerOriginal, onRenameLayer])

  const handleCreateTag = useCallback(() => {
    const trimmed = newTagValue.trim()
    if (trimmed && !availableTags.includes(trimmed)) {
      onCreateTag(trimmed)
      setNewTagValue('')
    }
  }, [newTagValue, availableTags, onCreateTag])

  const startRenameTag = useCallback((tag: string) => {
    setEditingTag(tag)
    setEditTagValue(tag)
  }, [])

  const commitRenameTag = useCallback(() => {
    if (editingTag && editTagValue.trim() && editTagValue.trim() !== editingTag) {
      onRenameTag(editingTag, editTagValue.trim())
    }
    setEditingTag(null)
  }, [editingTag, editTagValue, onRenameTag])

  const query = searchQuery ?? ''
  const filteredTags = filterTagsTab(availableTags, layers, query)
  const isFiltering = query.trim() !== ''

  return (
    <div className={styles.tagsTabContent} data-testid="tags-tab-content">
      <div className={styles.tagNewRow}>
        <input
          className={styles.tagNewInput}
          data-testid="new-tag-input"
          value={newTagValue}
          onChange={e => setNewTagValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleCreateTag() }}
          placeholder="New tag..."
        />
        <button
          className={styles.layersPanelAdd}
          data-testid="new-tag-button"
          onClick={handleCreateTag}
          disabled={!newTagValue.trim() || availableTags.includes(newTagValue.trim())}
        >
          +
        </button>
      </div>
      {availableTags.length === 0 ? (
        <div className={styles.tagsEmpty} data-testid="tags-empty">No tags yet. Create one above.</div>
      ) : filteredTags.length === 0 && isFiltering ? (
        <div className={styles.tagsEmpty} data-testid="tags-search-empty">No matching tags</div>
      ) : (
        filteredTags.map(({ tag, layers: tagLayers }) => {
          const isCollapsed = !expandedTags.has(tag)
          const isEditing = editingTag === tag
          const allVisible = tagLayers.every(l => l.visible)
          return (
            <div key={tag} data-testid={`tag-section-${tag}`}>
              <div
                className={styles.tagHeading}
                data-testid={`tag-heading-${tag}`}
                onClick={() => onToggleExpanded(tag)}
                onDoubleClick={() => startRenameTag(tag)}
              >
                <span>{isCollapsed ? '\u25B6' : '\u25BC'}</span>
                <button
                  className={styles.layerVisibility}
                  data-testid={`tag-visibility-${tag}`}
                  onClick={e => {
                    e.stopPropagation()
                    onSetLayerVisibility(tagLayers.map(l => l.id), !allVisible)
                  }}
                  aria-label="Toggle tag visibility"
                  title="Toggle tag visibility"
                >
                  {allVisible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
                </button>
                {isEditing ? (
                  <input
                    className={styles.tagNewInput}
                    data-testid={`tag-rename-input-${tag}`}
                    value={editTagValue}
                    onChange={e => setEditTagValue(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitRenameTag()
                      if (e.key === 'Escape') setEditingTag(null)
                    }}
                    onBlur={commitRenameTag}
                    onClick={e => e.stopPropagation()}
                    autoFocus
                  />
                ) : (
                  <span className={styles.tagHeadingName}>{tag}</span>
                )}
                <span className={styles.tagLayerCount}>({tagLayers.length})</span>
                <button
                  className={styles.tagDeleteBtn}
                  data-testid={`tag-delete-${tag}`}
                  onClick={e => { e.stopPropagation(); onDeleteTag(tag) }}
                  title="Delete tag"
                >
                  ×
                </button>
              </div>
              {!isCollapsed && tagLayers.map(layer => (
                <div
                  key={layer.id}
                  className={[styles.tagLayerRow, layer.id === activeLayerId && styles.tagLayerRowActive].filter(Boolean).join(' ')}
                  data-testid={`tag-layer-row-${tag}-${layer.id}`}
                  onClick={() => onSetActive(layer.id)}
                >
                  <button
                    className={styles.layerVisibility}
                    onClick={e => { e.stopPropagation(); onToggleVisibility(layer.id) }}
                    onDoubleClick={e => e.stopPropagation()}
                    aria-label="Toggle visibility"
                    title="Toggle visibility"
                  >
                    {layer.visible ? '\u{1F441}' : '\u{1F441}\u{200D}\u{1F5E8}'}
                  </button>
                  <span
                    className={styles.layerName}
                    onDoubleClick={e => { e.stopPropagation(); startRenameLayer(layer.id, layer.name) }}
                  >
                    {editingLayerId === layer.id ? (
                      <input
                        className={styles.layerNameInput}
                        data-testid={`tag-layer-rename-input-${layer.id}`}
                        value={editLayerValue}
                        onChange={e => setEditLayerValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') commitRenameLayer()
                          if (e.key === 'Escape') setEditingLayerId(null)
                        }}
                        onBlur={commitRenameLayer}
                        onClick={e => e.stopPropagation()}
                        autoFocus
                      />
                    ) : (
                      layer.name
                    )}
                  </span>
                </div>
              ))}
            </div>
          )
        })
      )}
    </div>
  )
}
