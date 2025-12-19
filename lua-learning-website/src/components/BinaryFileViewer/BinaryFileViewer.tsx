import { useState, useEffect, useMemo } from 'react'
import type { IFileSystem } from '@lua-learning/shell-core'
import styles from './BinaryFileViewer.module.css'

/**
 * Image file extensions that can be displayed
 */
const IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.bmp',
  '.webp',
  '.ico',
  '.svg',
])

/**
 * Audio file extensions that can be played
 */
const AUDIO_EXTENSIONS = new Set([
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.flac',
  '.aac',
])

/**
 * Get the file extension from a path
 */
function getExtension(path: string): string {
  const lastDot = path.lastIndexOf('.')
  if (lastDot === -1) return ''
  return path.slice(lastDot).toLowerCase()
}

/**
 * Check if a file is an image based on extension
 */
function isImageFile(path: string): boolean {
  return IMAGE_EXTENSIONS.has(getExtension(path))
}

/**
 * Check if a file is an audio file based on extension
 */
function isAudioFile(path: string): boolean {
  return AUDIO_EXTENSIONS.has(getExtension(path))
}

/**
 * Get the MIME type for an image or audio extension
 */
function getMimeType(path: string): string {
  const ext = getExtension(path)
  switch (ext) {
    // Image types
    case '.png':
      return 'image/png'
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.gif':
      return 'image/gif'
    case '.bmp':
      return 'image/bmp'
    case '.webp':
      return 'image/webp'
    case '.ico':
      return 'image/x-icon'
    case '.svg':
      return 'image/svg+xml'
    // Audio types
    case '.mp3':
      return 'audio/mpeg'
    case '.wav':
      return 'audio/wav'
    case '.ogg':
      return 'audio/ogg'
    case '.m4a':
      return 'audio/mp4'
    case '.flac':
      return 'audio/flac'
    case '.aac':
      return 'audio/aac'
    default:
      return 'application/octet-stream'
  }
}

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export interface BinaryFileViewerProps {
  /** Path to the binary file */
  filePath: string
  /** Filesystem to read from */
  fileSystem: IFileSystem
  /** Optional CSS class name */
  className?: string
}

/**
 * Component to view binary files.
 * Displays images inline, shows info for other binary files.
 */
export function BinaryFileViewer({ filePath, fileSystem, className }: BinaryFileViewerProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [fileSize, setFileSize] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const isImage = useMemo(() => isImageFile(filePath), [filePath])
  const isAudio = useMemo(() => isAudioFile(filePath), [filePath])
  const extension = useMemo(() => getExtension(filePath), [filePath])
  const fileName = useMemo(() => {
    const lastSlash = filePath.lastIndexOf('/')
    return lastSlash === -1 ? filePath : filePath.slice(lastSlash + 1)
  }, [filePath])

  useEffect(() => {
    // Clean up previous blob URL
    if (blobUrl) {
      URL.revokeObjectURL(blobUrl)
      setBlobUrl(null)
    }
    setError(null)
    setFileSize(null)

    // Read the binary file
    try {
      // Check if filesystem supports binary reading
      if (typeof fileSystem.readBinaryFile !== 'function') {
        setError('This filesystem does not support binary files')
        return
      }

      const content = fileSystem.readBinaryFile(filePath)
      setFileSize(content.byteLength)

      if (isImage || isAudio) {
        // Create blob URL for image/audio display
        const mimeType = getMimeType(filePath)
        // Create a copy of the data as ArrayBuffer for Blob constructor compatibility
        const arrayBuffer = new ArrayBuffer(content.byteLength)
        new Uint8Array(arrayBuffer).set(content)
        const blob = new Blob([arrayBuffer], { type: mimeType })
        const url = URL.createObjectURL(blob)
        setBlobUrl(url)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
    }

    // Cleanup on unmount or path change
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, fileSystem, isImage, isAudio])

  const combinedClassName = className
    ? `${styles.container} ${className}`
    : styles.container

  if (error) {
    return (
      <div className={combinedClassName}>
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>!</span>
          <span>{error}</span>
        </div>
      </div>
    )
  }

  if (isImage && blobUrl) {
    return (
      <div className={combinedClassName}>
        <div className={styles.imageContainer}>
          <img
            src={blobUrl}
            alt={fileName}
            className={styles.image}
          />
        </div>
        {fileSize !== null && (
          <div className={styles.fileInfo}>
            {fileName} - {formatBytes(fileSize)}
          </div>
        )}
      </div>
    )
  }

  if (isAudio && blobUrl) {
    return (
      <div className={combinedClassName}>
        <div className={styles.audioContainer}>
          <audio
            src={blobUrl}
            controls
            className={styles.audioPlayer}
          />
        </div>
        {fileSize !== null && (
          <div className={styles.fileInfo}>
            {fileName} - {formatBytes(fileSize)}
          </div>
        )}
      </div>
    )
  }

  // Non-image/audio binary file
  return (
    <div className={combinedClassName}>
      <div className={styles.binaryInfo}>
        <div className={styles.binaryIcon}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="currentColor">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
          </svg>
        </div>
        <div className={styles.binaryText}>
          <div className={styles.fileName}>{fileName}</div>
          <div className={styles.fileType}>
            Binary file{extension ? ` (${extension})` : ''}
          </div>
          {fileSize !== null && (
            <div className={styles.fileSize}>{formatBytes(fileSize)}</div>
          )}
        </div>
      </div>
    </div>
  )
}
