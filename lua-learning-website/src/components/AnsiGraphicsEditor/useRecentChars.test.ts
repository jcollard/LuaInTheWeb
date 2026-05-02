/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useRecentChars } from './useRecentChars'

const STORAGE_KEY = 'ansi-editor:recent-chars'

afterEach(() => {
  localStorage.clear()
})

describe('useRecentChars', () => {
  it('starts empty when storage is clean', () => {
    const { result } = renderHook(() => useRecentChars())
    expect(result.current.recent).toEqual([])
  })

  it('promotes the pushed char to the front of the list', () => {
    const { result } = renderHook(() => useRecentChars())
    act(() => result.current.pushRecent('A'))
    act(() => result.current.pushRecent('B'))
    act(() => result.current.pushRecent('C'))
    expect(result.current.recent).toEqual(['C', 'B', 'A'])
  })

  it('returns the same array reference when the pushed char is already at the front', () => {
    const { result } = renderHook(() => useRecentChars())
    act(() => result.current.pushRecent('A'))
    const before = result.current.recent
    act(() => result.current.pushRecent('A'))
    expect(result.current.recent).toBe(before)
  })

  it('moves an existing char to the front rather than duplicating it', () => {
    const { result } = renderHook(() => useRecentChars())
    act(() => result.current.pushRecent('A'))
    act(() => result.current.pushRecent('B'))
    act(() => result.current.pushRecent('A'))
    expect(result.current.recent).toEqual(['A', 'B'])
  })

  it('caps the list at 32 entries', () => {
    const { result } = renderHook(() => useRecentChars())
    act(() => {
      for (let i = 0; i < 40; i++) result.current.pushRecent(String.fromCodePoint(0x41 + i))
    })
    expect(result.current.recent).toHaveLength(32)
    // Most recent entry first; oldest (A) should have fallen off.
    expect(result.current.recent[0]).toBe(String.fromCodePoint(0x41 + 39))
    expect(result.current.recent.includes('A')).toBe(false)
  })

  it('persists to localStorage so the next mount sees the same list', () => {
    const { result, unmount } = renderHook(() => useRecentChars())
    act(() => result.current.pushRecent('▕'))
    act(() => result.current.pushRecent('☺'))
    unmount()
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(['☺', '▕'])
    const remount = renderHook(() => useRecentChars())
    expect(remount.result.current.recent).toEqual(['☺', '▕'])
  })

  it('ignores empty pushes', () => {
    const { result } = renderHook(() => useRecentChars())
    act(() => result.current.pushRecent(''))
    expect(result.current.recent).toEqual([])
  })

  it('falls back to an empty list when storage holds garbage', () => {
    localStorage.setItem(STORAGE_KEY, '{"not": "an array"}')
    const { result } = renderHook(() => useRecentChars())
    expect(result.current.recent).toEqual([])
  })
})
