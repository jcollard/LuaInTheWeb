import { useState, useCallback } from 'react'

export interface UseMenuBarReturn {
  openMenuId: string | null
  isOpen: boolean
  openMenu: (menuId: string) => void
  closeMenu: () => void
  toggleMenu: (menuId: string) => void
  isMenuOpen: (menuId: string) => boolean
}

/**
 * Hook for managing menu bar state
 * - Tracks which menu is currently open
 * - Provides open/close/toggle methods
 * - Only one menu can be open at a time
 */
export function useMenuBar(): UseMenuBarReturn {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const openMenu = useCallback((menuId: string) => {
    setOpenMenuId(menuId)
  }, [])

  const closeMenu = useCallback(() => {
    setOpenMenuId(null)
  }, [])

  const toggleMenu = useCallback((menuId: string) => {
    setOpenMenuId((current) => (current === menuId ? null : menuId))
  }, [])

  const isMenuOpen = useCallback(
    (menuId: string) => openMenuId === menuId,
    [openMenuId]
  )

  return {
    openMenuId,
    isOpen: openMenuId !== null,
    openMenu,
    closeMenu,
    toggleMenu,
    isMenuOpen,
  }
}
