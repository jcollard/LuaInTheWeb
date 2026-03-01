import type { Layer } from './types'
import styles from './AnsiGraphicsEditor.module.css'

export interface LayerContextMenuProps {
  contextMenu: { layerId: string; x: number; y: number }
  contextLayer: Layer | undefined
  contextIsGroup: boolean
  contextHasParentId: boolean
  firstLayerId: string | undefined
  availableTags: string[]
  tagsSubmenuOpen: boolean
  tagsSubmenuFlipped: boolean
  tagsSubmenuRef: (el: HTMLDivElement | null) => void
  onMergeDown: (id: string) => void
  onWrapInGroup: (id: string) => void
  onDuplicate: (id: string) => void
  onRemoveFromGroup: (id: string) => void
  onAddTagToLayer: (layerId: string, tag: string) => void
  onRemoveTagFromLayer: (layerId: string, tag: string) => void
  onSetTagsSubmenuOpen: (open: boolean) => void
  onClose: () => void
  onBackdropContextMenu: (e: React.MouseEvent) => void
}

export function LayerContextMenu({
  contextMenu,
  contextLayer,
  contextIsGroup,
  contextHasParentId,
  firstLayerId,
  availableTags,
  tagsSubmenuOpen,
  tagsSubmenuFlipped,
  tagsSubmenuRef,
  onMergeDown,
  onWrapInGroup,
  onDuplicate,
  onRemoveFromGroup,
  onAddTagToLayer,
  onRemoveTagFromLayer,
  onSetTagsSubmenuOpen,
  onClose,
  onBackdropContextMenu,
}: LayerContextMenuProps): React.JSX.Element {
  const close = onClose
  return (
    <>
      <div
        className={styles.layerContextBackdrop}
        data-testid="layer-context-backdrop"
        onClick={close}
        onContextMenu={onBackdropContextMenu}
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
            onClick={() => { onMergeDown(contextMenu.layerId); close() }}
            disabled={contextMenu.layerId === firstLayerId}
          >
            Merge Down
          </button>
        )}
        <button
          className={styles.layerContextMenuItem}
          data-testid="context-wrap-in-group"
          onClick={() => { onWrapInGroup(contextMenu.layerId); close() }}
        >
          Group with new folder
        </button>
        <button
          className={styles.layerContextMenuItem}
          data-testid="context-duplicate"
          onClick={() => { onDuplicate(contextMenu.layerId); close() }}
        >
          Duplicate
        </button>
        {contextHasParentId && (
          <button
            className={styles.layerContextMenuItem}
            data-testid="context-remove-from-group"
            onClick={() => { onRemoveFromGroup(contextMenu.layerId); close() }}
          >
            Remove from group
          </button>
        )}
        <button
          className={styles.layerContextMenuItem}
          data-testid="context-copy-layer-id"
          onClick={() => { void navigator.clipboard.writeText(contextMenu.layerId); close() }}
        >
          Copy Layer ID
        </button>
        <div
          className={[styles.layerContextMenuItem, styles.layerContextMenuItemSubmenu].filter(Boolean).join(' ')}
          data-testid="context-tags-submenu-trigger"
          onMouseEnter={() => onSetTagsSubmenuOpen(true)}
          onMouseLeave={() => onSetTagsSubmenuOpen(false)}
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
  )
}
