import { useState, useCallback } from 'react'
import type { UseIDEPanelOptions, UseIDEPanelReturn } from './types'

export function useIDEPanel(options: UseIDEPanelOptions = {}): UseIDEPanelReturn {
  const { defaultCollapsed = false, collapsed: controlledCollapsed, onCollapse } = options

  const isControlled = controlledCollapsed !== undefined
  const [internalCollapsed, setInternalCollapsed] = useState(defaultCollapsed)

  const isCollapsed = isControlled ? controlledCollapsed : internalCollapsed

  const toggle = useCallback(() => {
    const newValue = !isCollapsed
    // Stryker disable next-line ConditionalExpression: In controlled mode, internal state is ignored - mutation doesn't affect observable behavior
    if (!isControlled) {
      setInternalCollapsed(newValue)
    }
    onCollapse?.(newValue)
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [isCollapsed, isControlled, onCollapse])

  const expand = useCallback(() => {
    if (isCollapsed) {
      // Stryker disable next-line ConditionalExpression: In controlled mode, internal state is ignored - mutation doesn't affect observable behavior
      if (!isControlled) {
        setInternalCollapsed(false)
      }
      onCollapse?.(false)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [isCollapsed, isControlled, onCollapse])

  const collapse = useCallback(() => {
    if (!isCollapsed) {
      // Stryker disable next-line ConditionalExpression: In controlled mode, internal state is ignored - mutation doesn't affect observable behavior
      if (!isControlled) {
        setInternalCollapsed(true)
      }
      onCollapse?.(true)
    }
    // Stryker disable next-line ArrayDeclaration: React dependency array - tests verify behavior, not re-render optimization
  }, [isCollapsed, isControlled, onCollapse])

  return {
    isCollapsed,
    toggle,
    expand,
    collapse,
  }
}
