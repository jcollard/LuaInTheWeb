/**
 * Tests for IDEContext tab validation on initialization
 */
import { describe, it, expect, vi } from 'vitest'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'
import type { PersistedTabState } from '../TabBar/useTabBarPersistence'
import type { TabInfo } from '../TabBar'

// Mock filesystem for testing
const createMockFileSystem = (existingFiles: string[]): Partial<UseFileSystemReturn> => ({
  exists: (path: string) => existingFiles.includes(path),
  readFile: vi.fn((path: string) => existingFiles.includes(path) ? 'content' : null),
  isDirectory: vi.fn(() => false),
})

/**
 * Test the tab filtering logic that will be used in IDEContext
 * This simulates the useMemo logic from IDEContext.tsx lines 28-57
 */
function filterMissingFileTabs(
  savedState: PersistedTabState | null,
  filesystem: Partial<UseFileSystemReturn>,
  showError: (message: string) => void
): TabInfo[] {
  if (!savedState) return []

  const missingFiles: string[] = []
  const validTabs = savedState.tabs.filter((tab) => {
    // Only validate file tabs (skip canvas tabs and other non-file types)
    if (tab.type !== 'file' && tab.type !== 'binary') return true

    // Check if file exists
    const exists = filesystem.exists!(tab.path)
    if (!exists) {
      missingFiles.push(tab.name)
      return false
    }
    return true
  })

  // Show notification if files were filtered
  if (missingFiles.length > 0) {
    const message = missingFiles.length === 1
      ? `Closed tab for missing file: ${missingFiles[0]}`
      : `Closed ${missingFiles.length} tabs for missing files: ${missingFiles.join(', ')}`
    showError(message)
  }

  return validTabs.map((tab) => ({
    ...tab,
    isDirty: false,
  }))
}

describe('IDEContext tab validation', () => {
  describe('initialTabs with missing file validation', () => {
    it('should filter out tabs for missing files on initialization', () => {
      // Arrange
      const savedState: PersistedTabState = {
        tabs: [
          { path: '/existing.lua', name: 'existing.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/missing.lua', name: 'missing.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/existing.lua',
      }

      const filesystem = createMockFileSystem(['/existing.lua'])
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(1)
      expect(initialTabs[0].path).toBe('/existing.lua')
      expect(showError).toHaveBeenCalledWith('Closed tab for missing file: missing.lua')
    })

    it('should show error toast when tabs are closed', () => {
      // Arrange
      const savedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }

      const filesystem = createMockFileSystem([]) // No files exist
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(0)
      expect(showError).toHaveBeenCalledTimes(1)
    })

    it('should list all closed file names in notification', () => {
      // Arrange
      const savedState: PersistedTabState = {
        tabs: [
          { path: '/valid.lua', name: 'valid.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/missing1.lua', name: 'missing1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/missing2.png', name: 'missing2.png', type: 'binary', isPinned: false, isPreview: false },
        ],
        activeTab: '/valid.lua',
      }

      const filesystem = createMockFileSystem(['/valid.lua'])
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(1)
      expect(showError).toHaveBeenCalledWith(
        'Closed 2 tabs for missing files: missing1.lua, missing2.png'
      )
    })

    it('should not validate canvas tabs (skip non-file types)', () => {
      // Arrange
      const savedState: PersistedTabState = {
        tabs: [
          { path: '/canvas', name: 'Canvas', type: 'canvas', isPinned: false, isPreview: false },
          { path: '/missing.lua', name: 'missing.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/canvas',
      }

      const filesystem = createMockFileSystem([]) // No files exist
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(1)
      expect(initialTabs[0].type).toBe('canvas')
      expect(showError).toHaveBeenCalledWith('Closed tab for missing file: missing.lua')
    })

    it('should handle scenario where all files exist (no filtering needed)', () => {
      // Arrange
      const savedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }

      const filesystem = createMockFileSystem(['/file1.lua', '/file2.lua'])
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(2)
      expect(showError).not.toHaveBeenCalled()
    })

    it('should handle empty savedState gracefully', () => {
      // Arrange
      const savedState = null
      const filesystem = createMockFileSystem([])
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(0)
      expect(showError).not.toHaveBeenCalled()
    })

    it('should validate binary file tabs same as regular files', () => {
      // Arrange
      const savedState: PersistedTabState = {
        tabs: [
          { path: '/existing.png', name: 'existing.png', type: 'binary', isPinned: false, isPreview: false },
          { path: '/missing.jpg', name: 'missing.jpg', type: 'binary', isPinned: false, isPreview: false },
        ],
        activeTab: '/existing.png',
      }

      const filesystem = createMockFileSystem(['/existing.png'])
      const showError = vi.fn()

      // Act
      const initialTabs = filterMissingFileTabs(savedState, filesystem, showError)

      // Assert
      expect(initialTabs).toHaveLength(1)
      expect(initialTabs[0].path).toBe('/existing.png')
      expect(showError).toHaveBeenCalledWith('Closed tab for missing file: missing.jpg')
    })
  })
})
