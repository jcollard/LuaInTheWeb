import { stringify, parse } from '@kilcekru/lua-table'
import type { AnsiGrid } from './types'
import { ANSI_COLS, ANSI_ROWS } from './types'

export function serializeGrid(grid: AnsiGrid): string {
  const data = { version: 1, width: ANSI_COLS, height: ANSI_ROWS, grid }
  return 'return ' + stringify(data)
}

export function deserializeGrid(lua: string): AnsiGrid {
  const stripped = lua.replace(/^return\s+/, '')
  const data = parse(stripped) as Record<string, unknown>
  if (data.version !== 1) {
    throw new Error(`Unsupported version: ${data.version}`)
  }
  if (!Array.isArray(data.grid)) {
    throw new Error('Missing grid field')
  }
  return data.grid as AnsiGrid
}
