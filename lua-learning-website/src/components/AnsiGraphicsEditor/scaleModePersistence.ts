import type { ScaleMode } from './types'

/**
 * Global localStorage key for the editor's scale-mode preference.
 * Intentionally not per-file — scale is a view preference that depends
 * on monitor size and user workflow, not file content. Storing it per
 * file would break across devices and produce surprising "why did my
 * file open at the wrong size?" moments after swapping displays.
 */
const STORAGE_KEY = 'ansi-editor:scale-mode'

const VALID_MODES: ReadonlySet<ScaleMode> = new Set<ScaleMode>([
  'integer-auto',
  'integer-1x',
  'integer-2x',
  'integer-3x',
  'fit',
  'fill',
])

export const DEFAULT_ANSI_SCALE_MODE: ScaleMode = 'integer-auto'

/**
 * Read the last-used scale mode from localStorage, validating against
 * the known set. Returns the default when unavailable, unparseable, or
 * an unknown mode (e.g. after a future version removes a mode).
 */
export function loadStoredScaleMode(): ScaleMode {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && (VALID_MODES as ReadonlySet<string>).has(raw)) {
      return raw as ScaleMode
    }
  } catch {
    /* localStorage unavailable (privacy mode, disabled) — fall through */
  }
  return DEFAULT_ANSI_SCALE_MODE
}

/** Persist the user's current scale mode. Errors are swallowed — this is advisory state, not content. */
export function saveStoredScaleMode(mode: ScaleMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode)
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/**
 * Separate key for the "Emulate Pixel Perfect on HiDPI" toggle. Lives alongside
 * the scale mode — both are editor-level view preferences — but kept as
 * independent fields so the schema is forward-compatible if we later add
 * more panel prefs.
 *
 * Stored as '1' (on) / '0' (off). Absent = default (true) so first-time
 * users get pixel-perfect emulation automatically on fractional-DPR
 * displays. Values other than '0' are treated as on.
 */
const DPR_COMPENSATE_KEY = 'ansi-editor:dpr-compensate'

export const DEFAULT_DPR_COMPENSATE = true

export function loadStoredDprCompensate(): boolean {
  try {
    const raw = localStorage.getItem(DPR_COMPENSATE_KEY)
    if (raw === null) return DEFAULT_DPR_COMPENSATE
    return raw !== '0'
  } catch {
    return DEFAULT_DPR_COMPENSATE
  }
}

export function saveStoredDprCompensate(flag: boolean): void {
  try {
    // Always write explicitly so load can distinguish "user turned it off"
    // from "never set" (default).
    localStorage.setItem(DPR_COMPENSATE_KEY, flag ? '1' : '0')
  } catch {
    /* ignore */
  }
}
