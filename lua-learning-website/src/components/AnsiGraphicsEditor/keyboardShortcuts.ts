import type { DrawTool, BrushMode } from './types'

export interface ShortcutDef {
  key: string
  ctrl?: boolean
  shift?: boolean
  label: string
  description: string
}

export const TOOL_SHORTCUTS: Record<DrawTool, ShortcutDef> = {
  'pencil':       { key: 'b', label: 'B',       description: 'Pencil' },
  'line':         { key: 'l', label: 'L',       description: 'Line' },
  'rect-outline': { key: 'u', label: 'U',       description: 'Rectangle' },
  'rect-filled':  { key: 'u', shift: true, label: 'Shift+U', description: 'Rectangle Filled' },
  'oval-outline': { key: 'o', label: 'O',       description: 'Oval' },
  'oval-filled':  { key: 'o', shift: true, label: 'Shift+O', description: 'Oval Filled' },
  'border':       { key: 'k', label: 'K',       description: 'Border' },
  'flood-fill':   { key: 'g', label: 'G',       description: 'Flood Fill' },
  'select':       { key: 'm', label: 'M',       description: 'Select' },
  'eyedropper':   { key: 'i', label: 'I',       description: 'Eyedropper' },
  'text':         { key: 't', label: 'T',       description: 'Text' },
  'move':         { key: 'v', label: 'V',       description: 'Move' },
}

export const MODE_SHORTCUTS: Partial<Record<BrushMode, ShortcutDef>> = {
  'eraser':      { key: 'e', label: 'E', description: 'Eraser' },
  'pixel':       { key: 'n', label: 'N', description: 'Pixel' },
  'blend-pixel': { key: 'j', label: 'J', description: 'Blend Pixel' },
}

export const ACTION_SHORTCUTS = {
  undo:      { key: 'z', ctrl: true, label: 'Ctrl+Z',       description: 'Undo' },
  redo:      { key: 'z', ctrl: true, shift: true, label: 'Ctrl+Shift+Z', description: 'Redo' },
  save:      { key: 's', ctrl: true, label: 'Ctrl+S',       description: 'Save' },
  saveAs:    { key: 's', ctrl: true, shift: true, label: 'Ctrl+Shift+S', description: 'Save As' },
  fileMenu:  { key: 'f', label: 'F', description: 'File' },
  flipH:     { key: 'h', shift: true, label: 'Shift+H', description: 'Flip Horizontal' },
  flipV:     { key: 'v', shift: true, label: 'Shift+V', description: 'Flip Vertical' },
  play:      { key: ' ', label: 'Space', description: 'Play/Pause' },
  prevFrame: { key: '[', label: '[', description: 'Previous Frame' },
  nextFrame: { key: ']', label: ']', description: 'Next Frame' },
} as const satisfies Record<string, ShortcutDef>

/** Build a key → DrawTool lookup from TOOL_SHORTCUTS, filtered by shift state. */
function buildToolKeyMap(shifted: boolean): Record<string, DrawTool> {
  const map: Record<string, DrawTool> = {}
  for (const [tool, def] of Object.entries(TOOL_SHORTCUTS)) {
    if (Boolean(def.shift) === shifted) {
      map[def.key] = tool as DrawTool
    }
  }
  return map
}

/** Lowercase key → DrawTool (non-shift variants only). */
export const TOOL_KEY_MAP: Record<string, DrawTool> = buildToolKeyMap(false)

/** Shift+key → DrawTool for shifted tool shortcuts. */
export const TOOL_SHIFT_KEY_MAP: Record<string, DrawTool> = buildToolKeyMap(true)

/** Lowercase key → BrushMode for single-key mode shortcuts. */
export const MODE_KEY_MAP: Record<string, BrushMode> = {}
for (const [mode, def] of Object.entries(MODE_SHORTCUTS)) {
  if (def) MODE_KEY_MAP[def.key] = mode as BrushMode
}

export function tooltipWithShortcut(name: string, shortcut?: ShortcutDef): string {
  return shortcut ? `${name} (${shortcut.label})` : name
}

export function toolTooltip(tool: DrawTool): string {
  if (tool === 'rect-outline' || tool === 'rect-filled') {
    return tooltipWithShortcut('Rectangle', TOOL_SHORTCUTS['rect-outline'])
  }
  if (tool === 'oval-outline' || tool === 'oval-filled') {
    return tooltipWithShortcut('Oval', TOOL_SHORTCUTS['oval-outline'])
  }
  const def = TOOL_SHORTCUTS[tool]
  return tooltipWithShortcut(def.description, def)
}
