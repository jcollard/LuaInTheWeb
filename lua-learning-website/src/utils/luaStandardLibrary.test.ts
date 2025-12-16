import { describe, it, expect } from 'vitest'
import {
  getLuaDocumentation,
  type LuaDocEntry,
} from './luaStandardLibrary'

describe('luaStandardLibrary', () => {
  describe('getLuaDocumentation', () => {
    it('returns documentation for global print function', () => {
      const doc = getLuaDocumentation('print')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('print')
      expect(doc?.signature).toContain('print')
      expect(doc?.description).toBeTruthy()
    })

    it('returns documentation for global type function', () => {
      const doc = getLuaDocumentation('type')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('type')
      expect(doc?.signature).toContain('type')
      expect(doc?.description).toBeTruthy()
    })

    it('returns documentation for string library functions', () => {
      const doc = getLuaDocumentation('string.sub')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('string.sub')
      expect(doc?.signature).toContain('string.sub')
      expect(doc?.description).toBeTruthy()
    })

    it('returns documentation for table library functions', () => {
      const doc = getLuaDocumentation('table.insert')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('table.insert')
      expect(doc?.signature).toContain('table.insert')
      expect(doc?.description).toBeTruthy()
    })

    it('returns documentation for math library functions', () => {
      const doc = getLuaDocumentation('math.floor')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('math.floor')
      expect(doc?.signature).toContain('math.floor')
      expect(doc?.description).toBeTruthy()
    })

    it('returns null for unknown functions', () => {
      const doc = getLuaDocumentation('unknownFunction')

      expect(doc).toBeNull()
    })

    it('returns null for empty string', () => {
      const doc = getLuaDocumentation('')

      expect(doc).toBeNull()
    })

    it('returns documentation for tonumber function', () => {
      const doc = getLuaDocumentation('tonumber')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('tonumber')
    })

    it('returns documentation for tostring function', () => {
      const doc = getLuaDocumentation('tostring')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('tostring')
    })

    it('returns documentation for pairs function', () => {
      const doc = getLuaDocumentation('pairs')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('pairs')
    })

    it('returns documentation for ipairs function', () => {
      const doc = getLuaDocumentation('ipairs')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('ipairs')
    })

    it('returns documentation with library field for library functions', () => {
      const doc = getLuaDocumentation('string.len')

      expect(doc).not.toBeNull()
      expect(doc?.library).toBe('string')
    })

    it('returns documentation without library field for global functions', () => {
      const doc = getLuaDocumentation('print')

      expect(doc).not.toBeNull()
      expect(doc?.library).toBeUndefined()
    })

    it('returns documentation for string.format', () => {
      const doc = getLuaDocumentation('string.format')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('string.format')
      expect(doc?.description).toBeTruthy()
    })

    it('returns documentation for table.concat', () => {
      const doc = getLuaDocumentation('table.concat')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('table.concat')
    })

    it('returns documentation for math.random', () => {
      const doc = getLuaDocumentation('math.random')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('math.random')
    })

    it('returns documentation for io.write', () => {
      const doc = getLuaDocumentation('io.write')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('io.write')
      expect(doc?.signature).toContain('io.write')
      expect(doc?.description).toBeTruthy()
      expect(doc?.library).toBe('io')
    })

    it('returns documentation for io.read', () => {
      const doc = getLuaDocumentation('io.read')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('io.read')
      expect(doc?.signature).toContain('io.read')
      expect(doc?.description).toBeTruthy()
      expect(doc?.library).toBe('io')
    })

    it('returns documentation for io.open', () => {
      const doc = getLuaDocumentation('io.open')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('io.open')
      expect(doc?.library).toBe('io')
    })

    it('returns documentation for io.lines', () => {
      const doc = getLuaDocumentation('io.lines')

      expect(doc).not.toBeNull()
      expect(doc?.name).toBe('io.lines')
      expect(doc?.library).toBe('io')
    })
  })

  describe('LuaDocEntry type', () => {
    it('has required fields', () => {
      const doc: LuaDocEntry | null = getLuaDocumentation('print')

      // Type check - these fields must exist
      expect(doc).toHaveProperty('name')
      expect(doc).toHaveProperty('signature')
      expect(doc).toHaveProperty('description')
    })
  })
})
