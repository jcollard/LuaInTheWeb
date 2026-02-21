/* eslint-disable max-lines */
import { useRef, useState } from 'react'
import type { BrushMode, DrawTool, BrushSettings, BorderStyle, TextAlign } from './types'
import { BORDER_PRESETS, borderStyleEqual } from './types'
import { CharPaletteModal } from './CharPaletteModal'
import { FileOptionsModal } from './FileOptionsModal'
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
  onSetBorderStyle?: (style: BorderStyle) => void
  cgaPreview?: boolean
  onToggleCgaPreview?: () => void
  activeLayerIsGroup?: boolean
  isPlaying?: boolean
}

export function AnsiEditorToolbar({
  brush, onSetChar, onSetMode, onSetTool, onClear, onSave, onSaveAs,
  onImportPng, onExportAns, onExportSh, onUndo, onRedo, canUndo, canRedo, textAlign, onSetTextAlign,
  onFlipHorizontal, onFlipVertical, onSetBorderStyle, cgaPreview, onToggleCgaPreview, activeLayerIsGroup, isPlaying,
}: AnsiEditorToolbarProps) {
  const toolsDisabled = activeLayerIsGroup || isPlaying
  const isRectActive = brush.tool === 'rect-outline' || brush.tool === 'rect-filled'
  const isOvalActive = brush.tool === 'oval-outline' || brush.tool === 'oval-filled'
  const isBorderActive = brush.tool === 'border'
  const [charPaletteOpen, setCharPaletteOpen] = useState(false)
  const [fileOptionsOpen, setFileOptionsOpen] = useState(false)
  const charButtonRef = useRef<HTMLButtonElement>(null)

  return (
    <div className={styles.toolbar} data-testid="ansi-editor-toolbar">
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={() => setFileOptionsOpen(true)}
        title="File options"
        data-testid="file-options-button"
      >
        File
      </button>
      {fileOptionsOpen && (
        <FileOptionsModal
          isOpen={fileOptionsOpen}
          onClose={() => setFileOptionsOpen(false)}
          onClear={onClear}
          onSave={onSave}
          onSaveAs={onSaveAs}
          onImportPng={onImportPng}
          onExportAns={onExportAns}
          onExportSh={onExportSh}
          cgaPreview={cgaPreview ?? false}
          onToggleCgaPreview={onToggleCgaPreview!}
        />
      )}
      <div className={styles.modeGroup}>
        <span className={styles.modeLabel}>Tool</span>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'pencil' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'pencil'}
          onClick={() => onSetTool('pencil')}
          title="Pencil"
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
          title="Line"
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
            title="Rectangle"
            data-testid="tool-rect"
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
            title="Oval"
            data-testid="tool-oval"
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
              title="Border"
              data-testid="tool-border"
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
          title="Flood Fill"
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
          title="Select"
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
          title="Eyedropper"
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
          title="Text"
          data-testid="tool-text"
          disabled={toolsDisabled}
        >
          T
        </button>
        <button
          type="button"
          className={`${styles.modeButton} ${brush.tool === 'move' ? styles.modeButtonActive : ''}`}
          aria-pressed={brush.tool === 'move'}
          onClick={() => onSetTool('move')}
          title="Move"
          data-testid="tool-move"
        >
          ✥
        </button>
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
            title="Pixel"
            data-testid="mode-pixel"
            disabled={isBorderActive}
          >
            ▀
          </button>
          <button
            type="button"
            className={`${styles.modeButton} ${brush.mode === 'eraser' ? styles.modeButtonActive : ''}`}
            aria-pressed={brush.mode === 'eraser'}
            onClick={() => onSetMode('eraser')}
            title="Eraser"
            data-testid="mode-eraser"
            disabled={isBorderActive}
          >
            ⌫
          </button>
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
              title="Flip Horizontal"
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
              title="Flip Vertical"
              data-testid="flip-vertical"
            >
              ↕
            </button>
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
        title="Undo"
        data-testid="undo-button"
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.toolbarButton}
        onClick={onRedo}
        disabled={!canRedo}
        title="Redo"
        data-testid="redo-button"
      >
        ↷
      </button>
    </div>
  )
}
