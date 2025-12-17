/**
 * Tests for ReadOnlyFileSystem
 */
import { describe, it, expect } from 'vitest'
import { createReadOnlyFileSystem } from './readOnlyFileSystem'

describe('createReadOnlyFileSystem', () => {
  describe('basic file operations', () => {
    it('creates filesystem with text files', () => {
      const fs = createReadOnlyFileSystem({
        'readme.txt': 'Hello World',
        'docs/guide.md': '# Guide',
      })

      expect(fs.exists('/readme.txt')).toBe(true)
      expect(fs.exists('/docs/guide.md')).toBe(true)
    })

    it('reads text files', () => {
      const fs = createReadOnlyFileSystem({
        'readme.txt': 'Hello World',
      })

      expect(fs.readFile('/readme.txt')).toBe('Hello World')
    })

    it('throws error for non-existent file', () => {
      const fs = createReadOnlyFileSystem({})

      expect(() => fs.readFile('/missing.txt')).toThrow('File not found')
    })

    it('detects files vs directories', () => {
      const fs = createReadOnlyFileSystem({
        'file.txt': 'content',
        'dir/nested.txt': 'nested content',
      })

      expect(fs.isFile('/file.txt')).toBe(true)
      expect(fs.isDirectory('/file.txt')).toBe(false)
      expect(fs.isFile('/dir')).toBe(false)
      expect(fs.isDirectory('/dir')).toBe(true)
    })

    it('lists directory contents', () => {
      const fs = createReadOnlyFileSystem({
        'a.txt': 'a',
        'b.txt': 'b',
        'sub/c.txt': 'c',
      })

      const entries = fs.listDirectory('/')
      expect(entries).toHaveLength(3)
      // Directories first, then files alphabetically
      expect(entries[0].name).toBe('sub')
      expect(entries[0].type).toBe('directory')
      expect(entries[1].name).toBe('a.txt')
      expect(entries[2].name).toBe('b.txt')
    })
  })

  describe('read-only enforcement', () => {
    it('throws error on writeFile', () => {
      const fs = createReadOnlyFileSystem({})

      expect(() => fs.writeFile('/new.txt', 'content')).toThrow('read-only')
    })

    it('throws error on createDirectory', () => {
      const fs = createReadOnlyFileSystem({})

      expect(() => fs.createDirectory('/newdir')).toThrow('read-only')
    })

    it('throws error on delete', () => {
      const fs = createReadOnlyFileSystem({ 'file.txt': 'content' })

      expect(() => fs.delete('/file.txt')).toThrow('read-only')
    })
  })

  describe('binary file support', () => {
    it('creates filesystem with binary files', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const fs = createReadOnlyFileSystem({}, { 'image.png': binaryContent })

      expect(fs.exists('/image.png')).toBe(true)
      expect(fs.isFile('/image.png')).toBe(true)
    })

    it('reads binary files', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const fs = createReadOnlyFileSystem({}, { 'image.png': binaryContent })

      const result = fs.readBinaryFile!('/image.png')
      expect(result).toEqual(binaryContent)
    })

    it('detects binary files with isBinaryFile', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const fs = createReadOnlyFileSystem(
        { 'text.txt': 'hello' },
        { 'image.png': binaryContent }
      )

      expect(fs.isBinaryFile!('/image.png')).toBe(true)
      expect(fs.isBinaryFile!('/text.txt')).toBe(false)
    })

    it('throws error when reading binary file as text', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const fs = createReadOnlyFileSystem({}, { 'image.png': binaryContent })

      expect(() => fs.readFile('/image.png')).toThrow('Cannot read binary file as text')
    })

    it('throws error when reading text file as binary', () => {
      const fs = createReadOnlyFileSystem({ 'text.txt': 'hello' })

      expect(() => fs.readBinaryFile!('/text.txt')).toThrow('Cannot read text file as binary')
    })

    it('throws error on writeBinaryFile (read-only)', () => {
      const fs = createReadOnlyFileSystem({})
      const binaryContent = new Uint8Array([0x00])

      expect(() => fs.writeBinaryFile!(binaryContent as unknown as string, binaryContent)).toThrow(
        'read-only'
      )
    })

    it('lists both text and binary files', () => {
      const binaryContent = new Uint8Array([0x89, 0x50])
      const fs = createReadOnlyFileSystem(
        { 'readme.txt': 'hello' },
        { 'image.png': binaryContent }
      )

      const entries = fs.listDirectory('/')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['image.png', 'readme.txt'])
    })

    it('creates directories from binary file paths', () => {
      const binaryContent = new Uint8Array([0x89, 0x50])
      const fs = createReadOnlyFileSystem({}, { 'images/logo.png': binaryContent })

      expect(fs.exists('/images')).toBe(true)
      expect(fs.isDirectory('/images')).toBe(true)
      expect(fs.exists('/images/logo.png')).toBe(true)
    })

    it('handles mixed text and binary files in same directory', () => {
      const binaryContent = new Uint8Array([0x89, 0x50])
      const fs = createReadOnlyFileSystem(
        { 'assets/style.css': 'body {}' },
        { 'assets/logo.png': binaryContent }
      )

      const entries = fs.listDirectory('/assets')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['logo.png', 'style.css'])
    })

    it('throws file not found for non-existent binary file', () => {
      const fs = createReadOnlyFileSystem({})

      expect(() => fs.readBinaryFile!('/missing.png')).toThrow('File not found')
    })
  })

  describe('path normalization', () => {
    it('handles paths with and without leading slash', () => {
      const fs = createReadOnlyFileSystem({ 'file.txt': 'content' })

      expect(fs.exists('/file.txt')).toBe(true)
      expect(fs.exists('file.txt')).toBe(true)
      expect(fs.readFile('/file.txt')).toBe('content')
      expect(fs.readFile('file.txt')).toBe('content')
    })

    it('handles binary paths with and without leading slash', () => {
      const binaryContent = new Uint8Array([0x00])
      const fs = createReadOnlyFileSystem({}, { 'image.png': binaryContent })

      expect(fs.exists('/image.png')).toBe(true)
      expect(fs.exists('image.png')).toBe(true)
      expect(fs.isBinaryFile!('/image.png')).toBe(true)
      expect(fs.isBinaryFile!('image.png')).toBe(true)
    })
  })

  describe('directory operations', () => {
    it('getCurrentDirectory returns root', () => {
      const fs = createReadOnlyFileSystem({})
      expect(fs.getCurrentDirectory()).toBe('/')
    })

    it('setCurrentDirectory is a no-op (does not throw)', () => {
      const fs = createReadOnlyFileSystem({})
      expect(() => fs.setCurrentDirectory('/any/path')).not.toThrow()
    })

    it('lists root directory using empty string', () => {
      const fs = createReadOnlyFileSystem({ 'file.txt': 'content' })
      const entries = fs.listDirectory('')
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('file.txt')
    })

    it('returns empty array for non-existent directory', () => {
      const fs = createReadOnlyFileSystem({ 'file.txt': 'content' })
      const entries = fs.listDirectory('/nonexistent')
      expect(entries).toHaveLength(0)
    })

    it('lists nested directory contents correctly', () => {
      const fs = createReadOnlyFileSystem({
        'dir/file1.txt': 'content1',
        'dir/file2.txt': 'content2',
      })
      const entries = fs.listDirectory('/dir')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['file1.txt', 'file2.txt'])
    })

    it('exists returns false for non-existent paths', () => {
      const fs = createReadOnlyFileSystem({ 'file.txt': 'content' })
      expect(fs.exists('/missing.txt')).toBe(false)
      expect(fs.exists('/missing/dir')).toBe(false)
    })

    it('isFile returns false for non-existent files', () => {
      const fs = createReadOnlyFileSystem({ 'file.txt': 'content' })
      expect(fs.isFile('/missing.txt')).toBe(false)
    })

    it('isDirectory returns false for non-existent directories', () => {
      const fs = createReadOnlyFileSystem({})
      expect(fs.isDirectory('/missing')).toBe(false)
    })
  })

  describe('binary extension detection', () => {
    it('detects various binary extensions', () => {
      // Test with files that have binary extensions but aren't in the binaries map
      const fs = createReadOnlyFileSystem({})

      // Should detect as binary by extension (not in any map)
      expect(fs.isBinaryFile!('/file.png')).toBe(true)
      expect(fs.isBinaryFile!('/file.jpg')).toBe(true)
      expect(fs.isBinaryFile!('/file.jpeg')).toBe(true)
      expect(fs.isBinaryFile!('/file.gif')).toBe(true)
      expect(fs.isBinaryFile!('/file.mp3')).toBe(true)
      expect(fs.isBinaryFile!('/file.wav')).toBe(true)
      expect(fs.isBinaryFile!('/file.pdf')).toBe(true)
      expect(fs.isBinaryFile!('/file.zip')).toBe(true)
    })

    it('handles files without extension', () => {
      const fs = createReadOnlyFileSystem({ 'noextension': 'content' })
      expect(fs.isBinaryFile!('/noextension')).toBe(false)
    })

    it('handles files with uppercase extensions', () => {
      const fs = createReadOnlyFileSystem({})
      expect(fs.isBinaryFile!('/file.PNG')).toBe(true)
      expect(fs.isBinaryFile!('/file.JPG')).toBe(true)
    })

    it('text file in files map is not binary', () => {
      const fs = createReadOnlyFileSystem({ 'image.png': 'not actually binary' })
      // When file is in files map, isBinaryFile should check binaries first
      // Since it's in files (not binaries), it's not binary
      expect(fs.isBinaryFile!('/image.png')).toBe(false)
    })
  })

  describe('sorting in listDirectory', () => {
    it('sorts directories before files', () => {
      const fs = createReadOnlyFileSystem({
        'z_file.txt': 'content',
        'a_dir/nested.txt': 'nested',
      })
      const entries = fs.listDirectory('/')
      expect(entries[0].name).toBe('a_dir')
      expect(entries[0].type).toBe('directory')
      expect(entries[1].name).toBe('z_file.txt')
      expect(entries[1].type).toBe('file')
    })

    it('sorts files alphabetically within their group', () => {
      const fs = createReadOnlyFileSystem({
        'c.txt': 'c',
        'a.txt': 'a',
        'b.txt': 'b',
      })
      const entries = fs.listDirectory('/')
      expect(entries.map((e) => e.name)).toEqual(['a.txt', 'b.txt', 'c.txt'])
    })

    it('sorts directories alphabetically within their group', () => {
      const fs = createReadOnlyFileSystem({
        'zebra/file.txt': 'z',
        'alpha/file.txt': 'a',
        'beta/file.txt': 'b',
      })
      const entries = fs.listDirectory('/')
      expect(entries.map((e) => e.name)).toEqual(['alpha', 'beta', 'zebra'])
    })
  })

  describe('deep nesting', () => {
    it('handles deeply nested file paths', () => {
      const fs = createReadOnlyFileSystem({
        'a/b/c/d/e/file.txt': 'deep content',
      })

      expect(fs.exists('/a')).toBe(true)
      expect(fs.exists('/a/b')).toBe(true)
      expect(fs.exists('/a/b/c')).toBe(true)
      expect(fs.exists('/a/b/c/d')).toBe(true)
      expect(fs.exists('/a/b/c/d/e')).toBe(true)
      expect(fs.exists('/a/b/c/d/e/file.txt')).toBe(true)

      expect(fs.isDirectory('/a/b/c/d/e')).toBe(true)
      expect(fs.isFile('/a/b/c/d/e/file.txt')).toBe(true)
    })

    it('lists subdirectory contents at any depth', () => {
      const fs = createReadOnlyFileSystem({
        'a/b/file1.txt': 'content1',
        'a/b/file2.txt': 'content2',
      })

      const entries = fs.listDirectory('/a/b')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['file1.txt', 'file2.txt'])
    })
  })

  describe('empty filesystem', () => {
    it('handles empty filesystem correctly', () => {
      const fs = createReadOnlyFileSystem({})

      expect(fs.listDirectory('/')).toHaveLength(0)
      expect(fs.exists('/anything')).toBe(false)
      expect(fs.isFile('/anything')).toBe(false)
      expect(fs.isDirectory('/anything')).toBe(false)
    })

    it('root directory always exists', () => {
      const fs = createReadOnlyFileSystem({})

      expect(fs.isDirectory('')).toBe(true)
      expect(fs.isDirectory('/')).toBe(true) // '/' normalizes to '' which is root
    })
  })
})
