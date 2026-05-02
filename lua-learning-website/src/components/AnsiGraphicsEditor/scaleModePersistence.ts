/**
 * Persistence for the "Emulate Pixel Perfect on HiDPI" toggle.
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
