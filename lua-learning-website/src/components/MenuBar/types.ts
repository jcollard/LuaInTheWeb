/**
 * Definition for a single menu item
 */
export interface MenuItemDefinition {
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
}

/**
 * Definition for a menu (group of menu items)
 */
export interface MenuDefinition {
  /** Unique identifier for the menu */
  id: string
  /** Display label for the menu trigger */
  label: string
  /** Items in this menu (including dividers) */
  items: (MenuItemDefinition | MenuDividerDefinition)[]
}

/**
 * Definition for a menu divider
 */
export interface MenuDividerDefinition {
  /** Type discriminator for dividers */
  type: 'divider'
  /** Optional unique identifier */
  id?: string
}

/**
 * Type guard to check if an item is a divider
 */
export function isDivider(
  item: MenuItemDefinition | MenuDividerDefinition
): item is MenuDividerDefinition {
  return 'type' in item && item.type === 'divider'
}
