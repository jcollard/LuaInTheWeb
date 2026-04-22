import { useEffect, useState } from 'react'
import type { ScaleMode } from './types'
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
 * At these scale modes the canvas displays near its source-pixel size,
 * so the browser's fractional-DPR downsample is most visible. Integer
 * 2× / 3× effectively pre-scale before the browser resample, masking
 * the artifact; `fit` / `fill` already produce non-integer scales so
 * the warning isn't additionally informative there.
 */
function isAtRisk(scaleMode: ScaleMode): boolean {
  return scaleMode === 'integer-1x' || scaleMode === 'integer-auto'
}

function readDismissed(): boolean {
  try { return localStorage.getItem(DISMISS_KEY) === '1' } catch { return false }
}

function writeDismissed(): void {
  try { localStorage.setItem(DISMISS_KEY, '1') } catch { /* ignore quota / privacy-mode errors */ }
}

export interface DprWarningProps {
  scaleMode: ScaleMode
  /**
   * When true, the user has enabled "Crisp pixels on HiDPI" so the
   * scale is already DPR-snapped — the warning is no longer
   * informative and is suppressed.
   */
  dprCompensate?: boolean
}

export function DprWarning({ scaleMode, dprCompensate = false }: DprWarningProps) {
  const [dismissed, setDismissed] = useState<boolean>(() => readDismissed())
  const [dpr, setDpr] = useState<number>(
    () => (typeof window !== 'undefined' ? window.devicePixelRatio : 1),
  )

  // Re-read DPR when it actually changes (monitor hot-swap, browser zoom).
  // matchMedia is the only reliable DPR-change event in browsers.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(`(resolution: ${dpr}dppx)`)
    const onChange = () => setDpr(window.devicePixelRatio)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [dpr])

  if (dismissed) return null
  if (dprCompensate) return null
  if (!isFractionalDpr(dpr)) return null
  if (!isAtRisk(scaleMode)) return null

  const handleDismiss = () => {
    setDismissed(true)
    writeDismissed()
  }

  return (
    <div className={styles.banner} role="status" data-testid="dpr-warning">
      <span className={styles.message}>
        Your display is at <strong>{dpr.toFixed(2)}× DPR</strong>. Bitmap fonts may show
        uneven pixels at <em>Integer 1×</em> / <em>Integer Auto</em>. Switch Scale to
        <em> Integer 2×</em> or <em> Integer 3×</em> in File Options for a crisp look.
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
