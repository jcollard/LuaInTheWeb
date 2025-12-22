import { useCallback } from 'react'

export interface UploadedFile {
  name: string
  content: string
}

export type OnFilesUploadedCallback = (targetPath: string, files: UploadedFile[]) => void | Promise<void>

export interface UseFileUploadReturn {
  triggerFileUpload: (targetPath: string, onFilesUploaded: OnFilesUploadedCallback) => void
}

/**
 * Hook to handle file import from the system file picker.
 * Creates a hidden file input, triggers the file picker, reads selected files,
 * and calls the callback with the file contents.
 */
export function useFileUpload(): UseFileUploadReturn {
  const triggerFileUpload = useCallback(
    (targetPath: string, onFilesUploaded: OnFilesUploadedCallback) => {
      // Create hidden file input
      const input = document.createElement('input')
      input.type = 'file'
      input.multiple = true

      // Handle file selection
      input.addEventListener('change', () => {
        const files = input.files
        if (!files || files.length === 0) {
          return
        }

        const uploadedFiles: UploadedFile[] = []
        let filesRead = 0

        // Read all files
        for (const file of files) {
          const reader = new FileReader()
          reader.onload = () => {
            uploadedFiles.push({
              name: file.name,
              content: reader.result as string,
            })
            filesRead++

            // When all files are read, call the callback
            if (filesRead === files.length) {
              onFilesUploaded(targetPath, uploadedFiles)
            }
          }
          reader.readAsText(file)
        }
      })

      // Trigger file picker
      input.click()
    },
    []
  )

  return { triggerFileUpload }
}
