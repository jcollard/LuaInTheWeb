import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

/**
 * Information provided when the editor is ready
 */
export interface EditorReadyInfo {
  /** The Monaco instance */
  monaco: Monaco
  /** The editor instance */
  editor: editor.IStandaloneCodeEditor
  /** The text model */
  model: editor.ITextModel
}

/**
 * Props for the CodeEditor component
 */
export interface CodeEditorProps {
  /** The current code value */
  value: string
  /** Called when the code changes */
  onChange: (value: string) => void
  /** The programming language (default: 'lua') */
  language?: string
  /** The height of the editor (default: '400px') */
  height?: string
  /** Whether the editor is read-only */
  readOnly?: boolean
  /** Called when format keyboard shortcut is pressed (Shift+Alt+F) */
  onFormat?: () => void
  /** Called when the editor is ready with monaco, editor, and model references */
  onEditorReady?: (info: EditorReadyInfo) => void
  /** Whether auto-save is currently enabled (for command palette label) */
  autoSaveEnabled?: boolean
  /** Called when auto-save is toggled via command palette */
  onToggleAutoSave?: () => void
  /** Called when "Save All Files" command is invoked */
  onSaveAllFiles?: () => void
}
