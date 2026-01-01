import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTabEditorManager } from './useTabEditorManager'
import type { TabInfo } from '../components/TabBar/types'

// Mock filesystem interface
interface MockFileSystem {
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => void
}

describe('useTabEditorManager persistence', () => {
  let mockFileSystem: MockFileSystem

  beforeEach(() => {
    mockFileSystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    }
  })

  describe('saveAllTabs', () => {
    it('should save all dirty tabs', () => {
      const tabs: TabInfo[] = [
        { path: '/a.lua', name: 'a.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/b.lua', name: 'b.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockImplementation((path) =>
        path === '/a.lua' ? 'original-a' : 'original-b'
      )

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/a.lua' } }
      )

      // Modify /a.lua
      act(() => {
        result.current.updateContent('/a.lua', 'modified-a')
      })

      // Switch to /b.lua and modify it
      rerender({ activeTab: '/b.lua' })
      act(() => {
        result.current.updateContent('/b.lua', 'modified-b')
      })

      // Save all
      act(() => {
        result.current.saveAllTabs()
      })

      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/a.lua', 'modified-a')
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/b.lua', 'modified-b')
    })

    it('should NOT save non-dirty tabs', () => {
      const tabs: TabInfo[] = [
        { path: '/a.lua', name: 'a.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/b.lua', name: 'b.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockImplementation((path) =>
        path === '/a.lua' ? 'original-a' : 'original-b'
      )

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/a.lua' } }
      )

      // Only modify /a.lua
      act(() => {
        result.current.updateContent('/a.lua', 'modified-a')
      })

      // Switch to /b.lua but don't modify it
      rerender({ activeTab: '/b.lua' })

      // Save all
      act(() => {
        result.current.saveAllTabs()
      })

      // Only /a.lua should be saved
      expect(mockFileSystem.writeFile).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/a.lua', 'modified-a')
    })

    it('should skip read-only tabs when saving all', () => {
      const tabs: TabInfo[] = [
        { path: '/user/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/lib/readonly.lua', name: 'readonly.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const isPathReadOnly = (path: string) => path.startsWith('/lib/')

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
            isPathReadOnly,
          }),
        { initialProps: { activeTab: '/user/test.lua' } }
      )

      // Modify both tabs
      act(() => {
        result.current.updateContent('/user/test.lua', 'modified')
      })

      rerender({ activeTab: '/lib/readonly.lua' })
      act(() => {
        result.current.updateContent('/lib/readonly.lua', 'modified')
      })

      // Save all
      act(() => {
        result.current.saveAllTabs()
      })

      // Only the non-read-only tab should be saved
      expect(mockFileSystem.writeFile).toHaveBeenCalledTimes(1)
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/user/test.lua', 'modified')
    })
  })

  describe('disposeTab', () => {
    it('should remove tab content from memory', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('content')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.getContent('/test.lua')).toBe('content')

      act(() => {
        result.current.disposeTab('/test.lua')
      })

      expect(result.current.getContent('/test.lua')).toBe('')
    })

    it('should remove tab from MRU list', () => {
      const tabs: TabInfo[] = [
        { path: '/a.lua', name: 'a.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/b.lua', name: 'b.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/a.lua' } }
      )

      rerender({ activeTab: '/b.lua' })
      expect(result.current.mountedTabs).toContain('/a.lua')

      act(() => {
        result.current.disposeTab('/a.lua')
      })

      expect(result.current.mountedTabs).not.toContain('/a.lua')
    })

    it('should be a no-op for non-existent tab', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('content')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      const contentBefore = result.current.getContent('/test.lua')

      act(() => {
        result.current.disposeTab('/nonexistent.lua')
      })

      // Existing content should be unchanged
      expect(result.current.getContent('/test.lua')).toBe(contentBefore)
    })
  })

  describe('getActiveContent', () => {
    it('should return content of the active tab', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('active content')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.getActiveContent()).toBe('active content')
    })

    it('should return empty string when no active tab', () => {
      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs: [],
          activeTab: null,
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.getActiveContent()).toBe('')
    })
  })

  describe('onDirtyChange callback', () => {
    it('should call onDirtyChange when dirty state changes', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const onDirtyChange = vi.fn()

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
          onDirtyChange,
        })
      )

      act(() => {
        result.current.updateContent('/test.lua', 'modified')
      })

      expect(onDirtyChange).toHaveBeenCalledWith('/test.lua', true)
    })

    it('should NOT call onDirtyChange when dirty state does not change', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const onDirtyChange = vi.fn()

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
          onDirtyChange,
        })
      )

      // First change - dirty becomes true
      act(() => {
        result.current.updateContent('/test.lua', 'modified')
      })

      expect(onDirtyChange).toHaveBeenCalledTimes(1)
      onDirtyChange.mockClear()

      // Another change but still dirty
      act(() => {
        result.current.updateContent('/test.lua', 'still modified')
      })

      // Should NOT have been called since dirty state didn't change
      expect(onDirtyChange).not.toHaveBeenCalled()
    })

    it('should call onDirtyChange with false when content returns to original', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const onDirtyChange = vi.fn()

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
          onDirtyChange,
        })
      )

      act(() => {
        result.current.updateContent('/test.lua', 'modified')
      })

      onDirtyChange.mockClear()

      act(() => {
        result.current.updateContent('/test.lua', 'original')
      })

      expect(onDirtyChange).toHaveBeenCalledWith('/test.lua', false)
    })
  })

  describe('content reloading on window focus', () => {
    it('should reload content for non-dirty tabs when requested', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.getContent('/test.lua')).toBe('original')

      // Simulate external file change
      vi.mocked(mockFileSystem.readFile).mockReturnValue('externally modified')

      act(() => {
        result.current.refreshFromFilesystem('/test.lua')
      })

      expect(result.current.getContent('/test.lua')).toBe('externally modified')
    })

    it('should NOT reload dirty tabs', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      act(() => {
        result.current.updateContent('/test.lua', 'my changes')
      })

      // Simulate external file change
      vi.mocked(mockFileSystem.readFile).mockReturnValue('externally modified')

      act(() => {
        result.current.refreshFromFilesystem('/test.lua')
      })

      // Should NOT reload because tab is dirty
      expect(result.current.getContent('/test.lua')).toBe('my changes')
    })

    it('should load content on refresh for unloaded tabs', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('new content')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: null,
          filesystem: mockFileSystem,
        })
      )

      // Tab was never loaded
      expect(result.current.getContent('/test.lua')).toBe('')

      act(() => {
        result.current.refreshFromFilesystem('/test.lua')
      })

      expect(result.current.getContent('/test.lua')).toBe('new content')
    })

    it('should handle null content from filesystem gracefully', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      // Now file returns null (deleted)
      vi.mocked(mockFileSystem.readFile).mockReturnValue(null)

      act(() => {
        result.current.refreshFromFilesystem('/test.lua')
      })

      // Content should remain unchanged when file returns null
      expect(result.current.getContent('/test.lua')).toBe('original')
    })
  })

  describe('updateContent for unloaded tabs', () => {
    it('should load originalContent from filesystem when updating unloaded tab', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original from fs')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: null,
          filesystem: mockFileSystem,
        })
      )

      // Tab not active, so not loaded
      expect(result.current.getContent('/test.lua')).toBe('')

      // Update content for unloaded tab
      act(() => {
        result.current.updateContent('/test.lua', 'new content')
      })

      expect(result.current.getContent('/test.lua')).toBe('new content')
      // Should be dirty because new content differs from original
      expect(result.current.isDirty('/test.lua')).toBe(true)
    })
  })

  describe('isDirty for non-existent tabs', () => {
    it('should return false for tabs that have not been loaded', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: null,
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.isDirty('/test.lua')).toBe(false)
      expect(result.current.isDirty('/nonexistent.lua')).toBe(false)
    })
  })
})
