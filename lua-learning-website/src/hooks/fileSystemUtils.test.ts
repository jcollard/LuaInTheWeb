import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateFileName,
  getFileName,
  getParentPath,
  normalizePath,
  loadFromStorage,
  saveToStorage,
  buildTree,
  STORAGE_KEY,
} from './fileSystemUtils'
import type { FileSystemState, VirtualFile } from './fileSystemTypes'

describe('fileSystemUtils', () => {
  describe('validateFileName', () => {
    it('should accept valid file names', () => {
      expect(() => validateFileName('test.lua')).not.toThrow()
      expect(() => validateFileName('my-file')).not.toThrow()
      expect(() => validateFileName('file_name.txt')).not.toThrow()
    })

    it('should reject empty names', () => {
      expect(() => validateFileName('')).toThrow('name cannot be empty')
      expect(() => validateFileName('   ')).toThrow('name cannot be empty')
    })

    it('should reject invalid characters', () => {
      expect(() => validateFileName('file:name')).toThrow('forbidden characters')
      expect(() => validateFileName('file*name')).toThrow('forbidden characters')
      expect(() => validateFileName('file?name')).toThrow('forbidden characters')
      expect(() => validateFileName('file<name')).toThrow('forbidden characters')
      expect(() => validateFileName('file>name')).toThrow('forbidden characters')
      expect(() => validateFileName('file|name')).toThrow('forbidden characters')
      expect(() => validateFileName('file"name')).toThrow('forbidden characters')
      expect(() => validateFileName('file\\name')).toThrow('forbidden characters')
    })
  })

  describe('getFileName', () => {
    it('should extract file name from path', () => {
      expect(getFileName('/test.lua')).toBe('test.lua')
      expect(getFileName('/folder/file.txt')).toBe('file.txt')
      expect(getFileName('/a/b/c/deep.lua')).toBe('deep.lua')
    })

    it('should handle root path', () => {
      expect(getFileName('/')).toBe('')
    })
  })

  describe('getParentPath', () => {
    it('should get parent path', () => {
      expect(getParentPath('/folder/file.txt')).toBe('/folder')
      expect(getParentPath('/a/b/c')).toBe('/a/b')
    })

    it('should return root for top-level items', () => {
      expect(getParentPath('/file.txt')).toBe('/')
      expect(getParentPath('/folder')).toBe('/')
    })
  })

  describe('normalizePath', () => {
    it('should add leading slash', () => {
      expect(normalizePath('test.lua')).toBe('/test.lua')
      expect(normalizePath('folder/file.txt')).toBe('/folder/file.txt')
    })

    it('should remove trailing slash', () => {
      expect(normalizePath('/folder/')).toBe('/folder')
      expect(normalizePath('/a/b/')).toBe('/a/b')
    })

    it('should preserve root', () => {
      expect(normalizePath('/')).toBe('/')
    })

    it('should not modify valid paths', () => {
      expect(normalizePath('/test.lua')).toBe('/test.lua')
      expect(normalizePath('/folder/file')).toBe('/folder/file')
    })
  })

  describe('loadFromStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should return default state when storage is empty', () => {
      const state = loadFromStorage()
      expect(state.version).toBe(1)
      expect(state.files).toEqual({})
      expect(state.folders.has('/')).toBe(true)
    })

    it('should load state from storage', () => {
      const stored = {
        version: 2,
        files: { '/test.lua': { name: 'test.lua', content: 'test', createdAt: 1, updatedAt: 1 } },
        folders: ['/', '/folder'],
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))

      const state = loadFromStorage()
      expect(state.version).toBe(2)
      expect(state.files['/test.lua'].content).toBe('test')
      expect(state.folders.has('/folder')).toBe(true)
    })

    it('should handle corrupted storage gracefully', () => {
      localStorage.setItem(STORAGE_KEY, 'invalid json')
      const state = loadFromStorage()
      expect(state.version).toBe(1)
      expect(state.files).toEqual({})
    })
  })

  describe('saveToStorage', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    it('should save state to storage', () => {
      const state: FileSystemState = {
        version: 3,
        files: { '/test.lua': { name: 'test.lua', content: 'hello', createdAt: 1, updatedAt: 2 } },
        folders: new Set(['/', '/myFolder']),
      }

      saveToStorage(state)

      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
      expect(stored.version).toBe(3)
      expect(stored.files['/test.lua'].content).toBe('hello')
      expect(stored.folders).toContain('/myFolder')
    })
  })

  describe('buildTree', () => {
    it('should build tree from files and folders', () => {
      const files: Record<string, VirtualFile> = {
        '/file1.lua': { name: 'file1.lua', content: '', createdAt: 1, updatedAt: 1 },
        '/folder/file2.lua': { name: 'file2.lua', content: '', createdAt: 1, updatedAt: 1 },
      }
      const folders = new Set(['/', '/folder'])

      const tree = buildTree(files, folders, '/')

      expect(tree).toHaveLength(2)
      expect(tree[0].type).toBe('folder')
      expect(tree[0].name).toBe('folder')
      expect(tree[0].children).toHaveLength(1)
      expect(tree[1].type).toBe('file')
      expect(tree[1].name).toBe('file1.lua')
    })

    it('should sort folders before files', () => {
      const files: Record<string, VirtualFile> = {
        '/aaa.lua': { name: 'aaa.lua', content: '', createdAt: 1, updatedAt: 1 },
      }
      const folders = new Set(['/', '/zzz'])

      const tree = buildTree(files, folders, '/')

      expect(tree[0].type).toBe('folder')
      expect(tree[0].name).toBe('zzz')
      expect(tree[1].type).toBe('file')
      expect(tree[1].name).toBe('aaa.lua')
    })

    it('should return empty array for empty directory', () => {
      const tree = buildTree({}, new Set(['/']), '/')
      expect(tree).toEqual([])
    })
  })
})
