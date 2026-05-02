import { useEffect, useState } from 'react'
import { MAX_ZOOM, MIN_ZOOM, clampZoom, isCrisp, nextCrispZoom } from './useViewport'
import styles from './AnsiGraphicsEditor.module.css'

export interface ZoomControlProps {
  zoom: number
  onSetZoom: (z: number) => void
  onFit: () => void
  /** Current devicePixelRatio. Used to compute pixel-crispness of the
   *  selected zoom and surface a snap-to-crisp button when the canvas
   *  would render with the 1-2-1-2 subpixel-resampling pattern. */
  dpr?: number
}

function formatZoomLabel(z: number): string {
  // Integers render as "1x". Above 1, one decimal ("2.5x"). Below 1, two
  // decimals so 0.25x doesn't display as 0.3x (which would also render
  // visually identical to a 0.3 slider step that ISN'T 0.25).
  if (Math.abs(z - Math.round(z)) < 0.005) return `${Math.round(z)}x`
  const decimals = z < 1 ? 2 : 1
  // Trim trailing zeros (e.g. 0.50 → 0.5) for a cleaner display.
  return `${z.toFixed(decimals).replace(/\.?0+$/, '')}x`
}

/** Build the shared "Nx × DPR D = P device px / source px" prefix used
 *  by the crisp/warn tooltips. `pxFormat` controls how the product is
 *  rendered: integer for crisp ticks, two decimals for the fractional
 *  warning case. */
function deviceScaleSummary(zoomLabel: string, dpr: number, product: number, pxFormat: 'integer' | 'fraction'): string {
  const px = pxFormat === 'integer' ? Math.round(product) : product.toFixed(2)
  return `${zoomLabel} × DPR ${dpr.toFixed(2)} = ${px} device px / source px`
}

export function ZoomControl({ zoom, onSetZoom, onFit, dpr = 1 }: ZoomControlProps) {
  // Local input state lets the user type values like "1.2" without
  // each keystroke being clamped/parsed mid-edit. Sync from prop on
  // external zoom changes (slider drag, Fit, Ctrl+wheel).
  const [textValue, setTextValue] = useState(() => zoom.toFixed(2))
  useEffect(() => {
    setTextValue(zoom.toFixed(2))
  }, [zoom])

  const commitText = (raw: string) => {
    const parsed = parseFloat(raw)
    if (Number.isFinite(parsed)) {
      onSetZoom(clampZoom(parsed))
    } else {
      // Restore the displayed value when the input was junk.
      setTextValue(zoom.toFixed(2))
    }
  }

  const crisp = isCrisp(zoom, dpr)
  const nextCrisp = crisp ? null : nextCrispZoom(zoom, dpr)
  const zoomLabel = formatZoomLabel(zoom)
  const product = zoom * dpr

  return (
    <div className={styles.modeGroup} data-testid="zoom-control">
      <span className={styles.modeLabel}>Zoom</span>
      <input
        type="range"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.05}
        value={zoom}
        onChange={e => onSetZoom(parseFloat(e.target.value))}
        className={styles.zoomSlider}
        data-testid="zoom-slider"
        aria-label="Canvas zoom"
        title={`Canvas zoom: ${zoomLabel}`}
      />
      <span className={styles.zoomLabel} data-testid="zoom-label">
        {zoomLabel}
      </span>
      {crisp ? (
        <span
          className={styles.zoomCrispOk}
          data-testid="zoom-crisp-ok"
          title={`Pixel-crisp: ${deviceScaleSummary(zoomLabel, dpr, product, 'integer')}`}
          aria-label="Pixel-crisp at this zoom"
        >
          ✓
        </span>
      ) : (
        <button
          type="button"
          className={styles.zoomCrispWarn}
          onClick={() => { if (nextCrisp !== null) onSetZoom(nextCrisp) }}
          disabled={nextCrisp === null}
          data-testid="zoom-crisp-snap"
          title={`${deviceScaleSummary(zoomLabel, dpr, product, 'fraction')} (uneven). ${
            nextCrisp !== null
              ? `Click to snap to ${formatZoomLabel(nextCrisp)}.`
              : 'No crisp value available below max zoom.'
          }`}
          aria-label="Snap to next pixel-crisp zoom"
        >
          ⚠
        </button>
      )}
      <input
        type="number"
        min={MIN_ZOOM}
        max={MAX_ZOOM}
        step={0.1}
        value={textValue}
        onChange={e => setTextValue(e.target.value)}
        onBlur={e => commitText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            commitText(e.currentTarget.value)
            e.currentTarget.blur()
          }
        }}
        className={styles.zoomNumber}
        data-testid="zoom-number"
        aria-label="Canvas zoom (numeric)"
      />
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onFit}
        title="Fit canvas to viewport (largest integer multiple ≤ available area)"
        data-testid="zoom-fit"
      >
        Fit
      </button>
    </div>
  )
}
