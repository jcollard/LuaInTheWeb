import { useState } from 'react'
import { useDprChange } from '../AnsiTerminalPanel/panelHelpers'
import styles from './DprWarning.module.css'

const DISMISS_KEY = 'ansi-editor:dpr-warning-dismissed'

/**
 * True when `dpr` isn't close to an integer. Fractional DPRs (1.25,
 * 1.5, 1.75) force the browser to resample the pixel canvas
 * non-uniformly, producing the visible "some pixels are 1×1, others
 * are 2×2" pattern that this warning exists to flag.
 */
function isFractionalDpr(dpr: number): boolean {
  return Math.abs(dpr - Math.round(dpr)) > 0.01
}

/**
 * At low zoom levels the canvas displays near its source-pixel size,
 * so the browser's fractional-DPR downsample is most visible. Higher
 * integer zooms effectively pre-scale before the browser resample,
 * masking the artifact.
 */
function isAtRisk(zoom: number): boolean {
  return zoom < 1.5
}

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

function writeDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore quota / privacy-mode errors */ }
}

export interface DprWarningProps {
  /** Current viewport zoom (1 = 1x, 2 = 2x, etc.). */
  zoom: number
  /**
   * When true, the user has enabled "Emulate Pixel Perfect on HiDPI"
   * so the scale is already DPR-snapped — the warning is no longer
   * informative and is suppressed.
   */
  dprCompensate?: boolean
}

export function DprWarning({ zoom, dprCompensate = false }: DprWarningProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())
  const [dpr, setDpr] = useState<number>(
    () => (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
  )
  useDprChange(() => setDpr(window.devicePixelRatio))

  if (dismissed) return null
  if (dprCompensate) return null
  if (!isFractionalDpr(dpr)) return null
  if (!isAtRisk(zoom)) return null

  const handleDismiss = () => {
    setDismissed(true)
    writeDismissed()
  }

  return (
    <div className={styles.banner} role="status" data-testid="dpr-warning">
      <span className={styles.message}>
        Your display is at <strong>{dpr.toFixed(2)}× DPR</strong>. Bitmap fonts may show
        uneven pixels at <em>1×</em> zoom. Increase zoom to <em>2×</em> or <em>3×</em>
        for a crisp look.
      </span>
      <button
        type="button"
        className={styles.dismiss}
        onClick={handleDismiss}
        aria-label="Dismiss warning"
        title="Dismiss — won't show again"
      >
        ✕
      </button>
    </div>
  )
}
