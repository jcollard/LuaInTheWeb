import { AnsiTerminalPanel } from '../AnsiTerminalPanel/AnsiTerminalPanel'
import { AnsiEditorToolbar } from './AnsiEditorToolbar'
import { useAnsiEditor } from './useAnsiEditor'
import styles from './AnsiGraphicsEditor.module.css'

export function AnsiGraphicsEditor() {
  const {
    brush,
    setBrushFg,
    setBrushBg,
    setBrushChar,
    clearGrid,
    onTerminalReady,
    cursorRef,
  } = useAnsiEditor()

  return (
    <div className={styles.editor} data-testid="ansi-graphics-editor">
      <AnsiEditorToolbar
        brush={brush}
        onSetFg={setBrushFg}
        onSetBg={setBrushBg}
        onSetChar={setBrushChar}
        onClear={clearGrid}
      />
      <div className={styles.canvas}>
        <AnsiTerminalPanel
          isActive={true}
          onTerminalReady={onTerminalReady}
        />
      </div>
      {/* Cell cursor overlay — positioned imperatively by useAnsiEditor via fixed coordinates */}
      <div ref={cursorRef} className={styles.cellCursor} />
    </div>
  )
}
