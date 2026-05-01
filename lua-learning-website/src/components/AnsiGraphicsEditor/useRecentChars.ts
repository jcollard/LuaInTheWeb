import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ansiEditor.recentChars'
const MAX_RECENT = 32

function loadStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((c): c is string => typeof c === 'string' && c.length > 0)
  } catch {
    return []
  }
}

function persist(chars: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars))
  } catch {
    /* quota / privacy mode — silently drop */
  }
}

/**
 * LRU of the last 32 brush characters the user has selected, persisted
 * to localStorage so the "Recent" tab survives reloads. Most-recent
 * first; pushing an existing char promotes it back to the front.
 */
export function useRecentChars(): { recent: readonly string[]; pushRecent: (char: string) => void } {
  const [recent, setRecent] = useState<readonly string[]>(loadStored)

  useEffect(() => {
    persist(recent)
  }, [recent])

  const pushRecent = useCallback((char: string) => {
    if (!char) return
    setRecent(prev => {
      const filtered = prev.filter(c => c !== char)
      return [char, ...filtered].slice(0, MAX_RECENT)
    })
  }, [])

  return { recent, pushRecent }
}
