import type { ReactNode } from 'react'

export interface IDEPanelProps {
  /** Default size as percentage (0-100) */
  defaultSize?: number
  /** Minimum size as percentage */
  minSize?: number
  /** Maximum size as percentage */
  maxSize?: number
  /** Whether panel can be collapsed */
  collapsible?: boolean
  /** Controlled collapsed state */
  collapsed?: boolean
  /** Callback when collapsed state changes */
  onCollapse?: (collapsed: boolean) => void
  /** Optional header content (shown even when collapsed) */
  header?: ReactNode
  /** Panel content */
  children: ReactNode
  /** Additional CSS class */
  className?: string
}

export interface UseIDEPanelOptions {
  /** Initial collapsed state */
  defaultCollapsed?: boolean
  /** Controlled collapsed state */
  collapsed?: boolean
  /** Callback when collapsed state changes */
  onCollapse?: (collapsed: boolean) => void
}

export interface UseIDEPanelReturn {
  /** Current collapsed state */
  isCollapsed: boolean
  /** Toggle collapsed state */
  toggle: () => void
  /** Expand the panel */
  expand: () => void
  /** Collapse the panel */
  collapse: () => void
}
