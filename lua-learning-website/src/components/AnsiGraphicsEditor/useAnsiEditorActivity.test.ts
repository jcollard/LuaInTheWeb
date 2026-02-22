import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditor } from './useAnsiEditor'

function createMockContainer(): HTMLDivElement {
  const container = document.createElement('div')
  container.getBoundingClientRect = () => ({
    left: 0, top: 0, right: 800, bottom: 480,
    width: 800, height: 480, x: 0, y: 0, toJSON: () => ({}),
  })
  return container
}

describe('useAnsiEditor isActive gating', () => {
  it('should ignore keyboard shortcuts when isActive is false', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useAnsiEditor({ isActive: false, onSave }))
    const container = createMockContainer()
    const handle = { write: vi.fn(), container, dispose: vi.fn() }
    act(() => result.current.onTerminalReady(handle))

    // Ctrl+S should be ignored when inactive
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    })
    expect(onSave).not.toHaveBeenCalled()
  })

  it('should handle keyboard shortcuts when isActive is true', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useAnsiEditor({ isActive: true, onSave }))
    const container = createMockContainer()
    const handle = { write: vi.fn(), container, dispose: vi.fn() }
    act(() => result.current.onTerminalReady(handle))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    })
    expect(onSave).toHaveBeenCalled()
  })

  it('should handle keyboard shortcuts when isActive is undefined (default)', () => {
    const onSave = vi.fn()
    const { result } = renderHook(() => useAnsiEditor({ onSave }))
    const container = createMockContainer()
    const handle = { write: vi.fn(), container, dispose: vi.fn() }
    act(() => result.current.onTerminalReady(handle))

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true }))
    })
    expect(onSave).toHaveBeenCalled()
  })
})
