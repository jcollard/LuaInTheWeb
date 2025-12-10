import styles from './MenuItem.module.css'

export interface MenuItemProps {
  /** Unique identifier for the menu item */
  id: string
  /** Display label for the menu item */
  label: string
  /** Action to execute when item is clicked */
  action?: () => void
  /** Keyboard shortcut display string (e.g., "Ctrl+S") */
  shortcut?: string
  /** Whether the item is disabled */
  disabled?: boolean
  /** Whether the item is currently focused (for keyboard navigation) */
  isFocused?: boolean
}

/**
 * A single item in a dropdown menu
 */
export function MenuItem({
  label,
  action,
  shortcut,
  disabled = false,
  isFocused = false,
}: MenuItemProps): React.JSX.Element {
  const handleClick = () => {
    if (!disabled && action) {
      action()
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      if (!disabled && action) {
        action()
      }
    }
  }

  const classNames = [styles.menuItem]
  if (disabled) {
    classNames.push(styles.disabled)
  }
  if (isFocused) {
    classNames.push(styles.focused)
  }

  return (
    <div
      role="menuitem"
      tabIndex={-1}
      className={classNames.join(' ')}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-disabled={disabled || undefined}
    >
      <span className={styles.label}>{label}</span>
      {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
    </div>
  )
}
