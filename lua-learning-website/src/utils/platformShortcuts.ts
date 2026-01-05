/**
 * Cross-platform keyboard shortcut utilities.
 *
 * Handles the difference between macOS (Command key) and Windows/Linux (Ctrl key)
 * for keyboard shortcuts.
 */

/**
 * Detects if the current platform is macOS.
 * Uses navigator.platform for reliable detection.
 *
 * @returns true if running on macOS, false otherwise
 */
export function isMacOS(): boolean {
  // Stryker disable next-line ConditionalExpression: SSR guard
  if (typeof navigator === 'undefined') return false
  return navigator.platform.toUpperCase().includes('MAC')
}

/**
 * Checks if the platform-appropriate modifier key is pressed.
 * - macOS: Command (metaKey)
 * - Windows/Linux: Ctrl (ctrlKey)
 *
 * @param event - The keyboard event to check
 * @returns true if the appropriate modifier key is pressed
 */
export function hasModifierKey(event: KeyboardEvent): boolean {
  return isMacOS() ? event.metaKey : event.ctrlKey
}

/**
 * Returns a human-readable label for the modifier key.
 * Useful for displaying shortcut hints in the UI.
 *
 * @returns '⌘' on macOS, 'Ctrl' on Windows/Linux
 */
export function getModifierKeyLabel(): string {
  return isMacOS() ? '⌘' : 'Ctrl'
}
