import { useEffect, useState } from 'react'
import { MAX_ZOOM, MIN_ZOOM, clampZoom } from './useViewport'
import styles from './AnsiGraphicsEditor.module.css'

export interface ZoomControlProps {
  zoom: number
  onSetZoom: (z: number) => void
  onFit: () => void
}

function formatZoomLabel(z: number): string {
  // Integers render as "1x"; non-integers render with one decimal ("2.5x").
  if (Math.abs(z - Math.round(z)) < 0.005) return `${Math.round(z)}x`
  return `${z.toFixed(1)}x`
}

export function ZoomControl({ zoom, onSetZoom, onFit }: ZoomControlProps) {
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
        title={`Canvas zoom: ${formatZoomLabel(zoom)}`}
      />
      <span className={styles.zoomLabel} data-testid="zoom-label">
        {formatZoomLabel(zoom)}
      </span>
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
