import { useRef, useState } from 'react'
import type { BrushMode, DrawTool, BrushSettings, BorderStyle, TextAlign, ScaleMode } from './types'
import { BORDER_PRESETS, DEFAULT_BLEND_RATIO, borderStyleEqual } from './types'
import { CharPaletteModal } from './CharPaletteModal'
import { FileOptionsModal } from './FileOptionsModal'
import { toolTooltip, tooltipWithShortcut, MODE_SHORTCUTS, ACTION_SHORTCUTS } from './keyboardShortcuts'
import styles from './AnsiGraphicsEditor.module.css'

export interface AnsiEditorToolbarProps {
  brush: BrushSettings
  onSetChar: (char: string) => void
  onSetMode: (mode: BrushMode) => void
  onSetTool: (tool: DrawTool) => void
  onClear: () => void
  onSave: () => void
  onSaveAs: () => void
  onImportPng: () => void
  onExportAns: () => void
  onExportSh: () => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
  textAlign?: TextAlign
  onSetTextAlign?: (align: TextAlign) => void
  onFlipHorizontal?: () => void
  onFlipVertical?: () => void
  onFlipLayerHorizontal?: () => void
  onFlipLayerVertical?: () => void
  flipOrigin?: { row: number; col: number }
  onSetBorderStyle?: (style: BorderStyle) => void
  onSetBlendRatio?: (ratio: number) => void
  cgaPreview?: boolean
  onToggleCgaPreview?: () => void
  scaleMode?: ScaleMode
  onSetScaleMode?: (mode: ScaleMode) => void
  activeLayerIsGroup?: boolean
  isPlaying?: boolean
  fileMenuOpen?: boolean
  onSetFileMenuOpen?: (open: boolean) => void
}

export function AnsiEditorToolbar({
  brush, onSetChar, onSetMode, onSetTool, onClear, onSave, onSaveAs,
  onImportPng, onExportAns, onExportSh, onUndo, onRedo, canUndo, canRedo, textAlign, onSetTextAlign,
  onFlipHorizontal, onFlipVertical, onFlipLayerHorizontal, onFlipLayerVertical, flipOrigin, onSetBorderStyle, onSetBlendRatio, cgaPreview, onToggleCgaPreview, scaleMode, onSetScaleMode, activeLayerIsGroup, isPlaying,
  fileMenuOpen: controlledFileMenuOpen, onSetFileMenuOpen,
}: AnsiEditorToolbarProps) {
  const toolsDisabled = activeLayerIsGroup || isPlaying
  const isRectActive = brush.tool === 'rect-outline' || brush.tool === 'rect-filled'
  const isOvalActive = brush.tool === 'oval-outline' || brush.tool === 'oval-filled'
  const isMoveOrFlipActive = brush.tool === 'move' || brush.tool === 'flip'
  const isBorderActive = brush.tool === 'border'
  const blendPercent = Math.round((brush.blendRatio ?? DEFAULT_BLEND_RATIO) * 100)
  const [charPaletteOpen, setCharPaletteOpen] = useState(false)
  const [internalFileMenuOpen, setInternalFileMenuOpen] = useState(false)
  const fileOptionsOpen = controlledFileMenuOpen ?? internalFileMenuOpen
  const setFileOptionsOpen = onSetFileMenuOpen ?? setInternalFileMenuOpen
  const charButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className={styles.toolbar} data-testid="ansi-editor-toolbar">
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={() => setFileOptionsOpen(true)}
        title={tooltipWithShortcut('File', ACTION_SHORTCUTS.fileMenu)}
        data-testid="file-options-button"
      >
        File
      </button>
      {fileOptionsOpen && (
        <FileOptionsModal
          onClose={() => setFileOptionsOpen(false)}
          onClear={onClear}
          onSave={onSave}
          onSaveAs={onSaveAs}
          onImportPng={onImportPng}
          onExportAns={onExportAns}
          onExportSh={onExportSh}
          cgaPreview={cgaPreview ?? false}
          onToggleCgaPreview={onToggleCgaPreview!}
          scaleMode={scaleMode ?? 'integer-auto'}
          onSetScaleMode={onSetScaleMode!}
        />
      )}
      <div className={styles.modeGroup}>
        <span className={styles.modeLabel}>Tool</span>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'pencil' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'pencil'}
          onClick={() => onSetTool('pencil')}
          title={toolTooltip('pencil')}
          data-testid="tool-pencil"
          disabled={toolsDisabled}
        >
          ✏
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'line' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'line'}
          onClick={() => onSetTool('line')}
          title={toolTooltip('line')}
          data-testid="tool-line"
          disabled={toolsDisabled}
        >
          ╱
        </button>
        <div className={styles.toolFlyoutWrapper}>
          <button
            type="button"
            className={`${styles.modeButton} ${isRectActive ? styles.modeButtonActive : ''}`}
            aria-pressed={isRectActive}
            onClick={() => onSetTool('rect-outline')}
            title={toolTooltip('rect-outline')}
            data-testid="tool-rect"
            disabled={toolsDisabled}
          >
            {brush.tool === 'rect-filled' ? '■' : '▭'}
          </button>
          <div className={styles.toolFlyout} data-testid="rect-flyout">
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'rect-outline' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('rect-outline')}
              data-testid="tool-rect-outline"
            >
              ▭ Outline
            </button>
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'rect-filled' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('rect-filled')}
              data-testid="tool-rect-filled"
            >
              ■ Filled
            </button>
          </div>
        </div>
        <div className={styles.toolFlyoutWrapper}>
          <button
            type="button"
            className={`${styles.modeButton} ${isOvalActive ? styles.modeButtonActive : ''}`}
            aria-pressed={isOvalActive}
            onClick={() => onSetTool('oval-outline')}
            title={toolTooltip('oval-outline')}
            data-testid="tool-oval"
            disabled={toolsDisabled}
          >
            {brush.tool === 'oval-filled' ? '●' : '○'}
          </button>
          <div className={styles.toolFlyout} data-testid="oval-flyout">
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'oval-outline' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('oval-outline')}
              data-testid="tool-oval-outline"
            >
              ○ Outline
            </button>
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'oval-filled' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('oval-filled')}
              data-testid="tool-oval-filled"
            >
              ● Filled
            </button>
          </div>
        </div>
        {onSetBorderStyle && (
          <div className={styles.toolFlyoutWrapper}>
            <button
              type="button"
              className={`${styles.modeButton} ${isBorderActive ? styles.modeButtonActive : ''}`}
              aria-pressed={isBorderActive}
              onClick={() => onSetTool('border')}
              title={toolTooltip('border')}
              data-testid="tool-border"
              disabled={toolsDisabled}
            >
              ╔
            </button>
            <div className={styles.toolFlyout} data-testid="border-flyout">
              {BORDER_PRESETS.map(preset => {
                const isActive = isBorderActive && !!brush.borderStyle
                  && borderStyleEqual(brush.borderStyle, preset.style)
                return (
                  <button
                    key={preset.name}
                    type="button"
                    className={`${styles.flyoutOption} ${isActive ? styles.flyoutOptionActive : ''}`}
                    aria-pressed={isActive}
                    onClick={() => { onSetBorderStyle(preset.style); onSetTool('border') }}
                    data-testid={`border-preset-${preset.name}`}
                  >
                    {`${preset.style.tl}${preset.style.t}${preset.style.tr} ${preset.name}`}
                  </button>
                )
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'flood-fill' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'flood-fill'}
          onClick={() => onSetTool('flood-fill')}
          title={toolTooltip('flood-fill')}
          data-testid="tool-flood-fill"
          disabled={toolsDisabled}
        >
          Fill
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'select' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'select'}
          onClick={() => onSetTool('select')}
          title={toolTooltip('select')}
          data-testid="tool-select"
          disabled={toolsDisabled}
        >
          ⬚
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'eyedropper' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'eyedropper'}
          onClick={() => onSetTool('eyedropper')}
          title={toolTooltip('eyedropper')}
          data-testid="tool-eyedropper"
          disabled={toolsDisabled}
        >
          ⚗
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'text' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'text'}
          onClick={() => onSetTool('text')}
          title={toolTooltip('text')}
          data-testid="tool-text"
          disabled={toolsDisabled}
        >
          T
        </button>
        <div className={styles.toolFlyoutWrapper}>
          <button
            type="button"
            className={`${styles.modeButton} ${isMoveOrFlipActive ? styles.modeButtonActive : ''}`}
            aria-pressed={isMoveOrFlipActive}
            onClick={() => onSetTool(brush.tool === 'flip' ? 'flip' : 'move')}
            title={toolTooltip('move')}
            data-testid="tool-move"
          >
            {brush.tool === 'flip' ? '⇔' : '✥'}
          </button>
          <div className={styles.toolFlyout} data-testid="move-flyout">
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'move' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('move')}
              data-testid="tool-move-option"
            >
              ✥ Move
            </button>
            <button
              type="button"
              className={`${styles.flyoutOption} ${brush.tool === 'flip' ? styles.flyoutOptionActive : ''}`}
              onClick={() => onSetTool('flip')}
              data-testid="tool-flip-option"
            >
              ⇔ Flip
            </button>
          </div>
        </div>
      </div>
      {!activeLayerIsGroup && (
        <div className={styles.modeGroup}>
          <span className={styles.modeLabel}>Mode</span>
          <button
            type="button"
            className={`${styles.modeButton} ${brush.mode === 'brush' ? styles.modeButtonActive : ''}`}
            aria-pressed={brush.mode === 'brush'}
            onClick={() => onSetMode('brush')}
            title="Brush"
            data-testid="mode-brush"
          >
            #
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${brush.mode === 'pixel' ? styles.modeButtonActive : ''}`}
            aria-pressed={brush.mode === 'pixel'}
            onClick={() => onSetMode('pixel')}
            title={tooltipWithShortcut('Pixel', MODE_SHORTCUTS['pixel'])}
            data-testid="mode-pixel"
            disabled={isBorderActive}
          >
            ▀
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${brush.mode === 'blend-pixel' ? styles.modeButtonActive : ''}`}
            aria-pressed={brush.mode === 'blend-pixel'}
            onClick={() => onSetMode('blend-pixel')}
            title={tooltipWithShortcut('Blend Pixel', MODE_SHORTCUTS['blend-pixel'])}
            data-testid="mode-blend-pixel"
            disabled={isBorderActive}
          >
            ░
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${brush.mode === 'eraser' ? styles.modeButtonActive : ''}`}
            aria-pressed={brush.mode === 'eraser'}
            onClick={() => onSetMode('eraser')}
            title={tooltipWithShortcut('Eraser', MODE_SHORTCUTS['eraser'])}
            data-testid="mode-eraser"
            disabled={isBorderActive}
          >
            ⌫
          </button>
        </div>
      )}
      {brush.mode === 'blend-pixel' && !activeLayerIsGroup && (
        <div className={styles.blendRatioGroup}>
          <span className={styles.modeLabel}>Blend</span>
          <input
            type="range"
            min={0} max={100} step={1}
            value={blendPercent}
            onChange={e => onSetBlendRatio?.(Number(e.target.value) / 100)}
            data-testid="blend-ratio-slider"
          />
          <span data-testid="blend-ratio-value">{blendPercent}%</span>
        </div>
      )}
      {brush.tool === 'text' && onSetTextAlign && (
        <div className={styles.modeGroup}>
          <span className={styles.modeLabel}>Align</span>
          <button
            type="button"
            className={`${styles.modeButton} ${(textAlign ?? 'left') === 'left' ? styles.modeButtonActive : ''}`}
            aria-pressed={(textAlign ?? 'left') === 'left'}
            onClick={() => onSetTextAlign('left')}
            title="Align Left"
            data-testid="align-left"
          >
            {'≡L'}
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${textAlign === 'center' ? styles.modeButtonActive : ''}`}
            aria-pressed={textAlign === 'center'}
            onClick={() => onSetTextAlign('center')}
            title="Align Center"
            data-testid="align-center"
          >
            {'≡C'}
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${textAlign === 'right' ? styles.modeButtonActive : ''}`}
            aria-pressed={textAlign === 'right'}
            onClick={() => onSetTextAlign('right')}
            title="Align Right"
            data-testid="align-right"
          >
            {'≡R'}
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${textAlign === 'justify' ? styles.modeButtonActive : ''}`}
            aria-pressed={textAlign === 'justify'}
            onClick={() => onSetTextAlign('justify')}
            title="Justify"
            data-testid="align-justify"
          >
            {'≡J'}
          </button>
        </div>
      )}
      {brush.tool === 'select' && (onFlipHorizontal || onFlipVertical) && (
        <div className={styles.modeGroup}>
          <span className={styles.modeLabel}>Flip</span>
          {onFlipHorizontal && (
            <button
              type="button"
              className={styles.modeButton}
              onClick={onFlipHorizontal}
              title={tooltipWithShortcut('Flip Horizontal', ACTION_SHORTCUTS.flipH)}
              data-testid="flip-horizontal"
            >
              ↔
            </button>
          )}
          {onFlipVertical && (
            <button
              type="button"
              className={styles.modeButton}
              onClick={onFlipVertical}
              title={tooltipWithShortcut('Flip Vertical', ACTION_SHORTCUTS.flipV)}
              data-testid="flip-vertical"
            >
              ↕
            </button>
          )}
        </div>
      )}
      {brush.tool === 'flip' && (
        <div className={styles.modeGroup}>
          <span className={styles.modeLabel}>Flip</span>
          <button
            type="button"
            className={styles.modeButton}
            onClick={onFlipLayerHorizontal}
            title={tooltipWithShortcut('Flip Layer Horizontal', ACTION_SHORTCUTS.flipH)}
            data-testid="flip-layer-horizontal"
          >
            ↔
          </button>
          <button
            type="button"
            className={styles.modeButton}
            onClick={onFlipLayerVertical}
            title={tooltipWithShortcut('Flip Layer Vertical', ACTION_SHORTCUTS.flipV)}
            data-testid="flip-layer-vertical"
          >
            ↕
          </button>
          {flipOrigin && (
            <span className={styles.modeLabel} data-testid="flip-origin-display">
              Origin: ({flipOrigin.col}, {flipOrigin.row})
            </span>
          )}
        </div>
      )}
      {brush.mode === 'brush' && !activeLayerIsGroup && (
        <div className={styles.charGroup}>
          <span className={styles.charLabel}>Char</span>
          <button
            ref={charButtonRef}
            type="button"
            className={styles.charButton}
            onClick={() => setCharPaletteOpen(true)}
            data-testid="char-button"
          >
            {brush.char}
          </button>
          {charPaletteOpen && (
            <CharPaletteModal
              anchorRect={charButtonRef.current?.getBoundingClientRect()}
              onSelect={onSetChar}
              onClose={() => setCharPaletteOpen(false)}
            />
          )}
        </div>
      )}
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onUndo}
        disabled={!canUndo}
        title={tooltipWithShortcut('Undo', ACTION_SHORTCUTS.undo)}
        data-testid="undo-button"
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onRedo}
        disabled={!canRedo}
        title={tooltipWithShortcut('Redo', ACTION_SHORTCUTS.redo)}
        data-testid="redo-button"
      >
        ↷
      </button>
    </div>
  )
}
