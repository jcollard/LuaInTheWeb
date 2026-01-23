/**
 * Shared utilities for canvas bridge implementations.
 */

/**
 * Convert a Lua table proxy or JS array to a JS number array.
 * Lua table proxies from wasmoon are not iterable with spread operator,
 * so we iterate with numeric indices (1-indexed for Lua, 0-indexed for JS).
 */
export function toNumberArray(
  segments: number[] | Record<number, number>
): number[] {
  if (Array.isArray(segments)) {
    return [...segments]
  }
  const result: number[] = []
  const startIndex = segments[0] !== undefined ? 0 : 1
  let i = startIndex
  while (segments[i] !== undefined) {
    result.push(segments[i])
    i++
  }
  return result
}
