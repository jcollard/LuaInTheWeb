/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest'
import {
  loadStoredDprCompensate,
  saveStoredDprCompensate,
  DEFAULT_DPR_COMPENSATE,
} from './scaleModePersistence'

beforeEach(() => {
  localStorage.clear()
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
