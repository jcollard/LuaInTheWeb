import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'ansi-editor:recent-chars'
const MAX_RECENT = 32

export function loadStoredRecentChars(): string[] {
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

export function saveStoredRecentChars(chars: readonly string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chars))
  } catch {
    /* quota / privacy mode — silently drop */
  }
}

export function useRecentChars(): { recent: readonly string[]; pushRecent: (char: string) => void } {
  const [recent, setRecent] = useState<readonly string[]>(loadStoredRecentChars)

  useEffect(() => {
    saveStoredRecentChars(recent)
  }, [recent])

  const pushRecent = useCallback((char: string) => {
    if (!char) return
    setRecent(prev => {
      if (prev[0] === char) return prev
      const filtered = prev.filter(c => c !== char)
      return [char, ...filtered].slice(0, MAX_RECENT)
    })
  }, [])

  return { recent, pushRecent }
}
