/**
 * Development component for testing the ErrorBoundary.
 *
 * In development mode, exposes window.__triggerErrorBoundary()
 * which can be called from the browser console to test error recovery.
 */

import { useDevErrorTrigger } from './useDevErrorTrigger'

/**
 * Component that provides error trigger functionality.
 *
 * Place this inside the ErrorBoundary to enable console-triggered errors.
 */
export function DevErrorTrigger(): null {
  useDevErrorTrigger()
  return null
}
