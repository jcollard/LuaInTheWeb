import { useEffect, useRef, useState } from 'react'
import { clampZoom, snapZoom, zoomAtPoint } from './useViewport'

/** Multiplier applied to current zoom per wheel "tick" (one notch). */
const WHEEL_ZOOM_FACTOR = 1.15

export interface UseCtrlWheelZoomOptions {
  /** Scrollable element to attach the wheel listener to, or null until
   *  the panel mounts. The effect re-runs when this changes. Plain
   *  (non-Ctrl) wheel events bubble to native scroll handling. */
  scrollEl: HTMLElement | null
  /** Current zoom value. */
  zoom: number
  /** Apply a new zoom value (snap/clamp handled inside). */
  setZoom: (z: number) => void
}

/**
 * Wire Ctrl+wheel (or Meta+wheel) zoom anchored at the cursor on a
 * scrollable element. Plain wheel events bubble to the browser's native
 * scroll handling.
 *
 * Uses a non-passive listener so `preventDefault` stops the browser
 * from also page-zooming or scrolling on Ctrl+wheel.
 *
 * Anchor preservation: after the panel resizes in response to the new
 * zoom, the queued scroll offset is applied so the cell under the
 * cursor before the wheel tick is still under the cursor after.
 */
export function useCtrlWheelZoom({ scrollEl, zoom, setZoom }: UseCtrlWheelZoomOptions): void {
  // Ref captures of the live state so the wheel handler reads current
  // values without re-binding on every zoom change.
  const zoomRef = useRef(zoom)
  zoomRef.current = zoom
  const setZoomRef = useRef(setZoom)
  setZoomRef.current = setZoom
  const queuedScrollRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (!scrollEl) return

    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const oldZoom = zoomRef.current
      const factor = e.deltaY < 0 ? WHEEL_ZOOM_FACTOR : 1 / WHEEL_ZOOM_FACTOR
      const nextZoom = snapZoom(clampZoom(oldZoom * factor))
      if (nextZoom === oldZoom) return
      const rect = scrollEl.getBoundingClientRect()
      const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top }
      queuedScrollRef.current = zoomAtPoint(
        oldZoom,
        nextZoom,
        anchor,
        { x: scrollEl.scrollLeft, y: scrollEl.scrollTop },
      )
      setZoomRef.current(nextZoom)
    }

    scrollEl.addEventListener('wheel', onWheel, { passive: false })
    return () => scrollEl.removeEventListener('wheel', onWheel)
  }, [scrollEl])

  // After zoom changes (and the panel resizes via its own useEffect on
  // zoom — child effects run before parent effects in React, so by the
  // time we're here the new layout exists), apply the queued scroll
  // offset to keep the cursor anchor stable.
  useEffect(() => {
    const queued = queuedScrollRef.current
    if (!scrollEl || !queued) return
    scrollEl.scrollLeft = queued.x
    scrollEl.scrollTop = queued.y
    queuedScrollRef.current = null
  }, [zoom, scrollEl])
}

export interface UseCanvasPanOptions {
  /** Element to attach pan listeners to (the scroll wrapper), or null
   *  until the panel mounts. */
  scrollEl: HTMLElement | null
}

export interface UseCanvasPanResult {
  /** True while the user is actively dragging to pan. */
  isPanning: boolean
  /** True while space is held — used to render the grab cursor as an affordance. */
  spaceHeld: boolean
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return true
  if (target.isContentEditable) return true
  return false
}

/**
 * Wire pan-by-drag inputs on a scrollable element:
 *   - Middle-click drag: pans regardless of active tool.
 *   - Space + left-drag: pans (matches Photoshop / Figma).
 * Native trackpad two-finger scroll already pans via the wrapper's
 * `overflow: auto` and is not handled here.
 *
 * Mousedown listener is attached in the **capture** phase so it can
 * stop drawing tools (whose listeners live on inner elements in
 * bubble phase) from reacting to a pan-initiating click.
 *
 * Space tracking is scoped: keypresses inside form inputs / contenteditable
 * elements are ignored so users can still type space-separated values.
 */
export function useCanvasPan({ scrollEl }: UseCanvasPanOptions): UseCanvasPanResult {
  const [isPanning, setIsPanning] = useState(false)
  const [spaceHeld, setSpaceHeld] = useState(false)
  const spaceHeldRef = useRef(false)
  spaceHeldRef.current = spaceHeld

  // Track space across the whole window (with input-field exclusion)
  // so the user can press space while hovering the canvas.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (isEditableTarget(e.target)) return
      if (spaceHeldRef.current) return
      setSpaceHeld(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useEffect(() => {
    if (!scrollEl) return

    let dragging = false
    let lastX = 0
    let lastY = 0

    const onMouseDown = (e: MouseEvent) => {
      const isMiddle = e.button === 1
      const isSpaceLeft = e.button === 0 && spaceHeldRef.current
      if (!isMiddle && !isSpaceLeft) return
      // Stop the active drawing tool from seeing this click. Capture
      // phase + stopPropagation suppresses bubble listeners on inner
      // elements (where draw/select/text tools live).
      e.preventDefault()
      e.stopPropagation()
      dragging = true
      setIsPanning(true)
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!dragging) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      lastX = e.clientX
      lastY = e.clientY
      scrollEl.scrollLeft -= dx
      scrollEl.scrollTop -= dy
    }

    const endDrag = () => {
      if (!dragging) return
      dragging = false
      setIsPanning(false)
    }

    scrollEl.addEventListener('mousedown', onMouseDown, { capture: true })
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', endDrag)
    window.addEventListener('blur', endDrag)
    return () => {
      scrollEl.removeEventListener('mousedown', onMouseDown, { capture: true })
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', endDrag)
      window.removeEventListener('blur', endDrag)
    }
  }, [scrollEl])

  return { isPanning, spaceHeld }
}
