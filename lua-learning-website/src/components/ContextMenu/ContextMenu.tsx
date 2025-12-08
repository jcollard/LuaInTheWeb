import { useEffect, useRef, useCallback, type KeyboardEvent } from 'react'
import styles from './ContextMenu.module.css'
import type { ContextMenuProps } from './types'

export function ContextMenu({
  isOpen,
  position,
  items,
  onSelect,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const focusIndexRef = useRef(0)

  // Get non-divider items for keyboard navigation
  const selectableItems = items.filter(item => item.type !== 'divider')

  // Focus first item when menu opens
  useEffect(() => {
    if (isOpen && itemRefs.current[0]) {
      focusIndexRef.current = 0
      itemRefs.current[0]?.focus()
    }
  }, [isOpen])

  // Handle click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    return () => document.removeEventListener('mousedown', handleMouseDown)
  }, [isOpen, onClose])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onClose()
          break
        case 'ArrowDown':
          event.preventDefault()
          if (focusIndexRef.current < selectableItems.length - 1) {
            focusIndexRef.current++
            itemRefs.current[focusIndexRef.current]?.focus()
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          if (focusIndexRef.current > 0) {
            focusIndexRef.current--
            itemRefs.current[focusIndexRef.current]?.focus()
          }
          break
        case 'Enter': {
          event.preventDefault()
          const selectedItem = selectableItems[focusIndexRef.current]
          if (selectedItem && !selectedItem.disabled) {
            onSelect(selectedItem.id)
            onClose()
          }
          break
        }
      }
    },
    [selectableItems, onSelect, onClose]
  )

  const handleItemClick = useCallback(
    (id: string) => {
      onSelect(id)
      onClose()
    },
    [onSelect, onClose]
  )

  if (!isOpen) {
    return null
  }

  let selectableIndex = 0

  return (
    <div
      ref={menuRef}
      role="menu"
      className={styles.menu}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onKeyDown={handleKeyDown}
    >
      {items.map((item, index) => {
        if (item.type === 'divider') {
          return (
            <div
              key={item.id || index}
              role="separator"
              className={styles.divider}
            />
          )
        }

        const currentIndex = selectableIndex
        selectableIndex++

        return (
          <button
            key={item.id}
            ref={(el) => {
              itemRefs.current[currentIndex] = el
            }}
            role="menuitem"
            className={styles.menuItem}
            disabled={item.disabled}
            onClick={() => handleItemClick(item.id)}
          >
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
