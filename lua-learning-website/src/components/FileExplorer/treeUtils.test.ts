import { describe, it, expect } from 'vitest'
import { isLuaFile } from './treeUtils'

describe('isLuaFile', () => {
  it('returns true for .lua files', () => {
    expect(isLuaFile('/workspace/main.lua')).toBe(true)
  })

  it('returns true for .Lua files (case-insensitive)', () => {
    expect(isLuaFile('/workspace/Main.LUA')).toBe(true)
  })

  it('returns false for non-lua files', () => {
    expect(isLuaFile('/workspace/readme.md')).toBe(false)
  })

  it('returns false for files with lua in the name but different extension', () => {
    expect(isLuaFile('/workspace/lua-notes.txt')).toBe(false)
  })
})
