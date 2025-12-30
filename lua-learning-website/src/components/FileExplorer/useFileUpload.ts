import { useRef, useCallback } from 'react'

export interface UseFileUploadReturn {
  /** Ref to attach to the hidden file input element */
  fileInputRef: React.RefObject<HTMLInputElement | null>
  /** Trigger the file upload dialog for a specific target folder */
  triggerUpload: (targetPath: string) => void
  /** Handle file selection from the input element */
  handleFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void
}

interface UseFileUploadParams {
  /** Callback when files are selected */
  onFilesSelected: (files: FileList, targetPath: string) => void
}

/**
 * Hook to manage file upload via hidden input element.
 * Handles the flow: trigger -> select files -> callback with target path.
 */
export function useFileUpload({ onFilesSelected }: UseFileUploadParams): UseFileUploadReturn {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const uploadTargetPathRef = useRef<string | null>(null)

  const triggerUpload = useCallback((targetPath: string) => {
    uploadTargetPathRef.current = targetPath
    fileInputRef.current?.click()
  }, [])

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files
      const targetPath = uploadTargetPathRef.current

      if (files && files.length > 0 && targetPath) {
        onFilesSelected(files, targetPath)
      }

      // Reset input to allow selecting same file again
      event.target.value = ''
      uploadTargetPathRef.current = null
    },
    [onFilesSelected]
  )

  return {
    fileInputRef,
    triggerUpload,
    handleFileSelect,
  }
}
