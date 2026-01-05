/**
 * Types for cache management functionality.
 */

/**
 * Metadata for a clearable cache item.
 */
export interface ClearableItemInfo {
  /** User-friendly label */
  label: string
  /** Description of what this cache item stores */
  description: string
  /** Whether clearing this item could cause data loss */
  dangerous: boolean
}

/**
 * All clearable cache item types.
 */
export type ClearableItem =
  | 'workspaceFiles'
  | 'directoryHandles'
  | 'workspaceMetadata'
  | 'recentFiles'
  | 'panelLayout'
  | 'tabBarState'
  | 'explorerState'
  | 'editorPrefs'
  | 'theme'

/**
 * Map of clearable items to their metadata.
 */
export type ClearableItemsMap = Record<ClearableItem, ClearableItemInfo>
