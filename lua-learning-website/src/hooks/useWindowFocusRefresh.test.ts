import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWindowFocusRefresh } from './useWindowFocusRefresh'

describe('useWindowFocusRefresh', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds focus event listener on mount', () => {
    const refreshWorkspaces = vi.fn().mockResolvedValue(undefined)
    const refreshFileTree = vi.fn()

    renderHook(() => useWindowFocusRefresh(refreshWorkspaces, refreshFileTree))

    expect(addEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))
  })

  it('removes focus event listener on unmount', () => {
    const refreshWorkspaces = vi.fn().mockResolvedValue(undefined)
    const refreshFileTree = vi.fn()

    const { unmount } = renderHook(() => useWindowFocusRefresh(refreshWorkspaces, refreshFileTree))
    unmount()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('focus', expect.any(Function))
  })

  it('calls refreshWorkspaces and refreshFileTree when focus event fires', async () => {
    const refreshWorkspaces = vi.fn().mockResolvedValue(undefined)
    const refreshFileTree = vi.fn()

    renderHook(() => useWindowFocusRefresh(refreshWorkspaces, refreshFileTree))

    // Get the handler that was registered
    const focusCall = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === 'focus'
    )
    const handler = focusCall?.[1] as () => Promise<void>

    // Simulate focus event
    await handler()

    expect(refreshWorkspaces).toHaveBeenCalled()
    expect(refreshFileTree).toHaveBeenCalled()
  })

  it('calls refreshFileTree after refreshWorkspaces completes', async () => {
    const callOrder: string[] = []
    const refreshWorkspaces = vi.fn().mockImplementation(async () => {
      callOrder.push('refreshWorkspaces')
    })
    const refreshFileTree = vi.fn().mockImplementation(() => {
      callOrder.push('refreshFileTree')
    })

    renderHook(() => useWindowFocusRefresh(refreshWorkspaces, refreshFileTree))

    const focusCall = addEventListenerSpy.mock.calls.find(
      (call: [string, EventListenerOrEventListenerObject]) => call[0] === 'focus'
    )
    const handler = focusCall?.[1] as () => Promise<void>
    await handler()

    expect(callOrder).toEqual(['refreshWorkspaces', 'refreshFileTree'])
  })
})
