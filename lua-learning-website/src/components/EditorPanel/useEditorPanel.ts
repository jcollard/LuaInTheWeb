import { useState, useCallback } from 'react'
import type { UseEditorPanelOptions, UseEditorPanelReturn } from './types'

/**
 * Hook for managing editor panel state
 */
export function useEditorPanel(options?: UseEditorPanelOptions): UseEditorPanelReturn {
  const [cursorLine, setCursorLine] = useState(1)
  const [cursorColumn, setCursorColumn] = useState(1)

  const handleCursorChange = useCallback(
    (line: number, column: number) => {
      setCursorLine(line)
      setCursorColumn(column)
      options?.onCursorChange?.(line, column)
    },
    [options]
  )

  return {
    cursorLine,
    cursorColumn,
    handleCursorChange,
  }
}
