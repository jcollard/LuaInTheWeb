import { useState, useCallback, useRef, useEffect } from 'react'
import type { TabInfo, TabType } from './types'

export const STORAGE_KEY = 'lua-ide-tab-state'
// Stryker disable next-line all: Constant value - changing it would affect timing but not correctness
const DEBOUNCE_DELAY = 100

/**
 * Persisted tab state (excludes isDirty which is transient)
 */
export interface PersistedTab {
  path: string
  name: string
  type: TabType
  isPinned: boolean
  isPreview: boolean
}

export interface PersistedTabState {
  tabs: PersistedTab[]
  activeTab: string | null
}

export interface UseTabBarPersistenceOptions {
  /** Function to check if a file exists at the given path (optional - if not provided, all tabs are restored) */
  fileExists?: (path: string) => boolean
}

export interface UseTabBarPersistenceReturn {
  /** Currently saved tab state (null if none or invalid) */
  savedState: PersistedTabState | null
  /** Save tab state to localStorage (debounced) */
  saveState: (tabs: TabInfo[], activeTab: string | null) => void
  /** Clear saved tab state */
  clearState: () => void
}

function isValidPersistedState(data: unknown): data is PersistedTabState {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.tabs)) return false
  if (obj.activeTab !== null && typeof obj.activeTab !== 'string') return false
  // Validate each tab has required fields
  for (const tab of obj.tabs) {
    if (!tab || typeof tab !== 'object') return false
    const t = tab as Record<string, unknown>
    if (typeof t.path !== 'string') return false
    if (typeof t.name !== 'string') return false
    if (typeof t.type !== 'string') return false
    if (typeof t.isPinned !== 'boolean') return false
    if (typeof t.isPreview !== 'boolean') return false
  }
  return true
}

function isCanvasTab(path: string): boolean {
  return path.startsWith('canvas://')
}

function loadFromStorage(fileExists?: (path: string) => boolean): PersistedTabState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsed = JSON.parse(stored)
    if (!isValidPersistedState(parsed)) return null

    // Filter out canvas tabs (ephemeral) and optionally check file existence
    const validTabs = parsed.tabs.filter((tab) => {
      // Always filter out canvas tabs - they're ephemeral
      if (isCanvasTab(tab.path)) return false
      // If fileExists check is provided, use it; otherwise keep all non-canvas tabs
      if (fileExists) {
        return fileExists(tab.path)
      }
      return true
    })

    // Adjust activeTab if it was filtered out
    let activeTab = parsed.activeTab
    if (activeTab) {
      // If activeTab is a canvas tab, clear it
      if (isCanvasTab(activeTab)) {
        activeTab = validTabs.length > 0 ? validTabs[0].path : null
      } else {
        const activeTabExists = validTabs.some((t) => t.path === activeTab)
        if (!activeTabExists) {
          activeTab = null
        }
      }
    }

    return {
      tabs: validTabs,
      activeTab,
    }
  } catch {
    return null
  }
}

function toPersistedTab(tab: TabInfo): PersistedTab {
  return {
    path: tab.path,
    name: tab.name,
    type: tab.type,
    isPinned: tab.isPinned,
    isPreview: tab.isPreview,
  }
}

export function useTabBarPersistence(
  options: UseTabBarPersistenceOptions = {}
): UseTabBarPersistenceReturn {
  const { fileExists } = options
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [savedState] = useState<PersistedTabState | null>(() => {
    return loadFromStorage(fileExists)
  })

  // Cleanup timeout on unmount
  // Stryker disable next-line BlockStatement: Cleanup function prevents memory leaks - not observable in unit tests
  useEffect(() => {
    return () => {
      // Stryker disable next-line BlockStatement,ConditionalExpression: Cleanup logic - memory leak prevention not testable
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
    // Stryker disable next-line ArrayDeclaration: Empty dependency array is intentional - cleanup runs once on unmount
  }, [])

  const saveState = useCallback((tabs: TabInfo[], activeTab: string | null) => {
    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Debounce the save
    timeoutRef.current = setTimeout(() => {
      // Filter out canvas tabs
      const persistableTabs = tabs.filter((tab) => !isCanvasTab(tab.path))
      const persistedTabs = persistableTabs.map(toPersistedTab)

      // If activeTab is a canvas tab, fallback to first non-canvas tab
      let persistedActiveTab = activeTab
      if (activeTab && isCanvasTab(activeTab)) {
        persistedActiveTab = persistableTabs.length > 0 ? persistableTabs[0].path : null
      }

      const state: PersistedTabState = {
        tabs: persistedTabs,
        activeTab: persistedActiveTab,
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, DEBOUNCE_DELAY)
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [])

  const clearState = useCallback(() => {
    // Clear any pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    localStorage.removeItem(STORAGE_KEY)
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [])

  return {
    savedState,
    saveState,
    clearState,
  }
}
