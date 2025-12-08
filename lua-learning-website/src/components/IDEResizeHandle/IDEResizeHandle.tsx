import { useState, useCallback } from 'react'
import { PanelResizeHandle } from 'react-resizable-panels'
import type { IDEResizeHandleProps } from './types'
import styles from './IDEResizeHandle.module.css'

export function IDEResizeHandle({ className, onDoubleClick }: IDEResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const handleDragging = useCallback((dragging: boolean) => {
    setIsDragging(dragging)
    // Stryker disable next-line ArrayDeclaration: Empty dependency array - stable callback, tests verify behavior
  }, [])

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true)
    // Stryker disable next-line ArrayDeclaration: Empty dependency array - stable callback, tests verify behavior
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    // Stryker disable next-line ArrayDeclaration: Empty dependency array - stable callback, tests verify behavior
  }, [])

  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Stryker disable next-line ArrayDeclaration: Empty dependency array - stable callback, tests verify behavior
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Stryker disable next-line ArrayDeclaration: Empty dependency array - stable callback, tests verify behavior
  }, [])

  const combinedClassName = className
    ? `${styles.handle} ${className}`
    : styles.handle

  return (
    <PanelResizeHandle
      className={combinedClassName}
      onDragging={handleDragging}
      onDoubleClick={onDoubleClick}
    >
      <div
        data-testid="resize-handle-inner"
        className={styles.inner}
        data-hovered={isHovered ? 'true' : 'false'}
        data-dragging={isDragging ? 'true' : 'false'}
        data-focused={isFocused ? 'true' : 'false'}
        tabIndex={-1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
    </PanelResizeHandle>
  )
}
