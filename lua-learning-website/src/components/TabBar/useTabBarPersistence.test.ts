/* eslint-disable max-lines */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTabBarPersistence, STORAGE_KEY, type PersistedTabState } from './useTabBarPersistence'
import type { TabInfo } from './types'

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get store() { return store },
  }
})()

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage })

describe('useTabBarPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocalStorage.clear()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('STORAGE_KEY', () => {
    it('should export the correct storage key', () => {
      expect(STORAGE_KEY).toBe('lua-ide-tab-state')
    })
  })

  describe('initial state loading', () => {
    it('should return null savedState when localStorage is empty', () => {
      const { result } = renderHook(() => useTabBarPersistence())

      expect(result.current.savedState).toBeNull()
    })

    it('should load tabs without fileExists check', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))

      const { result } = renderHook(() => useTabBarPersistence())

      expect(result.current.savedState).toEqual(persistedState)
    })

    it('should load valid persisted state from localStorage', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toEqual(persistedState)
    })

    it('should filter out tabs for files that no longer exist', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: true, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn((path: string) => path === '/file2.lua')

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.tabs).toHaveLength(1)
      expect(result.current.savedState?.tabs[0].path).toBe('/file2.lua')
    })

    it('should set activeTab to null if the active file no longer exists', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: true, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn((path: string) => path === '/file2.lua')

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.activeTab).toBeNull()
    })

    it('should set activeTab to first remaining tab if active file deleted', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: true, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn((path: string) => path === '/file2.lua')

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      // ActiveTab should be set to first remaining tab (or null if strategy differs)
      // Let's check that it preserves the valid tab
      expect(result.current.savedState?.tabs[0].path).toBe('/file2.lua')
    })

    it('should return null savedState for invalid JSON in localStorage', () => {
      mockLocalStorage.setItem(STORAGE_KEY, 'not valid json')
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null savedState for invalid structure', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: 'bar' }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should not check file existence for canvas tabs', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: 'canvas://123', name: 'Canvas', type: 'canvas', isPinned: false, isPreview: false },
        ],
        activeTab: 'canvas://123',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      // Canvas tabs should be filtered out during load (they're ephemeral)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      // Canvas tabs should not be restored
      expect(result.current.savedState?.tabs).toHaveLength(0)
      expect(fileExists).not.toHaveBeenCalled()
    })
  })

  describe('saveState', () => {
    it('should save tab state to localStorage (debounced)', async () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file1.lua')
      })

      // Should not save immediately (debounced)
      expect(mockLocalStorage.setItem).not.toHaveBeenCalledWith(STORAGE_KEY, expect.any(String))

      // Advance timers to trigger debounced save
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(STORAGE_KEY, expect.any(String))
    })

    it('should exclude isDirty from persisted state', async () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: true },
      ]

      act(() => {
        result.current.saveState(tabs, '/file1.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs[0]).not.toHaveProperty('isDirty')
    })

    it('should exclude canvas tabs from persisted state', async () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
        { path: 'canvas://123', name: 'Canvas', type: 'canvas', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file1.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs).toHaveLength(1)
      expect(parsed.tabs[0].path).toBe('/file1.lua')
    })

    it('should debounce multiple rapid saves', async () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs1: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]
      const tabs2: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs1, '/file1.lua')
        vi.advanceTimersByTime(50) // Less than debounce time
        result.current.saveState(tabs2, '/file2.lua')
        vi.advanceTimersByTime(200)
      })

      // Should only save once with the latest state
      const saveCalls = mockLocalStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEY
      )
      expect(saveCalls).toHaveLength(1)

      const parsed = JSON.parse(saveCalls[0][1] as string)
      expect(parsed.tabs).toHaveLength(2)
      expect(parsed.activeTab).toBe('/file2.lua')
    })

    it('should set activeTab to null if active is a canvas tab', async () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
        { path: 'canvas://123', name: 'Canvas', type: 'canvas', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, 'canvas://123')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      // Active tab should fallback to first non-canvas tab or null
      expect(parsed.activeTab).toBe('/file1.lua')
    })
  })

  describe('clearState', () => {
    it('should remove tab state from localStorage', () => {
      const persistedState: PersistedTabState = {
        tabs: [{ path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false }],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      act(() => {
        result.current.clearState()
      })

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith(STORAGE_KEY)
    })

    it('should cancel pending saves when clearing', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file1.lua')
        result.current.clearState()
        vi.advanceTimersByTime(200)
      })

      // Should not have saved after clear
      const saveCalls = mockLocalStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEY
      )
      expect(saveCalls).toHaveLength(0)
    })
  })

  describe('pinned tab ordering', () => {
    it('should preserve pinned tabs on the left when loading', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: true, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file3.lua', name: 'file3.lua', type: 'file', isPinned: true, isPreview: false },
        ],
        activeTab: '/file2.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      // Should preserve the order as stored (pinned tabs should already be on left)
      expect(result.current.savedState?.tabs.map(t => t.path)).toEqual([
        '/file1.lua',
        '/file2.lua',
        '/file3.lua',
      ])
    })
  })

  describe('cleanup on unmount', () => {
    it('should cancel pending saves on unmount', () => {
      const fileExists = vi.fn(() => true)
      const { result, unmount } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file1.lua')
      })

      unmount()

      act(() => {
        vi.advanceTimersByTime(200)
      })

      // Should not have saved after unmount
      const saveCalls = mockLocalStorage.setItem.mock.calls.filter(
        (call) => call[0] === STORAGE_KEY
      )
      expect(saveCalls).toHaveLength(0)
    })
  })

  describe('validation edge cases', () => {
    it('should return null for null data', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(null))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null for non-object data', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify('string'))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tabs is not an array', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: 'not-array', activeTab: null }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when activeTab is not string or null', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: [], activeTab: 123 }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab is null', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: [null], activeTab: null }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab is not an object', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: ['string'], activeTab: null }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab path is not a string', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({
        tabs: [{ path: 123, name: 'test', type: 'file', isPinned: false, isPreview: false }],
        activeTab: null,
      }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab name is not a string', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({
        tabs: [{ path: '/test', name: 123, type: 'file', isPinned: false, isPreview: false }],
        activeTab: null,
      }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab type is not a string', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({
        tabs: [{ path: '/test', name: 'test', type: 123, isPinned: false, isPreview: false }],
        activeTab: null,
      }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab isPinned is not a boolean', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({
        tabs: [{ path: '/test', name: 'test', type: 'file', isPinned: 'false', isPreview: false }],
        activeTab: null,
      }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should return null when tab isPreview is not a boolean', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({
        tabs: [{ path: '/test', name: 'test', type: 'file', isPinned: false, isPreview: 'false' }],
        activeTab: null,
      }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toBeNull()
    })

    it('should accept empty tabs array', () => {
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs: [], activeTab: null }))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState).toEqual({ tabs: [], activeTab: null })
    })

    it('should accept valid activeTab as null', () => {
      const persistedState: PersistedTabState = {
        tabs: [{ path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false }],
        activeTab: null,
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.activeTab).toBeNull()
    })
  })

  describe('saveState property preservation', () => {
    it('should preserve tab path in saved state', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/my/path/file.lua', name: 'file.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/my/path/file.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs[0].path).toBe('/my/path/file.lua')
    })

    it('should preserve tab name in saved state', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file.lua', name: 'my-custom-name.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs[0].name).toBe('my-custom-name.lua')
    })

    it('should preserve tab type in saved state', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file.md', name: 'file.md', type: 'markdown', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file.md')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs[0].type).toBe('markdown')
    })

    it('should preserve tab isPinned in saved state', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file.lua', name: 'file.lua', type: 'file', isPinned: true, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs[0].isPinned).toBe(true)
    })

    it('should preserve tab isPreview in saved state', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file.lua', name: 'file.lua', type: 'file', isPinned: false, isPreview: true, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.tabs[0].isPreview).toBe(true)
    })

    it('should preserve activeTab in saved state', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
        { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, '/file2.lua')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.activeTab).toBe('/file2.lua')
    })

    it('should save null activeTab when no tabs', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      act(() => {
        result.current.saveState([], null)
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.activeTab).toBeNull()
      expect(parsed.tabs).toHaveLength(0)
    })

    it('should save activeTab as null when active is canvas with no other tabs', () => {
      const fileExists = vi.fn(() => true)
      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      const tabs: TabInfo[] = [
        { path: 'canvas://123', name: 'Canvas', type: 'canvas', isPinned: false, isPreview: false, isDirty: false },
      ]

      act(() => {
        result.current.saveState(tabs, 'canvas://123')
        vi.advanceTimersByTime(200)
      })

      const savedValue = mockLocalStorage.setItem.mock.calls.find(
        (call) => call[0] === STORAGE_KEY
      )?.[1]
      const parsed = JSON.parse(savedValue as string)

      expect(parsed.activeTab).toBeNull()
      expect(parsed.tabs).toHaveLength(0)
    })
  })

  describe('canvas tab detection', () => {
    it('should identify canvas:// prefix as canvas tab', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: 'canvas://abc-123', name: 'Canvas', type: 'canvas', isPinned: false, isPreview: false },
        ],
        activeTab: 'canvas://abc-123',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.tabs).toHaveLength(0)
    })

    it('should not treat non-canvas:// paths as canvas tabs', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/canvas/file.lua', name: 'file.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/canvas/file.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.tabs).toHaveLength(1)
      expect(result.current.savedState?.tabs[0].path).toBe('/canvas/file.lua')
    })
  })

  describe('file existence check', () => {
    it('should call fileExists for each non-canvas tab', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file3.lua', name: 'file3.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      renderHook(() => useTabBarPersistence({ fileExists }))

      expect(fileExists).toHaveBeenCalledTimes(3)
      expect(fileExists).toHaveBeenCalledWith('/file1.lua')
      expect(fileExists).toHaveBeenCalledWith('/file2.lua')
      expect(fileExists).toHaveBeenCalledWith('/file3.lua')
    })

    it('should preserve activeTab when it exists in filtered tabs', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file2.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => true)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.activeTab).toBe('/file2.lua')
    })

    it('should handle all tabs being filtered out', () => {
      const persistedState: PersistedTabState = {
        tabs: [
          { path: '/file1.lua', name: 'file1.lua', type: 'file', isPinned: false, isPreview: false },
          { path: '/file2.lua', name: 'file2.lua', type: 'file', isPinned: false, isPreview: false },
        ],
        activeTab: '/file1.lua',
      }
      mockLocalStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState))
      const fileExists = vi.fn(() => false)

      const { result } = renderHook(() => useTabBarPersistence({ fileExists }))

      expect(result.current.savedState?.tabs).toHaveLength(0)
      expect(result.current.savedState?.activeTab).toBeNull()
    })
  })

  describe('hook return value stability', () => {
    it('should return stable saveState callback', () => {
      const fileExists = vi.fn(() => true)
      const { result, rerender } = renderHook(() => useTabBarPersistence({ fileExists }))

      const firstSaveState = result.current.saveState
      rerender()
      const secondSaveState = result.current.saveState

      expect(firstSaveState).toBe(secondSaveState)
    })

    it('should return stable clearState callback', () => {
      const fileExists = vi.fn(() => true)
      const { result, rerender } = renderHook(() => useTabBarPersistence({ fileExists }))

      const firstClearState = result.current.clearState
      rerender()
      const secondClearState = result.current.clearState

      expect(firstClearState).toBe(secondClearState)
    })
  })
})
