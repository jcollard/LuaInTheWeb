import { describe, it, expect } from 'vitest'
import {
  getLibrarySource,
  hasLibrary,
  getRegisteredLibraries,
} from './luaLibraryRegistry'

describe('luaLibraryRegistry', () => {
  describe('getRegisteredLibraries', () => {
    it('returns array of registered library names', () => {
      const libs = getRegisteredLibraries()
      expect(Array.isArray(libs)).toBe(true)
      expect(libs.length).toBeGreaterThan(0)
    })

    it('includes shell library', () => {
      const libs = getRegisteredLibraries()
      expect(libs).toContain('shell')
    })

    it('includes canvas library', () => {
      const libs = getRegisteredLibraries()
      expect(libs).toContain('canvas')
    })
  })

  describe('hasLibrary', () => {
    it('returns true for registered library', () => {
      expect(hasLibrary('shell')).toBe(true)
      expect(hasLibrary('canvas')).toBe(true)
    })

    it('returns false for unregistered library', () => {
      expect(hasLibrary('nonexistent')).toBe(false)
      expect(hasLibrary('')).toBe(false)
    })
  })

  describe('getLibrarySource', () => {
    it('returns Lua source code for shell library', () => {
      const source = getLibrarySource('shell')
      expect(source).not.toBeNull()
      expect(typeof source).toBe('string')
      expect(source!.length).toBeGreaterThan(0)
      // Verify it contains shell library code
      expect(source).toContain('shell')
      expect(source).toContain('function')
    })

    it('returns Lua source code for canvas library', () => {
      const source = getLibrarySource('canvas')
      expect(source).not.toBeNull()
      expect(typeof source).toBe('string')
      expect(source!.length).toBeGreaterThan(0)
      // Verify it contains canvas library code
      expect(source).toContain('canvas')
      expect(source).toContain('function')
    })

    it('returns null for unregistered library', () => {
      expect(getLibrarySource('nonexistent')).toBeNull()
      expect(getLibrarySource('')).toBeNull()
    })
  })
})
