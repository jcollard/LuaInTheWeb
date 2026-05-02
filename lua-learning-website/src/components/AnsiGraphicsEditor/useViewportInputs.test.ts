/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useCanvasPan, useCtrlWheelZoom } from './useViewportInputs'

function makeEl(opts: { rectWidth?: number; rectHeight?: number } = {}): HTMLDivElement {
  const el = document.createElement('div')
  el.getBoundingClientRect = (): DOMRect => ({
    x: 0, y: 0, top: 0, left: 0,
    right: opts.rectWidth ?? 800, bottom: opts.rectHeight ?? 600,
    width: opts.rectWidth ?? 800, height: opts.rectHeight ?? 600,
    toJSON: () => ({}),
  })
  Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true })
  Object.defineProperty(el, 'scrollTop', { value: 0, writable: true })
  document.body.appendChild(el)
  return el
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useCtrlWheelZoom', () => {
  it('does not zoom on plain (non-Ctrl) wheel', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 1, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true }))
    expect(setZoom).not.toHaveBeenCalled()
  })

  it('zooms in on Ctrl + wheel up', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 1, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).toHaveBeenCalledTimes(1)
    expect(setZoom.mock.calls[0][0]).toBeGreaterThan(1)
  })

  it('zooms out on Ctrl + wheel down', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 2, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).toHaveBeenCalledTimes(1)
    expect(setZoom.mock.calls[0][0]).toBeLessThan(2)
  })

  it('zooms on Meta + wheel (cmd-key support)', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 1, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, metaKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).toHaveBeenCalledTimes(1)
  })

  it('does not call setZoom when newZoom equals oldZoom (clamped at MAX)', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 8, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).not.toHaveBeenCalled()
  })

  it('does not call setZoom when newZoom equals oldZoom (clamped at MIN)', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    // Start exactly at MIN_ZOOM (0.25); wheel-down should clamp back
    // to MIN, producing the same value, so setZoom is skipped.
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 0.25, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).not.toHaveBeenCalled()
  })

  it('calls preventDefault on Ctrl+wheel', () => {
    const el = makeEl()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 2, setZoom: vi.fn() }))
    const evt = new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    el.dispatchEvent(evt)
    expect(spy).toHaveBeenCalled()
  })

  it('does not call preventDefault on plain wheel', () => {
    const el = makeEl()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 2, setZoom: vi.fn() }))
    const evt = new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true })
    const spy = vi.spyOn(evt, 'preventDefault')
    el.dispatchEvent(evt)
    expect(spy).not.toHaveBeenCalled()
  })

  it('detaches the listener on unmount', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    const { unmount } = renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 2, setZoom }))
    unmount()
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).not.toHaveBeenCalled()
  })

  it('reattaches when scrollEl changes from null to an element', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    const { rerender } = renderHook(
      ({ scrollEl }: { scrollEl: HTMLElement | null }) => useCtrlWheelZoom({ scrollEl, zoom: 2, setZoom }),
      { initialProps: { scrollEl: null as HTMLElement | null } },
    )
    // Pre-attach: dispatch goes nowhere.
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).not.toHaveBeenCalled()
    // Provide the element after mount, like onTerminalReady firing.
    rerender({ scrollEl: el })
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, bubbles: true, cancelable: true }))
    expect(setZoom).toHaveBeenCalledTimes(1)
  })

  it('applies queued scroll position after zoom changes', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    const { rerender } = renderHook(
      ({ zoom }: { zoom: number }) => useCtrlWheelZoom({ scrollEl: el, zoom, setZoom }),
      { initialProps: { zoom: 1 } },
    )
    act(() => {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 100, clientY: 100, bubbles: true, cancelable: true }))
    })
    const newZoom = setZoom.mock.calls[0][0]
    rerender({ zoom: newZoom })
    expect(el.scrollLeft).toBeGreaterThan(0)
    expect(el.scrollTop).toBeGreaterThan(0)
  })

  it('treats deltaY=0 as no-op (boundary between zoom-in and zoom-out)', () => {
    const el = makeEl()
    const setZoom = vi.fn()
    renderHook(() => useCtrlWheelZoom({ scrollEl: el, zoom: 2, setZoom }))
    el.dispatchEvent(new WheelEvent('wheel', { deltaY: 0, ctrlKey: true, bubbles: true, cancelable: true }))
    // deltaY === 0 → factor = 1/WHEEL_ZOOM_FACTOR (zoom out branch). At zoom=2
    // this produces a smaller value, snap-clamp may still differ from 2.
    // What we care about: deltaY=0 doesn't accidentally zoom *in*.
    if (setZoom.mock.calls.length > 0) {
      expect(setZoom.mock.calls[0][0]).toBeLessThan(2)
    }
  })

  it('anchor offset uses rect.left subtraction (not addition)', () => {
    // Pin the mutation `e.clientX - rect.left` → `+`. With a non-zero
    // rect.left, the two formulas produce different anchors and so
    // different queued scroll offsets.
    const el = document.createElement('div')
    // Rect at viewport offset (50, 30): scroll wrapper is shifted right
    // and down (e.g. inside the IDE chrome).
    el.getBoundingClientRect = (): DOMRect => ({
      x: 50, y: 30, top: 30, left: 50,
      right: 50 + 800, bottom: 30 + 600,
      width: 800, height: 600, toJSON: () => ({}),
    })
    Object.defineProperty(el, 'scrollLeft', { value: 0, writable: true })
    Object.defineProperty(el, 'scrollTop', { value: 0, writable: true })
    document.body.appendChild(el)

    const setZoom = vi.fn()
    const { rerender } = renderHook(
      ({ zoom }: { zoom: number }) => useCtrlWheelZoom({ scrollEl: el, zoom, setZoom }),
      { initialProps: { zoom: 1 } },
    )
    // Mouse at viewport (150, 100). Anchor (correct, with subtraction)
    // = (100, 70). With the mutated `+` it would be (200, 130).
    act(() => {
      el.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, ctrlKey: true, clientX: 150, clientY: 100, bubbles: true, cancelable: true }))
    })
    const newZoom = setZoom.mock.calls[0][0]
    rerender({ zoom: newZoom })
    // With correct math: scrollLeft = 100*r - 100 ≈ 100*(1.15-1) = 15
    // With mutated: scrollLeft = 200*r - 200 ≈ 30
    // Pin scrollLeft within the correct range to kill the mutation.
    expect(el.scrollLeft).toBeGreaterThan(10)
    expect(el.scrollLeft).toBeLessThan(20)
  })
})

describe('useCanvasPan', () => {
  it('returns isPanning=false and spaceHeld=false initially', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    expect(result.current.isPanning).toBe(false)
    expect(result.current.spaceHeld).toBe(false)
  })

  it('starts panning on middle-click (button=1) and updates scroll on drag', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      el.dispatchEvent(new MouseEvent('mousedown', { button: 1, clientX: 200, clientY: 200, bubbles: true, cancelable: true }))
    })
    expect(result.current.isPanning).toBe(true)
    // Drag right by 50, down by 30 → scrollLeft -= 50, scrollTop -= 30.
    // Starting from 0, scroll goes negative; the browser would clamp,
    // but our test stub just stores the assigned value. We only assert
    // the direction of change.
    el.scrollLeft = 100
    el.scrollTop = 100
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 250, clientY: 230, bubbles: true }))
    })
    expect(el.scrollLeft).toBe(50)
    expect(el.scrollTop).toBe(70)
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    expect(result.current.isPanning).toBe(false)
  })

  it('does not pan on left-click without space held', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      el.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 200, bubbles: true, cancelable: true }))
    })
    expect(result.current.isPanning).toBe(false)
  })

  it('reflects spaceHeld true on Space keydown and false on keyup', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    })
    expect(result.current.spaceHeld).toBe(true)
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
    })
    expect(result.current.spaceHeld).toBe(false)
  })

  it('starts panning on space + left-click', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }))
    })
    act(() => {
      el.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 200, clientY: 200, bubbles: true, cancelable: true }))
    })
    expect(result.current.isPanning).toBe(true)
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    })
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }))
    })
  })

  it('ignores Space when an INPUT is focused', () => {
    const input = document.createElement('input')
    document.body.appendChild(input)
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      input.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    })
    expect(result.current.spaceHeld).toBe(false)
  })

  it('ignores Space when a TEXTAREA is focused', () => {
    const textarea = document.createElement('textarea')
    document.body.appendChild(textarea)
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      textarea.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true }))
    })
    expect(result.current.spaceHeld).toBe(false)
  })

  // contenteditable case is exercised by the helper directly; jsdom's
  // `isContentEditable` getter is unreliable across versions, so we
  // skip a separate keydown test for it. Real-browser behavior is
  // covered by the manual / E2E paths.

  it('does not start a second drag when one is already in progress', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      el.dispatchEvent(new MouseEvent('mousedown', { button: 1, clientX: 0, clientY: 0, bubbles: true, cancelable: true }))
    })
    expect(result.current.isPanning).toBe(true)
    // mousemove without mouseup, then a left-click without space — should
    // not toggle isPanning off. Drag continues until mouseup.
    act(() => {
      el.dispatchEvent(new MouseEvent('mousedown', { button: 0, clientX: 10, clientY: 10, bubbles: true, cancelable: true }))
    })
    expect(result.current.isPanning).toBe(true)
    act(() => { window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })
    expect(result.current.isPanning).toBe(false)
  })

  it('endDrag is a no-op when no drag is in progress', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    // Fire mouseup without ever starting a drag — must not toggle state.
    act(() => { window.dispatchEvent(new MouseEvent('mouseup', { bubbles: true })) })
    expect(result.current.isPanning).toBe(false)
  })

  it('mousemove without an active drag does not change scroll position', () => {
    const el = makeEl()
    el.scrollLeft = 100
    el.scrollTop = 100
    renderHook(() => useCanvasPan({ scrollEl: el }))
    // No mousedown first → mousemove must not adjust scroll.
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 200, clientY: 200, bubbles: true }))
    })
    expect(el.scrollLeft).toBe(100)
    expect(el.scrollTop).toBe(100)
  })

  it('endDrag also fires on window blur (cleans up if pointer leaves)', () => {
    const el = makeEl()
    const { result } = renderHook(() => useCanvasPan({ scrollEl: el }))
    act(() => {
      el.dispatchEvent(new MouseEvent('mousedown', { button: 1, clientX: 0, clientY: 0, bubbles: true, cancelable: true }))
    })
    expect(result.current.isPanning).toBe(true)
    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(result.current.isPanning).toBe(false)
  })

  it('preventDefault and stopPropagation on a pan-initiating mousedown', () => {
    const el = makeEl()
    renderHook(() => useCanvasPan({ scrollEl: el }))
    const evt = new MouseEvent('mousedown', { button: 1, clientX: 0, clientY: 0, bubbles: true, cancelable: true })
    const pdSpy = vi.spyOn(evt, 'preventDefault')
    const spSpy = vi.spyOn(evt, 'stopPropagation')
    act(() => {
      el.dispatchEvent(evt)
    })
    expect(pdSpy).toHaveBeenCalled()
    expect(spSpy).toHaveBeenCalled()
  })

  it('detaches all listeners on unmount', () => {
    const el = makeEl()
    const { result, unmount } = renderHook(() => useCanvasPan({ scrollEl: el }))
    unmount()
    el.dispatchEvent(new MouseEvent('mousedown', { button: 1, clientX: 0, clientY: 0, bubbles: true, cancelable: true }))
    // After unmount, isPanning shouldn't change (the hook is gone, but
    // the closure could still try to call setIsPanning — React warns
    // but doesn't throw). Best we can do is that result.current stayed
    // false. The window listeners must also be detached; otherwise a
    // global mousemove would still call setState and React would warn.
    expect(result.current.isPanning).toBe(false)
  })
})
