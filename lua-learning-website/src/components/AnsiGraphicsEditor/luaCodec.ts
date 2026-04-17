import { stringify, parse } from '@kilcekru/lua-table'

// @kilcekru/lua-table has a symmetric bug on both sides (confirmed at 1.1.2):
// stringify only escapes `"` and `\n` (not `\`), and parse only decodes `\"`,
// `\'`, `\n`, `\t` (not `\\`). A raw `\` in a string value therefore produces
// an unterminated Lua literal on write, and a valid `"\\"` literal decodes to
// two chars on read. Double on write, halve on read. Known limitation: if a
// string contains `\` immediately followed by `n`/`t`/`"`/`'`, the library's
// parse-side replaceAll will still corrupt it — but cell chars are single
// code points, and v7 text runs that pack multiple cells only hit this for
// specific adjacencies, which is acceptable for now.
function mapStrings(data: unknown, fn: (s: string) => string): unknown {
  if (typeof data === 'string') return fn(data)
  if (Array.isArray(data)) return data.map(v => mapStrings(v, fn))
  if (data !== null && typeof data === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      out[k] = mapStrings(v, fn)
    }
    return out
  }
  return data
}

export function luaStringify(data: unknown): string {
  return stringify(mapStrings(data, s => s.replaceAll('\\', '\\\\')))
}

export function luaParse(source: string): Record<string, unknown> {
  return mapStrings(parse(source), s => s.replaceAll('\\\\', '\\')) as Record<string, unknown>
}
