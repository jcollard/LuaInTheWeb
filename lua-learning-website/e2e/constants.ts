/**
 * E2E Test Timeout Constants
 *
 * Centralized timeout values for Playwright tests.
 * Use semantic names based on the purpose, not duration.
 */

/**
 * UI Stabilization Timeouts
 * Used after interactions to let the UI settle before assertions
 */
export const TIMEOUTS = {
  /** Very brief pause for minimal UI updates (100ms) */
  BRIEF: 100,

  /** Standard UI stabilization wait (200ms) */
  UI_STABLE: 200,

  /** Wait for CSS transitions to complete (300ms) */
  TRANSITION: 300,

  /** Wait for animations to complete (500ms) */
  ANIMATION: 500,

  /** Wait for component initialization (1000ms) */
  INIT: 1000,

  /** Wait for async operations like Lua execution (5000ms) */
  ASYNC_OPERATION: 5000,

  /** Wait for elements to become visible (10000ms) */
  ELEMENT_VISIBLE: 10000,

  /** Extended timeout for slow CI environments (30000ms) */
  CI_EXTENDED: 30000,
} as const

/**
 * Type for timeout constant keys
 */
export type TimeoutKey = keyof typeof TIMEOUTS
