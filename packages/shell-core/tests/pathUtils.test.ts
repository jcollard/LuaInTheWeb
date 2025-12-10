import { describe, it, expect } from 'vitest'
import {
  normalizePath,
  joinPath,
  resolvePath,
  isAbsolutePath,
  getParentPath,
  getBasename,
} from '../src/pathUtils'

describe('pathUtils', () => {
  describe('normalizePath', () => {
    it('should return "/" for empty string', () => {
      expect(normalizePath('')).toBe('/')
    })

    it('should return "/" for root path', () => {
      expect(normalizePath('/')).toBe('/')
    })

    it('should normalize backslashes to forward slashes', () => {
      expect(normalizePath('foo\\bar\\baz')).toBe('/foo/bar/baz')
    })

    it('should remove trailing slashes', () => {
      expect(normalizePath('/foo/bar/')).toBe('/foo/bar')
    })

    it('should handle multiple consecutive slashes', () => {
      expect(normalizePath('/foo//bar///baz')).toBe('/foo/bar/baz')
    })

    it('should resolve single dot segments', () => {
      expect(normalizePath('/foo/./bar')).toBe('/foo/bar')
    })

    it('should resolve double dot segments', () => {
      expect(normalizePath('/foo/bar/../baz')).toBe('/foo/baz')
    })

    it('should not go above root with double dots', () => {
      expect(normalizePath('/foo/../../bar')).toBe('/bar')
      expect(normalizePath('/../..')).toBe('/')
    })

    it('should handle complex paths', () => {
      expect(normalizePath('/foo/./bar/../baz/./qux/..')).toBe('/foo/baz')
    })

    it('should add leading slash for relative paths', () => {
      expect(normalizePath('foo/bar')).toBe('/foo/bar')
    })
  })

  describe('joinPath', () => {
    it('should join two path segments', () => {
      expect(joinPath('/foo', 'bar')).toBe('/foo/bar')
    })

    it('should handle absolute second path', () => {
      expect(joinPath('/foo', '/bar')).toBe('/bar')
    })

    it('should handle empty base', () => {
      expect(joinPath('', 'foo')).toBe('/foo')
    })

    it('should handle empty path', () => {
      expect(joinPath('/foo', '')).toBe('/foo')
    })

    it('should join multiple segments', () => {
      expect(joinPath('/foo', 'bar', 'baz')).toBe('/foo/bar/baz')
    })

    it('should normalize the result', () => {
      expect(joinPath('/foo/', '/bar/../baz')).toBe('/baz')
    })

    it('should return root for no arguments', () => {
      expect(joinPath()).toBe('/')
    })

    it('should return root for all empty arguments', () => {
      expect(joinPath('', '', '')).toBe('/')
    })
  })

  describe('resolvePath', () => {
    it('should resolve absolute path as-is', () => {
      expect(resolvePath('/base', '/absolute')).toBe('/absolute')
    })

    it('should resolve relative path against base', () => {
      expect(resolvePath('/base/dir', 'file.txt')).toBe('/base/dir/file.txt')
    })

    it('should resolve parent references', () => {
      expect(resolvePath('/base/dir', '../other')).toBe('/base/other')
    })

    it('should handle current directory reference', () => {
      expect(resolvePath('/base/dir', './file')).toBe('/base/dir/file')
    })

    it('should normalize the result', () => {
      expect(resolvePath('/base//dir/', './foo/../bar')).toBe('/base/dir/bar')
    })
  })

  describe('isAbsolutePath', () => {
    it('should return true for paths starting with /', () => {
      expect(isAbsolutePath('/foo')).toBe(true)
      expect(isAbsolutePath('/')).toBe(true)
    })

    it('should return false for relative paths', () => {
      expect(isAbsolutePath('foo')).toBe(false)
      expect(isAbsolutePath('foo/bar')).toBe(false)
      expect(isAbsolutePath('./foo')).toBe(false)
      expect(isAbsolutePath('../foo')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isAbsolutePath('')).toBe(false)
    })
  })

  describe('getParentPath', () => {
    it('should return parent directory', () => {
      expect(getParentPath('/foo/bar')).toBe('/foo')
    })

    it('should return root for root children', () => {
      expect(getParentPath('/foo')).toBe('/')
    })

    it('should return root for root', () => {
      expect(getParentPath('/')).toBe('/')
    })

    it('should handle trailing slashes', () => {
      expect(getParentPath('/foo/bar/')).toBe('/foo')
    })

    it('should handle deep paths', () => {
      expect(getParentPath('/a/b/c/d')).toBe('/a/b/c')
    })
  })

  describe('getBasename', () => {
    it('should return the last segment', () => {
      expect(getBasename('/foo/bar')).toBe('bar')
    })

    it('should handle root path', () => {
      expect(getBasename('/')).toBe('')
    })

    it('should handle single segment', () => {
      expect(getBasename('/foo')).toBe('foo')
    })

    it('should handle trailing slashes', () => {
      expect(getBasename('/foo/bar/')).toBe('bar')
    })

    it('should handle file names with extensions', () => {
      expect(getBasename('/path/to/file.txt')).toBe('file.txt')
    })
  })
})
