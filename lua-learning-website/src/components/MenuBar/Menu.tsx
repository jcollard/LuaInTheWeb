import { useState, useEffect, useCallback, useRef } from 'react'
import { MenuItem } from './MenuItem'
import { MenuDivider } from './MenuDivider'
import { isDivider } from './types'
import type { MenuItemDefinition, MenuDividerDefinition } from './types'
import styles from './Menu.module.css'

export interface MenuProps {
  /** Unique identifier for the menu */
  id: string
  /** Display label for the menu trigger */
  label: string
  /** Items in this menu */
  items: (MenuItemDefinition | MenuDividerDefinition)[]
  /** Whether the dropdown is open */
  isOpen: boolean
  /** Called when menu should close */
  onClose: () => void
  /** Called when trigger is clicked */
  onToggle?: () => void
}

/**
 * A single menu with trigger button and dropdown
 */
export function Menu({
  id,
  label,
  items,
  isOpen,
  onClose,
  onToggle,
}: MenuProps): React.JSX.Element {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Get only non-divider items for navigation
  const navigableItems = items.filter(
    (item): item is MenuItemDefinition => !isDivider(item) && !item.disabled
  )

  // Reset focus when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0)
    }
  }, [isOpen])

  // Focus the menu container when open
  useEffect(() => {
    if (isOpen && menuRef.current) {
      menuRef.current.focus()
    }
  }, [isOpen])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown': {
          event.preventDefault()
          setFocusedIndex((prev) => (prev + 1) % navigableItems.length)
          break
        }
        case 'ArrowUp': {
          event.preventDefault()
          setFocusedIndex((prev) =>
            prev === 0 ? navigableItems.length - 1 : prev - 1
          )
          break
        }
        case 'Enter': {
          event.preventDefault()
          const focusedItem = navigableItems[focusedIndex]
          if (focusedItem?.action) {
            focusedItem.action()
            onClose()
          }
          break
        }
        case 'Escape': {
          event.preventDefault()
          onClose()
          break
        }
      }
    },
    [navigableItems, focusedIndex, onClose]
  )

  const handleItemClick = useCallback(
    (item: MenuItemDefinition) => {
      if (item.disabled) return
      if (item.action) {
        item.action()
      }
      onClose()
    },
    [onClose]
  )

  const triggerId = `${id}-trigger`

  return (
    <div className={styles.menuContainer}>
      <button
        id={triggerId}
        type="button"
        className={styles.trigger}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        {label}
      </button>
      {isOpen && (
        <div
          ref={menuRef}
          role="menu"
          className={styles.dropdown}
          aria-labelledby={triggerId}
          tabIndex={-1}
          onKeyDown={handleKeyDown}
        >
          {items.map((item, index) => {
            if (isDivider(item)) {
              return <MenuDivider key={item.id ?? `divider-${index}`} />
            }

            // Find the index in navigable items for focus tracking
            const navigableIndex = navigableItems.findIndex(
              (navItem) => navItem.id === item.id
            )
            const isFocused = navigableIndex === focusedIndex

            return (
              <MenuItem
                key={item.id}
                id={item.id}
                label={item.label}
                shortcut={item.shortcut}
                disabled={item.disabled}
                action={() => handleItemClick(item)}
                isFocused={isFocused && !item.disabled}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}
