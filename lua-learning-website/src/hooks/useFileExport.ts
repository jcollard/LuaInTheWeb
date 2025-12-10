import { useCallback } from 'react'

/**
 * Sanitizes a filename by removing invalid characters
 * @param filename - The filename to sanitize
 * @returns Sanitized filename safe for downloads
 */
function sanitizeFilename(filename: string): string {
  // Extract just the filename from path (remove directory separators)
  const basename = filename.split(/[/\\]/).pop() ?? filename

  // Remove characters invalid for filenames: < > : " / \ | ? *
  const sanitized = basename.replace(/[<>:"/\\|?*]/g, '')

  // Ensure .lua extension
  if (!sanitized.endsWith('.lua')) {
    return `${sanitized}.lua`
  }

  return sanitized
}

interface UseFileExportReturn {
  /** Export content as a downloadable file */
  exportFile: (content: string, filename: string) => void
  /** Check if content can be exported */
  canExport: (content: string | undefined) => boolean
}

/**
 * Hook for exporting file content as a downloadable file
 */
export function useFileExport(): UseFileExportReturn {
  const exportFile = useCallback((content: string, filename: string) => {
    const sanitizedFilename = sanitizeFilename(filename)

    // Create blob with content
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    // Create and configure anchor element
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = sanitizedFilename

    // Trigger download (modern browsers don't require appending to DOM)
    anchor.click()

    // Cleanup
    URL.revokeObjectURL(url)
  }, [])

  const canExport = useCallback((content: string | undefined): boolean => {
    if (content === undefined || content === '') {
      return false
    }
    // Check if content is whitespace only
    return content.trim().length > 0
  }, [])

  return { exportFile, canExport }
}
