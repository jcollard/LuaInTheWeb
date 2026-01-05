import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  CLEARABLE_ITEMS,
  getClearableItems,
  clearItems,
  clearAllCache,
} from './cacheManager'
import type { ClearableItem } from './types'

// Mock IndexedDB
const mockDeleteDatabase = vi.fn()
const originalIndexedDB = globalThis.indexedDB

describe('cacheManager', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()

    // Setup IndexedDB mock
    globalThis.indexedDB = {
      ...originalIndexedDB,
      deleteDatabase: mockDeleteDatabase.mockReturnValue({
        onsuccess: null,
        onerror: null,
      }),
    } as unknown as IDBFactory
  })

  afterEach(() => {
    globalThis.indexedDB = originalIndexedDB
  })

  describe('CLEARABLE_ITEMS', () => {
    it('should define all expected clearable items', () => {
      const expectedItems: ClearableItem[] = [
        'workspaceFiles',
        'directoryHandles',
        'workspaceMetadata',
        'recentFiles',
        'panelLayout',
        'tabBarState',
        'explorerState',
        'editorPrefs',
        'theme',
      ]

      expect(Object.keys(CLEARABLE_ITEMS)).toHaveLength(expectedItems.length)
      for (const item of expectedItems) {
        expect(CLEARABLE_ITEMS).toHaveProperty(item)
      }
    })

    it('should mark dangerous items correctly', () => {
      expect(CLEARABLE_ITEMS.workspaceFiles.dangerous).toBe(true)
      expect(CLEARABLE_ITEMS.workspaceMetadata.dangerous).toBe(true)
      expect(CLEARABLE_ITEMS.directoryHandles.dangerous).toBe(false)
      expect(CLEARABLE_ITEMS.recentFiles.dangerous).toBe(false)
      expect(CLEARABLE_ITEMS.theme.dangerous).toBe(false)
    })

    it('should have label and description for all items', () => {
      for (const item of Object.values(CLEARABLE_ITEMS)) {
        expect(item.label).toBeDefined()
        expect(item.label.length).toBeGreaterThan(0)
        expect(item.description).toBeDefined()
        expect(item.description.length).toBeGreaterThan(0)
      }
    })
  })

  describe('getClearableItems', () => {
    it('should return all clearable items', () => {
      const items = getClearableItems()
      expect(items).toBe(CLEARABLE_ITEMS)
    })
  })

  describe('clearItems', () => {
    beforeEach(() => {
      // Populate localStorage with test data
      localStorage.setItem('lua-ide-theme', 'dark')
      localStorage.setItem('lua-ide-filesystem', '{}')
      localStorage.setItem('lua-workspaces', '[]')
      localStorage.setItem('lua-ide-recent-files', '[]')
      localStorage.setItem('ide-panel:main', '[50,50]')
      localStorage.setItem('ide-panel:sidebar', '[30,70]')
      localStorage.setItem('lua-ide-tab-state', '{}')
      localStorage.setItem('lua-ide-explorer-expanded', '[]')
      localStorage.setItem('ide-auto-save-enabled', 'true')
      localStorage.setItem('lua-ide-auto-indent', 'true')
      localStorage.setItem('canvas-scaling:mode', 'fit')
    })

    it('should clear theme storage', async () => {
      await clearItems(['theme'])
      expect(localStorage.getItem('lua-ide-theme')).toBeNull()
      // Other items should remain
      expect(localStorage.getItem('lua-workspaces')).toBe('[]')
    })

    it('should clear directory handles storage', async () => {
      await clearItems(['directoryHandles'])
      expect(localStorage.getItem('lua-ide-filesystem')).toBeNull()
    })

    it('should clear workspace metadata storage', async () => {
      await clearItems(['workspaceMetadata'])
      expect(localStorage.getItem('lua-workspaces')).toBeNull()
    })

    it('should clear recent files storage', async () => {
      await clearItems(['recentFiles'])
      expect(localStorage.getItem('lua-ide-recent-files')).toBeNull()
    })

    it('should clear panel layout storage (all keys with prefix)', async () => {
      await clearItems(['panelLayout'])
      expect(localStorage.getItem('ide-panel:main')).toBeNull()
      expect(localStorage.getItem('ide-panel:sidebar')).toBeNull()
    })

    it('should clear tab bar state storage', async () => {
      await clearItems(['tabBarState'])
      expect(localStorage.getItem('lua-ide-tab-state')).toBeNull()
    })

    it('should clear explorer state storage', async () => {
      await clearItems(['explorerState'])
      expect(localStorage.getItem('lua-ide-explorer-expanded')).toBeNull()
    })

    it('should clear editor preferences (multiple keys)', async () => {
      await clearItems(['editorPrefs'])
      expect(localStorage.getItem('ide-auto-save-enabled')).toBeNull()
      expect(localStorage.getItem('lua-ide-auto-indent')).toBeNull()
      expect(localStorage.getItem('canvas-scaling:mode')).toBeNull()
    })

    it('should clear workspace files from IndexedDB', async () => {
      const deleteRequest = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null }
      mockDeleteDatabase.mockReturnValue(deleteRequest)

      const promise = clearItems(['workspaceFiles'])

      // Simulate successful deletion
      deleteRequest.onsuccess?.()

      await promise
      expect(mockDeleteDatabase).toHaveBeenCalledWith('lua-workspace-files')
    })

    it('should clear multiple items at once', async () => {
      const deleteRequest = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null }
      mockDeleteDatabase.mockReturnValue(deleteRequest)

      const promise = clearItems(['theme', 'recentFiles', 'workspaceFiles'])

      deleteRequest.onsuccess?.()

      await promise

      expect(localStorage.getItem('lua-ide-theme')).toBeNull()
      expect(localStorage.getItem('lua-ide-recent-files')).toBeNull()
      expect(mockDeleteDatabase).toHaveBeenCalledWith('lua-workspace-files')
    })

    it('should handle empty array gracefully', async () => {
      await clearItems([])
      // All items should remain
      expect(localStorage.getItem('lua-ide-theme')).toBe('dark')
    })

    it('should handle IndexedDB deletion error gracefully', async () => {
      const deleteRequest = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null }
      mockDeleteDatabase.mockReturnValue(deleteRequest)

      const promise = clearItems(['workspaceFiles'])

      // Simulate error
      deleteRequest.onerror?.()

      // Should not throw, just resolve
      await expect(promise).resolves.toBeUndefined()
    })
  })

  describe('clearAllCache', () => {
    beforeEach(() => {
      localStorage.setItem('lua-ide-theme', 'dark')
      localStorage.setItem('lua-ide-filesystem', '{}')
      localStorage.setItem('lua-workspaces', '[]')
      localStorage.setItem('lua-ide-recent-files', '[]')
      localStorage.setItem('ide-panel:main', '[50,50]')
      localStorage.setItem('lua-ide-tab-state', '{}')
      localStorage.setItem('lua-ide-explorer-expanded', '[]')
      localStorage.setItem('ide-auto-save-enabled', 'true')
      localStorage.setItem('lua-ide-auto-indent', 'true')
      localStorage.setItem('canvas-scaling:mode', 'fit')
      // Add an unrelated item that should NOT be cleared
      localStorage.setItem('unrelated-key', 'should-remain')
    })

    it('should clear all cache items', async () => {
      const deleteRequest = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null }
      mockDeleteDatabase.mockReturnValue(deleteRequest)

      const promise = clearAllCache()
      deleteRequest.onsuccess?.()

      await promise

      expect(localStorage.getItem('lua-ide-theme')).toBeNull()
      expect(localStorage.getItem('lua-ide-filesystem')).toBeNull()
      expect(localStorage.getItem('lua-workspaces')).toBeNull()
      expect(localStorage.getItem('lua-ide-recent-files')).toBeNull()
      expect(localStorage.getItem('ide-panel:main')).toBeNull()
      expect(localStorage.getItem('lua-ide-tab-state')).toBeNull()
      expect(localStorage.getItem('lua-ide-explorer-expanded')).toBeNull()
      expect(localStorage.getItem('ide-auto-save-enabled')).toBeNull()
      expect(localStorage.getItem('lua-ide-auto-indent')).toBeNull()
      expect(localStorage.getItem('canvas-scaling:mode')).toBeNull()
      expect(mockDeleteDatabase).toHaveBeenCalledWith('lua-workspace-files')
    })

    it('should not clear unrelated localStorage keys', async () => {
      const deleteRequest = { onsuccess: null as (() => void) | null, onerror: null as (() => void) | null }
      mockDeleteDatabase.mockReturnValue(deleteRequest)

      const promise = clearAllCache()
      deleteRequest.onsuccess?.()

      await promise

      expect(localStorage.getItem('unrelated-key')).toBe('should-remain')
    })
  })
})
