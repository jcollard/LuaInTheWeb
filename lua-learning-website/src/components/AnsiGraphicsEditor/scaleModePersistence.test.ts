/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStoredScaleMode,
  saveStoredScaleMode,
  DEFAULT_ANSI_SCALE_MODE,
  loadStoredDprCompensate,
  saveStoredDprCompensate,
  DEFAULT_DPR_COMPENSATE,
} from './scaleModePersistence'

beforeEach(() => {
  localStorage.clear()
})

describe('scaleModePersistence', () => {
  it('DEFAULT_ANSI_SCALE_MODE is integer-auto', () => {
    expect(DEFAULT_ANSI_SCALE_MODE).toBe('integer-auto')
  })

  it('returns default when storage is empty', () => {
    expect(loadStoredScaleMode()).toBe('integer-auto')
  })

  it('round-trips a saved value', () => {
    saveStoredScaleMode('integer-2x')
    expect(loadStoredScaleMode()).toBe('integer-2x')
  })

  it('returns default for an unknown stored value (schema protection)', () => {
    localStorage.setItem('ansi-editor:scale-mode', 'not-a-real-mode')
    expect(loadStoredScaleMode()).toBe('integer-auto')
  })

  it('returns default for garbage JSON-ish input', () => {
    localStorage.setItem('ansi-editor:scale-mode', '')
    expect(loadStoredScaleMode()).toBe('integer-auto')
  })

  it('each valid mode round-trips', () => {
    const modes = ['integer-auto', 'integer-1x', 'integer-2x', 'integer-3x', 'fit', 'fill'] as const
    for (const m of modes) {
      saveStoredScaleMode(m)
      expect(loadStoredScaleMode()).toBe(m)
    }
  })
})

describe('dprCompensatePersistence', () => {
  it('DEFAULT_DPR_COMPENSATE is true (on by default)', () => {
    expect(DEFAULT_DPR_COMPENSATE).toBe(true)
  })

  it('returns default (true) when storage is empty', () => {
    expect(loadStoredDprCompensate()).toBe(true)
  })

  it('round-trips a true value', () => {
    saveStoredDprCompensate(true)
    expect(loadStoredDprCompensate()).toBe(true)
  })

  it('persists explicit false — distinguishes "user turned off" from "never set"', () => {
    saveStoredDprCompensate(false)
    expect(loadStoredDprCompensate()).toBe(false)
    expect(localStorage.getItem('ansi-editor:dpr-compensate')).toBe('0')
  })

  it('re-enabling overwrites the false value', () => {
    saveStoredDprCompensate(false)
    saveStoredDprCompensate(true)
    expect(loadStoredDprCompensate()).toBe(true)
    expect(localStorage.getItem('ansi-editor:dpr-compensate')).toBe('1')
  })
})
