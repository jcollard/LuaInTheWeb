import { useState, useCallback, useRef, useEffect, useId, type KeyboardEvent } from 'react'
import { PNG_EXPORT_SCALES, type PngExportScale } from './pngExport'
import styles from './SaveAsDialog.module.css'
import dialogStyles from './PngExportDialog.module.css'

const EXTENSION = '.png'

export interface PngExportDialogProps {
  isOpen: boolean
  /** Default file name (without `.png`). */
  defaultFileName: string
  /** Pre-computed output dimensions for each allowed scale. */
  dimensionsForScale: (scale: PngExportScale) => { width: number; height: number }
  onExport: (fileName: string, scale: PngExportScale) => void
  onCancel: () => void
}

function ensureExtension(name: string): string {
  if (name.toLowerCase().endsWith(EXTENSION)) return name
  return name + EXTENSION
}

function stripExtension(name: string): string {
  return name.replace(/\.png$/i, '')
}

export function PngExportDialog({
  isOpen, defaultFileName, dimensionsForScale, onExport, onCancel,
}: PngExportDialogProps) {
  const [fileName, setFileName] = useState(stripExtension(defaultFileName))
  const [scale, setScale] = useState<PngExportScale>(1)
  const [error, setError] = useState('')

  const filenameInputRef = useRef<HTMLInputElement>(null)
  const exportButtonRef = useRef<HTMLButtonElement>(null)

  const titleId = useId()

  useEffect(() => {
    if (isOpen && filenameInputRef.current) {
      filenameInputRef.current.focus()
      filenameInputRef.current.select()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      setFileName(stripExtension(defaultFileName))
      setScale(1)
      setError('')
    }
  }, [isOpen, defaultFileName])

  const handleExport = useCallback(() => {
    const trimmed = fileName.trim()
    if (!trimmed) {
      setError('Please enter a file name.')
      return
    }
    setError('')
    onExport(ensureExtension(trimmed), scale)
  }, [fileName, scale, onExport])

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onCancel()
        break
      case 'Enter':
        if (
          document.activeElement === filenameInputRef.current ||
          document.activeElement === exportButtonRef.current
        ) {
          event.preventDefault()
          handleExport()
        }
        break
    }
  }, [onCancel, handleExport])

  if (!isOpen) return null

  const dims = dimensionsForScale(scale)

  return (
    <div className={styles.overlay} data-testid="png-export-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={styles.dialog}
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <h2 id={titleId} className={styles.title}>Export PNG</h2>
        </div>
        <div className={styles.body}>
          <div className={styles.filenameGroup}>
            <label className={styles.label} htmlFor="png-export-filename">File name</label>
            <div className={styles.filenameInputRow}>
              <input
                ref={filenameInputRef}
                id="png-export-filename"
                className={styles.filenameInput}
                type="text"
                value={fileName}
                onChange={e => {
                  setFileName(e.target.value)
                  setError('')
                }}
                data-testid="png-export-filename"
              />
              <span
                className={styles.filenameSuffix}
                data-testid="png-export-extension-suffix"
                aria-hidden="true"
              >
                {EXTENSION}
              </span>
            </div>
            {error && <div className={styles.errorMessage} data-testid="png-export-error">{error}</div>}
          </div>
          <div>
            <div className={styles.label}>Scale</div>
            <div className={dialogStyles.scaleRow} role="radiogroup" aria-label="Scale">
              {PNG_EXPORT_SCALES.map(s => (
                <button
                  key={s}
                  type="button"
                  role="radio"
                  aria-checked={scale === s}
                  className={`${dialogStyles.scaleButton} ${scale === s ? dialogStyles.scaleButtonActive : ''}`}
                  onClick={() => setScale(s)}
                  data-testid={`png-export-scale-${s}x`}
                >
                  {s}×
                </button>
              ))}
              <span className={dialogStyles.dimensionsLabel} data-testid="png-export-dimensions">
                {dims.width} × {dims.height} px
              </span>
            </div>
          </div>
        </div>
        <div className={styles.footer}>
          <button
            type="button"
            className={`${styles.button} ${styles.cancelButton}`}
            onClick={onCancel}
            data-testid="png-export-cancel"
          >
            Cancel
          </button>
          <button
            ref={exportButtonRef}
            type="button"
            className={`${styles.button} ${styles.saveButton}`}
            onClick={handleExport}
            data-testid="png-export-confirm"
          >
            Export
          </button>
        </div>
      </div>
    </div>
  )
}
