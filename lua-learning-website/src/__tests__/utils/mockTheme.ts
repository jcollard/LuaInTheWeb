import { vi } from 'vitest'

/**
 * ⚠️ VITEST HOISTING LIMITATION ⚠️
 *
 * These utilities CANNOT be used directly in vi.mock() factory functions
 * due to vitest's hoisting behavior. vi.mock() calls are hoisted to the
 * top of the file BEFORE imports are evaluated, causing errors like:
 * "Cannot access '__vi_import_X__' before initialization"
 *
 * RECOMMENDED PATTERN: Use inline mock definitions instead:
 *
 * @example
 * // ❌ DON'T DO THIS - will cause hoisting error
 * import { createUseThemeMock } from '../../__tests__/utils/mockTheme'
 * vi.mock('../../contexts/useTheme', () => createUseThemeMock())
 *
 * // ✅ DO THIS - inline mock definition works
 * vi.mock('../../contexts/useTheme', () => ({
 *   useTheme: () => ({
 *     theme: 'dark',
 *     setTheme: vi.fn(),
 *     toggleTheme: vi.fn(),
 *     isDark: true,
 *   }),
 * }))
 *
 * @example
 * // ✅ ALTERNATIVE - use vi.hoisted() for shared mocks
 * const { mockUseTheme } = vi.hoisted(() => ({
 *   mockUseTheme: vi.fn(() => ({
 *     theme: 'dark',
 *     setTheme: vi.fn(),
 *     toggleTheme: vi.fn(),
 *     isDark: true,
 *   })),
 * }))
 * vi.mock('../../contexts/useTheme', () => ({ useTheme: mockUseTheme }))
 *
 * These utilities can still be used for type definitions and as reference
 * for the expected shape of theme mocks.
 */

/**
 * Theme type (duplicated to avoid circular import issues with vi.mock hoisting)
 */
export type Theme = 'light' | 'dark'

/**
 * ThemeContextValue interface (duplicated to avoid circular import issues)
 */
export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
}

/**
 * Default mock values for useTheme hook.
 * Use these when you need a static theme context that doesn't change.
 *
 * NOTE: Cannot be used directly in vi.mock() - see hoisting warning above.
 */
export const defaultThemeMock: ThemeContextValue = {
  theme: 'dark' as Theme,
  isDark: true,
  toggleTheme: vi.fn(),
  setTheme: vi.fn(),
}

/**
 * Creates a mock return value for useTheme with custom values.
 * Useful for testing specific theme states with mockReturnValue().
 *
 * NOTE: Use this with mockReturnValue(), not in vi.mock() factory.
 *
 * @param overrides - Partial theme context values to override defaults
 * @returns Complete ThemeContextValue with defaults and overrides merged
 *
 * @example
 * // Use with mockReturnValue in tests
 * (useTheme as Mock).mockReturnValue(createThemeMock({ theme: 'light', isDark: false }))
 */
export function createThemeMock(
  overrides: Partial<ThemeContextValue> = {}
): ThemeContextValue {
  return {
    ...defaultThemeMock,
    toggleTheme: vi.fn(),
    setTheme: vi.fn(),
    ...overrides,
  }
}
