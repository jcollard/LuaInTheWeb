import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useTabEditorManager } from './useTabEditorManager'
import type { TabInfo } from '../components/TabBar/types'

// Mock filesystem interface
interface MockFileSystem {
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => void
}

describe('useTabEditorManager', () => {
  let mockFileSystem: MockFileSystem

  beforeEach(() => {
    mockFileSystem = {
      readFile: vi.fn(),
      writeFile: vi.fn(),
    }
  })

  describe('initialization', () => {
    it('should initialize with empty tab content', () => {
      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs: [],
          activeTab: null,
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.mountedTabs).toEqual([])
      expect(result.current.getContent(null)).toBe('')
    })

    it('should load content for active tab from filesystem', () => {
      const mockContent = '-- Lua code'
      vi.mocked(mockFileSystem.readFile).mockReturnValue(mockContent)

      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      expect(mockFileSystem.readFile).toHaveBeenCalledWith('/test.lua')
      expect(result.current.getContent('/test.lua')).toBe(mockContent)
    })
  })

  describe('MRU tracking', () => {
    it('should track most recently used tabs', () => {
      const tabs: TabInfo[] = [
        { path: '/a.lua', name: 'a.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/b.lua', name: 'b.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/c.lua', name: 'c.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockImplementation((path) => `content of ${path}`)

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/a.lua' } }
      )

      // Initially /a.lua is active, so it's in mounted tabs
      expect(result.current.mountedTabs).toContain('/a.lua')

      // Switch to /b.lua - both should be mounted now
      rerender({ activeTab: '/b.lua' })
      expect(result.current.mountedTabs).toContain('/b.lua')
      expect(result.current.mountedTabs).toContain('/a.lua')

      // Switch to /c.lua - all three should be mounted
      rerender({ activeTab: '/c.lua' })
      expect(result.current.mountedTabs).toContain('/c.lua')
      expect(result.current.mountedTabs).toContain('/b.lua')
      expect(result.current.mountedTabs).toContain('/a.lua')

      // Mounted tabs are sorted for stable DOM order
      expect(result.current.mountedTabs).toEqual(['/a.lua', '/b.lua', '/c.lua'])
    })

    it('should limit mounted tabs to MAX_MOUNTED (10)', () => {
      const tabs: TabInfo[] = [
        { path: '/1.lua', name: '1.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/2.lua', name: '2.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/3.lua', name: '3.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/4.lua', name: '4.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/5.lua', name: '5.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/6.lua', name: '6.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/7.lua', name: '7.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/8.lua', name: '8.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/9.lua', name: '9.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/10.lua', name: '10.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/11.lua', name: '11.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/12.lua', name: '12.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/1.lua' } }
      )

      // Switch through all tabs
      rerender({ activeTab: '/2.lua' })
      rerender({ activeTab: '/3.lua' })
      rerender({ activeTab: '/4.lua' })
      rerender({ activeTab: '/5.lua' })
      rerender({ activeTab: '/6.lua' })
      rerender({ activeTab: '/7.lua' })
      rerender({ activeTab: '/8.lua' })
      rerender({ activeTab: '/9.lua' })
      rerender({ activeTab: '/10.lua' })
      rerender({ activeTab: '/11.lua' })
      rerender({ activeTab: '/12.lua' })

      expect(result.current.mountedTabs.length).toBeLessThanOrEqual(10)
    })

    it('should exclude non-file tabs from mounted tabs', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: 'canvas://123', name: 'Canvas', isDirty: false, type: 'canvas', isPreview: false, isPinned: false },
        { path: '/readme.md', name: 'readme.md', isDirty: false, type: 'markdown', isPreview: false, isPinned: false },
        { path: '/image.png', name: 'image.png', isDirty: false, type: 'binary', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
        })
      )

      expect(result.current.mountedTabs).toContain('/test.lua')
      expect(result.current.mountedTabs).not.toContain('canvas://123')
      expect(result.current.mountedTabs).not.toContain('/readme.md')
      expect(result.current.mountedTabs).not.toContain('/image.png')
    })

    it('should not add non-file tabs to MRU when they become active', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: 'canvas://123', name: 'Canvas', isDirty: false, type: 'canvas', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/test.lua' as string | null } }
      )

      expect(result.current.mountedTabs).toContain('/test.lua')

      // Switch to canvas tab
      rerender({ activeTab: 'canvas://123' })

      // MRU should still only have the file tab
      expect(result.current.mountedTabs).toEqual(['/test.lua'])
      expect(result.current.mountedTabs.length).toBe(1)
    })

    it('should not load content when active tab is not in tabs list', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('content')

      renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/nonexistent.lua',
          filesystem: mockFileSystem,
        })
      )

      // Should not try to load content for a tab not in the tabs list
      expect(mockFileSystem.readFile).not.toHaveBeenCalled()
    })

    it('should not reload content when tab is already loaded', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/other.lua', name: 'other.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('content')

      const { rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/test.lua' } }
      )

      expect(mockFileSystem.readFile).toHaveBeenCalledTimes(1)

      // Switch away and back
      rerender({ activeTab: '/other.lua' })
      rerender({ activeTab: '/test.lua' })

      // Should have loaded /other.lua once, but not /test.lua again
      expect(mockFileSystem.readFile).toHaveBeenCalledTimes(2)
      expect(mockFileSystem.readFile).toHaveBeenNthCalledWith(1, '/test.lua')
      expect(mockFileSystem.readFile).toHaveBeenNthCalledWith(2, '/other.lua')
    })

    it('should return MRU tabs when no active file tab', () => {
      const tabs: TabInfo[] = [
        { path: '/a.lua', name: 'a.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: 'canvas://123', name: 'Canvas', isDirty: false, type: 'canvas', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result, rerender } = renderHook(
        ({ activeTab }) =>
          useTabEditorManager({
            tabs,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { activeTab: '/a.lua' as string | null } }
      )

      expect(result.current.mountedTabs).toEqual(['/a.lua'])

      // Switch to canvas (non-file) tab
      rerender({ activeTab: 'canvas://123' })

      // Should still return the MRU file tabs
      expect(result.current.mountedTabs).toEqual(['/a.lua'])
    })

    it('should filter out closed tabs from MRU', () => {
      let tabs: TabInfo[] = [
        { path: '/a.lua', name: 'a.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
        { path: '/b.lua', name: 'b.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('')

      const { result, rerender } = renderHook(
        ({ tabs: t, activeTab }) =>
          useTabEditorManager({
            tabs: t,
            activeTab,
            filesystem: mockFileSystem,
          }),
        { initialProps: { tabs, activeTab: '/a.lua' } }
      )

      rerender({ tabs, activeTab: '/b.lua' })
      expect(result.current.mountedTabs).toContain('/a.lua')
      expect(result.current.mountedTabs).toContain('/b.lua')

      // Remove /a.lua from tabs
      tabs = [{ path: '/b.lua', name: 'b.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false }]
      rerender({ tabs, activeTab: '/b.lua' })

      // /a.lua should be filtered out
      expect(result.current.mountedTabs).not.toContain('/a.lua')
      expect(result.current.mountedTabs).toEqual(['/b.lua'])
    })
  })

  describe('updateContent', () => {
    it('should update content for a specific tab', () => {
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
        result.current.updateContent('/test.lua', 'modified')
      })

      expect(result.current.getContent('/test.lua')).toBe('modified')
    })

    it('should track dirty state when content differs from original', () => {
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

      expect(result.current.isDirty('/test.lua')).toBe(false)

      act(() => {
        result.current.updateContent('/test.lua', 'modified')
      })

      expect(result.current.isDirty('/test.lua')).toBe(true)

      act(() => {
        result.current.updateContent('/test.lua', 'original')
      })

      expect(result.current.isDirty('/test.lua')).toBe(false)
    })
  })

  describe('saveTab', () => {
    it('should write content to filesystem and clear dirty state', () => {
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

      act(() => {
        result.current.saveTab('/test.lua')
      })

      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/test.lua', 'modified')
      expect(result.current.isDirty('/test.lua')).toBe(false)
    })

    it('should not save read-only files', () => {
      const tabs: TabInfo[] = [
        { path: '/lib/readonly.lua', name: 'readonly.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const isPathReadOnly = (path: string) => path.startsWith('/lib/')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/lib/readonly.lua',
          filesystem: mockFileSystem,
          isPathReadOnly,
        })
      )

      act(() => {
        result.current.updateContent('/lib/readonly.lua', 'modified')
      })

      const saved = result.current.saveTab('/lib/readonly.lua')

      expect(saved).toBe(false)
      expect(mockFileSystem.writeFile).not.toHaveBeenCalled()
    })

    it('should return true on successful save', () => {
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
        result.current.updateContent('/test.lua', 'modified')
      })

      let saved: boolean = false
      act(() => {
        saved = result.current.saveTab('/test.lua')
      })

      expect(saved).toBe(true)
    })

    it('should return false when saving non-existent tab', () => {
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

      const saved = result.current.saveTab('/nonexistent.lua')

      expect(saved).toBe(false)
      expect(mockFileSystem.writeFile).not.toHaveBeenCalled()
    })

    it('should work without onDirtyChange callback', () => {
      const tabs: TabInfo[] = [
        { path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
      ]

      vi.mocked(mockFileSystem.readFile).mockReturnValue('original')

      const { result } = renderHook(() =>
        useTabEditorManager({
          tabs,
          activeTab: '/test.lua',
          filesystem: mockFileSystem,
          // No onDirtyChange provided
        })
      )

      act(() => {
        result.current.updateContent('/test.lua', 'modified')
      })

      let saved: boolean = false
      act(() => {
        saved = result.current.saveTab('/test.lua')
      })

      expect(saved).toBe(true)
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith('/test.lua', 'modified')
      expect(result.current.isDirty('/test.lua')).toBe(false)
    })

    it('should call onDirtyChange with false after save', () => {
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
        result.current.saveTab('/test.lua')
      })

      expect(onDirtyChange).toHaveBeenCalledWith('/test.lua', false)
    })
  })
})
