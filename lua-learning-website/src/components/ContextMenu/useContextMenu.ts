import { useState, useCallback } from 'react'
import type { UseContextMenuReturn } from './types'

export function useContextMenu(): UseContextMenuReturn {
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  const show = useCallback((x: number, y: number) => {
    setPosition({ x, y })
    setIsOpen(true)
  }, [])

  const hide = useCallback(() => {
    setIsOpen(false)
  }, [])

  return {
    isOpen,
    position,
    show,
    hide,
  }
}
