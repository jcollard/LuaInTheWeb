import { describe, it, expect } from 'vitest'
import { serializeGrid, deserializeGrid } from './serialization'
import { ANSI_COLS, ANSI_ROWS, DEFAULT_FG, DEFAULT_BG } from './types'
import type { AnsiGrid } from './types'

function createTestGrid(): AnsiGrid {
  return Array.from({ length: ANSI_ROWS }, () =>
    Array.from({ length: ANSI_COLS }, () => ({
      char: ' ',
      fg: [...DEFAULT_FG] as [number, number, number],
      bg: [...DEFAULT_BG] as [number, number, number],
    }))
  )
}

describe('serializeGrid', () => {
  it('should produce a Lua table literal starting with return', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    expect(lua.startsWith('return {')).toBe(true)
  })

  it('should use Lua table syntax with equals signs', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    expect(lua).toContain('["version"] = 1')
    expect(lua).toContain(`["width"] = ${ANSI_COLS}`)
    expect(lua).toContain(`["height"] = ${ANSI_ROWS}`)
  })

  it('should include cell data in Lua syntax', () => {
    const grid = createTestGrid()
    grid[0][0] = { char: '#', fg: [255, 85, 85], bg: [0, 0, 170] }
    const lua = serializeGrid(grid)
    expect(lua).toContain('["char"] = "#"')
  })

  it('should not contain JSON colons for key-value pairs', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    expect(lua).not.toContain('"version":')
    expect(lua).not.toContain('"grid":')
  })
})

describe('deserializeGrid', () => {
  it('should round-trip an empty grid', () => {
    const grid = createTestGrid()
    const lua = serializeGrid(grid)
    const result = deserializeGrid(lua)
    expect(result).toEqual(grid)
  })

  it('should round-trip a grid with painted cells', () => {
    const grid = createTestGrid()
    grid[5][10] = { char: '@', fg: [85, 255, 85], bg: [170, 0, 170] }
    grid[24][79] = { char: 'Z', fg: [255, 255, 255], bg: [0, 0, 0] }
    const lua = serializeGrid(grid)
    const result = deserializeGrid(lua)
    expect(result[5][10]).toEqual({ char: '@', fg: [85, 255, 85], bg: [170, 0, 170] })
    expect(result[24][79]).toEqual({ char: 'Z', fg: [255, 255, 255], bg: [0, 0, 0] })
  })

  it('should throw on invalid input', () => {
    expect(() => deserializeGrid('not valid lua')).toThrow()
  })

  it('should throw on missing version field', () => {
    expect(() => deserializeGrid('return {["width"] = 80, ["height"] = 25, ["grid"] = {}}')).toThrow()
  })

  it('should throw on unsupported version with version number in message', () => {
    expect(() => deserializeGrid('return {["version"] = 99, ["width"] = 80, ["height"] = 25, ["grid"] = {}}')).toThrow('Unsupported version: 99')
  })

  it('should throw on missing grid field with descriptive message', () => {
    expect(() => deserializeGrid('return {["version"] = 1, ["width"] = 80, ["height"] = 25}')).toThrow('Missing grid field')
  })

  it('should throw when grid is a string not an array', () => {
    expect(() => deserializeGrid('return {["version"] = 1, ["width"] = 80, ["height"] = 25, ["grid"] = "not-array"}')).toThrow('Missing grid field')
  })
})
