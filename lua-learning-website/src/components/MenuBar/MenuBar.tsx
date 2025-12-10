import { useEffect, useRef, useCallback } from 'react'
import { Menu } from './Menu'
import { useMenuBar } from '../../hooks/useMenuBar'
import type { MenuDefinition } from './types'
import styles from './MenuBar.module.css'

export interface MenuBarProps {
  /** Menu definitions */
  menus: MenuDefinition[]
  /** Optional additional CSS class */
  className?: string
}

/**
 * Application menu bar with File, Edit, Settings menus
 */
export function MenuBar({ menus, className }: MenuBarProps): React.JSX.Element {
  const { openMenuId, toggleMenu, closeMenu } = useMenuBar()
  const containerRef = useRef<HTMLDivElement>(null)

  // Close menu when clicking outside
  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        closeMenu()
      }
    },
    [closeMenu]
  )

  useEffect(() => {
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [handleClickOutside])

  const containerClassName = className
    ? `${styles.menuBar} ${className}`
    : styles.menuBar

  return (
    <div
      ref={containerRef}
      role="menubar"
      aria-label="Application menu"
      className={containerClassName}
    >
      {menus.map((menu) => (
        <Menu
          key={menu.id}
          id={menu.id}
          label={menu.label}
          items={menu.items}
          isOpen={openMenuId === menu.id}
          onToggle={() => toggleMenu(menu.id)}
          onClose={closeMenu}
        />
      ))}
    </div>
  )
}
