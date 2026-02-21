import { describe, it, expect } from 'vitest'
import type { DrawTool } from './types'
import {
  TOOL_SHORTCUTS,
  TOOL_KEY_MAP,
  TOOL_SHIFT_KEY_MAP,
  MODE_SHORTCUTS,
  MODE_KEY_MAP,
  ACTION_SHORTCUTS,
  tooltipWithShortcut,
  toolTooltip,
} from './keyboardShortcuts'

describe('keyboardShortcuts', () => {
  describe('TOOL_SHORTCUTS', () => {
    it('has an entry for every DrawTool', () => {
      const allTools: DrawTool[] = [
        'pencil', 'line', 'rect-outline', 'rect-filled',
        'oval-outline', 'oval-filled', 'border', 'flood-fill',
        'select', 'eyedropper', 'text', 'move',
      ]
      for (const tool of allTools) {
        expect(TOOL_SHORTCUTS[tool], `missing shortcut for ${tool}`).toBeDefined()
      }
    })

    it('has no duplicate key+shift combos among non-shifted entries', () => {
      const seen = new Map<string, string>()
      for (const [tool, def] of Object.entries(TOOL_SHORTCUTS)) {
        if (def.shift) continue
        const combo = def.key
        expect(seen.has(combo), `duplicate key "${combo}" for "${tool}" and "${seen.get(combo)}"`).toBe(false)
        seen.set(combo, tool)
      }
    })

    it('has no duplicate key+shift combos among shifted entries', () => {
      const seen = new Map<string, string>()
      for (const [tool, def] of Object.entries(TOOL_SHORTCUTS)) {
        if (!def.shift) continue
        const combo = `shift+${def.key}`
        expect(seen.has(combo), `duplicate shifted key "${combo}" for "${tool}" and "${seen.get(combo)}"`).toBe(false)
        seen.set(combo, tool)
      }
    })
  })

  describe('TOOL_KEY_MAP', () => {
    it('maps "b" to pencil', () => {
      expect(TOOL_KEY_MAP['b']).toBe('pencil')
    })

    it('maps "g" to flood-fill', () => {
      expect(TOOL_KEY_MAP['g']).toBe('flood-fill')
    })

    it('does not include shifted tools', () => {
      expect(TOOL_KEY_MAP['u']).toBe('rect-outline')
    })
  })

  describe('TOOL_SHIFT_KEY_MAP', () => {
    it('maps "u" to rect-filled', () => {
      expect(TOOL_SHIFT_KEY_MAP['u']).toBe('rect-filled')
    })

    it('maps "o" to oval-filled', () => {
      expect(TOOL_SHIFT_KEY_MAP['o']).toBe('oval-filled')
    })
  })

  describe('MODE_SHORTCUTS', () => {
    it('defines eraser with key "e"', () => {
      expect(MODE_SHORTCUTS['eraser']?.key).toBe('e')
    })

    it('defines pixel with key "n"', () => {
      expect(MODE_SHORTCUTS['pixel']?.key).toBe('n')
    })

    it('defines blend-pixel with key "j"', () => {
      expect(MODE_SHORTCUTS['blend-pixel']?.key).toBe('j')
    })
  })

  describe('MODE_KEY_MAP', () => {
    it('maps "e" to eraser', () => {
      expect(MODE_KEY_MAP['e']).toBe('eraser')
    })

    it('maps "n" to pixel', () => {
      expect(MODE_KEY_MAP['n']).toBe('pixel')
    })

    it('maps "j" to blend-pixel', () => {
      expect(MODE_KEY_MAP['j']).toBe('blend-pixel')
    })
  })

  describe('ACTION_SHORTCUTS', () => {
    it('defines undo as Ctrl+Z', () => {
      expect(ACTION_SHORTCUTS.undo.key).toBe('z')
      expect(ACTION_SHORTCUTS.undo.ctrl).toBe(true)
      expect('shift' in ACTION_SHORTCUTS.undo).toBe(false)
    })

    it('defines redo as Ctrl+Shift+Z', () => {
      expect(ACTION_SHORTCUTS.redo.key).toBe('z')
      expect(ACTION_SHORTCUTS.redo.ctrl).toBe(true)
      expect(ACTION_SHORTCUTS.redo.shift).toBe(true)
    })

    it('defines save as Ctrl+S', () => {
      expect(ACTION_SHORTCUTS.save.ctrl).toBe(true)
    })
  })

  describe('tooltipWithShortcut', () => {
    it('formats name with shortcut label', () => {
      expect(tooltipWithShortcut('Pencil', { key: 'b', label: 'B', description: 'Pencil' })).toBe('Pencil (B)')
    })

    it('returns name alone when no shortcut provided', () => {
      expect(tooltipWithShortcut('Brush')).toBe('Brush')
    })

    it('formats Ctrl shortcuts', () => {
      expect(tooltipWithShortcut('Undo', ACTION_SHORTCUTS.undo)).toBe('Undo (Ctrl+Z)')
    })
  })

  describe('toolTooltip', () => {
    it('returns "Pencil (B)" for pencil', () => {
      expect(toolTooltip('pencil')).toBe('Pencil (B)')
    })

    it('returns "Line (L)" for line', () => {
      expect(toolTooltip('line')).toBe('Line (L)')
    })

    it('returns "Rectangle (U)" for rect-outline', () => {
      expect(toolTooltip('rect-outline')).toBe('Rectangle (U)')
    })

    it('returns "Rectangle (U)" for rect-filled (shows parent key)', () => {
      expect(toolTooltip('rect-filled')).toBe('Rectangle (U)')
    })

    it('returns "Oval (O)" for oval-outline', () => {
      expect(toolTooltip('oval-outline')).toBe('Oval (O)')
    })

    it('returns "Oval (O)" for oval-filled (shows parent key)', () => {
      expect(toolTooltip('oval-filled')).toBe('Oval (O)')
    })

    it('returns "Flood Fill (G)" for flood-fill', () => {
      expect(toolTooltip('flood-fill')).toBe('Flood Fill (G)')
    })

    it('returns "Select (M)" for select', () => {
      expect(toolTooltip('select')).toBe('Select (M)')
    })

    it('returns "Eyedropper (I)" for eyedropper', () => {
      expect(toolTooltip('eyedropper')).toBe('Eyedropper (I)')
    })

    it('returns "Text (T)" for text', () => {
      expect(toolTooltip('text')).toBe('Text (T)')
    })

    it('returns "Move / Flip (V)" for move', () => {
      expect(toolTooltip('move')).toBe('Move / Flip (V)')
    })

    it('returns "Move / Flip (V)" for flip', () => {
      expect(toolTooltip('flip')).toBe('Move / Flip (V)')
    })

    it('returns "Border (K)" for border', () => {
      expect(toolTooltip('border')).toBe('Border (K)')
    })
  })
})
