/**
 * The keyboard modifier that triggers eyedropper sampling when not in the
 * eyedropper tool. Default is Ctrl to preserve prior behavior, but some users
 * (macOS trackpad, virtual-right-click setups) need to choose a different
 * modifier because Ctrl+click is already consumed by the OS as right-click.
 */
export type EyedropperModifier = 'ctrl' | 'shift' | 'alt' | 'meta'

const STORAGE_KEY = 'ansi-editor:eyedropper-modifier'

const VALID_MODIFIERS: ReadonlySet<EyedropperModifier> = new Set<EyedropperModifier>([
  'ctrl',
  'shift',
  'alt',
  'meta',
])

export const DEFAULT_EYEDROPPER_MODIFIER: EyedropperModifier = 'ctrl'

export function loadStoredEyedropperModifier(): EyedropperModifier {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw && (VALID_MODIFIERS as ReadonlySet<string>).has(raw)) {
      return raw as EyedropperModifier
    }
  } catch {
    /* localStorage unavailable (privacy mode, disabled) — fall through */
  }
  return DEFAULT_EYEDROPPER_MODIFIER
}

export function saveStoredEyedropperModifier(modifier: EyedropperModifier): void {
  try {
    localStorage.setItem(STORAGE_KEY, modifier)
  } catch {
    /* ignore quota / privacy-mode errors */
  }
}

/**
 * Subset of MouseEvent we actually read — keeps unit tests free of
 * full DOM MouseEvent construction.
 */
export interface ModifierEvent {
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  metaKey: boolean
}

/**
 * Check whether the user's configured eyedropper modifier is held on a
 * mouse event. Strict match — no implicit ctrl/meta aliasing, because the
 * whole point of this preference is to let users pick a specific modifier
 * that doesn't collide with their OS-level virtual-right-click setup.
 */
export function isEyedropperModifierPressed(
  e: ModifierEvent,
  modifier: EyedropperModifier,
): boolean {
  switch (modifier) {
    case 'ctrl':  return e.ctrlKey
    case 'shift': return e.shiftKey
    case 'alt':   return e.altKey
    case 'meta':  return e.metaKey
  }
}

/** Human-readable label for UI display. Meta is annotated for cross-platform clarity. */
export function eyedropperModifierLabel(modifier: EyedropperModifier): string {
  switch (modifier) {
    case 'ctrl':  return 'Ctrl'
    case 'shift': return 'Shift'
    case 'alt':   return 'Alt'
    case 'meta':  return 'Meta (⌘ / Win)'
  }
}
