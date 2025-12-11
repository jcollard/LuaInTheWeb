import type { CSSProperties } from 'react'

export interface IDEResizeHandleProps {
  /** Additional CSS class */
  className?: string
  /** Inline styles for the handle container */
  style?: CSSProperties
  /** Called when the handle is double-clicked (e.g., to reset panel sizes) */
  onDoubleClick?: () => void
}
