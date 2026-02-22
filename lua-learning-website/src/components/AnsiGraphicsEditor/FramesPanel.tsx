import { useRef } from 'react'
import styles from './AnsiGraphicsEditor.module.css'

export interface FramesPanelProps {
  frameCount: number
  currentFrame: number
  frameDuration: number
  isPlaying: boolean
  onSelectFrame: (index: number) => void
  onAddFrame: () => void
  onDuplicateFrame: () => void
  onRemoveFrame: () => void
  onSetDuration: (ms: number) => void
  onTogglePlayback: () => void
}

export function FramesPanel({
  frameCount, currentFrame, frameDuration, isPlaying,
  onSelectFrame, onAddFrame, onDuplicateFrame, onRemoveFrame, onSetDuration, onTogglePlayback,
}: FramesPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const commitDuration = () => {
    const val = inputRef.current?.value ?? ''
    const parsed = parseInt(val, 10)
    if (!isNaN(parsed) && parsed > 0) {
      onSetDuration(parsed)
    }
  }

  return (
    <div className={styles.framesPanel} data-testid="frames-panel">
      <div className={styles.framesPanelHeader}>
        <button
          type="button"
          onClick={onTogglePlayback}
          data-testid="playback-toggle"
          title={isPlaying ? 'Stop' : 'Play'}
        >
          {isPlaying ? '\u25A0' : '\u25B6'}
        </button>
        <span data-testid="frame-counter">
          Frame {currentFrame + 1} / {frameCount}
        </span>
        <label>
          Duration:
          <input
            ref={inputRef}
            type="number"
            className={styles.frameDurationInput}
            defaultValue={frameDuration}
            key={frameDuration}
            min={16}
            max={10000}
            onBlur={commitDuration}
            onKeyDown={e => { if (e.key === 'Enter') commitDuration() }}
            disabled={isPlaying}
            data-testid="frame-duration-input"
          />
          ms
        </label>
        <button type="button" onClick={onAddFrame} disabled={isPlaying} data-testid="add-frame" title="Add Frame">
          + Add
        </button>
        <button type="button" onClick={onDuplicateFrame} disabled={isPlaying} data-testid="duplicate-frame" title="Duplicate Frame">
          Dup
        </button>
        <button
          type="button"
          onClick={onRemoveFrame}
          disabled={isPlaying || frameCount <= 1}
          data-testid="remove-frame"
          title="Remove Frame"
        >
          - Del
        </button>
      </div>
      <div className={styles.framesStrip} data-testid="frames-strip">
        {Array.from({ length: frameCount }, (_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.frameCell} ${i === currentFrame ? styles.frameCellActive : ''}`}
            onClick={() => onSelectFrame(i)}
            disabled={isPlaying}
            data-testid={`frame-cell-${i}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  )
}
