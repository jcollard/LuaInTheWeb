/**
 * Cache management utilities for clearing application data.
 *
 * Provides functions to selectively clear localStorage and IndexedDB data
 * used by the application.
 */

import type { ClearableItem, ClearableItemsMap } from './types'

/**
 * IndexedDB database name for workspace files.
 */
const WORKSPACE_DB_NAME = 'lua-workspace-files'

/**
 * localStorage key mappings for each clearable item type.
 */
const STORAGE_KEYS: Record<ClearableItem, string[]> = {
  workspaceFiles: [], // IndexedDB, handled separately
  directoryHandles: ['lua-ide-filesystem'],
  workspaceMetadata: ['lua-workspaces'],
  recentFiles: ['lua-ide-recent-files'],
  panelLayout: [], // Prefix-based, handled separately
  tabBarState: ['lua-ide-tab-state'],
  explorerState: ['lua-ide-explorer-expanded'],
  editorPrefs: ['ide-auto-save-enabled', 'lua-ide-auto-indent', 'canvas-scaling:mode'],
  theme: ['lua-ide-theme'],
}

/**
 * localStorage key prefix for panel layout.
 */
const PANEL_LAYOUT_PREFIX = 'ide-panel:'

/**
 * All clearable cache items with their metadata.
 */
export const CLEARABLE_ITEMS: ClearableItemsMap = {
  workspaceFiles: {
    label: 'Workspace Files',
    description: 'All files stored in virtual workspaces',
    dangerous: true,
  },
  directoryHandles: {
    label: 'Local Folder Links',
    description: 'Connections to local folders',
    dangerous: false,
  },
  workspaceMetadata: {
    label: 'Workspace List',
    description: 'Names and configuration of workspaces',
    dangerous: true,
  },
  recentFiles: {
    label: 'Recent Files',
    description: 'Recently opened files list',
    dangerous: false,
  },
  panelLayout: {
    label: 'Panel Layout',
    description: 'Sidebar and panel sizes',
    dangerous: false,
  },
  tabBarState: {
    label: 'Open Tabs',
    description: 'Currently open editor tabs',
    dangerous: false,
  },
  explorerState: {
    label: 'File Explorer State',
    description: 'Expanded folders in file tree',
    dangerous: false,
  },
  editorPrefs: {
    label: 'Editor Preferences',
    description: 'Auto-save, auto-indent settings',
    dangerous: false,
  },
  theme: {
    label: 'Theme Preference',
    description: 'Light/dark mode setting',
    dangerous: false,
  },
}

/**
 * Get all clearable items with their metadata.
 */
export function getClearableItems(): ClearableItemsMap {
  return CLEARABLE_ITEMS
}

/**
 * Clear localStorage keys matching a prefix.
 */
function clearLocalStorageByPrefix(prefix: string): void {
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(prefix)) {
      keysToRemove.push(key)
    }
  }
  for (const key of keysToRemove) {
    localStorage.removeItem(key)
  }
}

/**
 * Delete the workspace files IndexedDB database.
 */
function deleteWorkspaceDatabase(): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(WORKSPACE_DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve() // Resolve even on error to not block other operations
  })
}

/**
 * Clear specified cache items.
 *
 * @param items - Array of item types to clear
 */
export async function clearItems(items: ClearableItem[]): Promise<void> {
  const promises: Promise<void>[] = []

  for (const item of items) {
    // Handle IndexedDB for workspace files
    if (item === 'workspaceFiles') {
      promises.push(deleteWorkspaceDatabase())
      continue
    }

    // Handle prefix-based localStorage keys
    if (item === 'panelLayout') {
      clearLocalStorageByPrefix(PANEL_LAYOUT_PREFIX)
      continue
    }

    // Handle direct localStorage keys
    const keys = STORAGE_KEYS[item]
    for (const key of keys) {
      localStorage.removeItem(key)
    }
  }

  await Promise.all(promises)
}

/**
 * Clear all application cache data.
 */
export async function clearAllCache(): Promise<void> {
  const allItems = Object.keys(CLEARABLE_ITEMS) as ClearableItem[]
  await clearItems(allItems)
}
