import { useState, useCallback, useRef, useEffect } from 'react'

const STORAGE_KEY = 'ansi-layers-panel-width'
const MIN_WIDTH = 270
const MAX_WIDTH = 800

function clamp(value: number): number {
  return Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, value))
}

function loadWidth(): number {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return MIN_WIDTH
  const n = Number(raw)
  if (Number.isNaN(n)) return MIN_WIDTH
  return clamp(n)
}

export interface ResizablePanelResult {
  width: number
  isResizing: boolean
  handleMouseDown: (e: React.MouseEvent) => void
}

export function useResizablePanel(): ResizablePanelResult {
  const [width, setWidth] = useState(loadWidth)
  const [isResizing, setIsResizing] = useState(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)
  const widthRef = useRef(width)
  widthRef.current = width

  const handleMouseMove = useCallback((e: MouseEvent) => {
    // Panel is on the right, so dragging left (decreasing clientX) means wider
    const delta = startXRef.current - e.clientX
    const newWidth = clamp(startWidthRef.current + delta)
    setWidth(newWidth)
  }, [])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)
    // Persist on mouseup — read current width from state via functional update
    setWidth(current => {
      localStorage.setItem(STORAGE_KEY, String(current))
      return current
    })
  }, [handleMouseMove])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startXRef.current = e.clientX
    startWidthRef.current = widthRef.current
    setIsResizing(true)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [handleMouseMove, handleMouseUp])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  return { width, isResizing, handleMouseDown }
}
