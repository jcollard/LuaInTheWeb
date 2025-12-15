/**
 * Tests for compositeFileSystemAdapter.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IFileSystem } from '@lua-learning/shell-core'
import { buildTreeFromFileSystem, createFileSystemAdapter } from './compositeFileSystemAdapter'

describe('compositeFileSystemAdapter', () => {
  const createMockFileSystem = (): IFileSystem => ({
    getCurrentDirectory: vi.fn(() => '/'),
    setCurrentDirectory: vi.fn(),
    exists: vi.fn(() => false),
    isDirectory: vi.fn(() => false),
    isFile: vi.fn(() => false),
    listDirectory: vi.fn(() => []),
    readFile: vi.fn(() => ''),
    writeFile: vi.fn(),
    createDirectory: vi.fn(),
    delete: vi.fn(),
  })

  describe('buildTreeFromFileSystem', () => {
    it('builds tree from root directory', () => {
      const mockFs = createMockFileSystem()
      vi.mocked(mockFs.listDirectory).mockImplementation((path: string) => {
        if (path === '/') {
          return [
            { name: 'home', type: 'directory', path: '/home' },
          ]
        }
        if (path === '/home') {
          return [
            { name: 'main.lua', type: 'file', path: '/home/main.lua' },
          ]
        }
        return []
      })

      const tree = buildTreeFromFileSystem(mockFs)

      expect(tree).toHaveLength(1)
      expect(tree[0].name).toBe('home')
      expect(tree[0].type).toBe('folder')
      expect(tree[0].isWorkspace).toBe(true)
      expect(tree[0].children).toHaveLength(1)
      expect(tree[0].children![0].name).toBe('main.lua')
      expect(tree[0].children![0].isWorkspace).toBeUndefined()
    })

    it('marks only root-level folders as workspaces', () => {
      const mockFs = createMockFileSystem()
      vi.mocked(mockFs.listDirectory).mockImplementation((path: string) => {
        if (path === '/') {
          return [
            { name: 'workspace', type: 'directory', path: '/workspace' },
          ]
        }
        if (path === '/workspace') {
          return [
            { name: 'subfolder', type: 'directory', path: '/workspace/subfolder' },
          ]
        }
        return []
      })

      const tree = buildTreeFromFileSystem(mockFs)

      expect(tree[0].isWorkspace).toBe(true)
      expect(tree[0].children![0].isWorkspace).toBe(false)
    })

    it('sorts folders before files, then alphabetically', () => {
      const mockFs = createMockFileSystem()
      vi.mocked(mockFs.listDirectory).mockImplementation((path: string) => {
        if (path === '/') {
          return [
            { name: 'zebra.lua', type: 'file', path: '/zebra.lua' },
            { name: 'beta', type: 'directory', path: '/beta' },
            { name: 'alpha.lua', type: 'file', path: '/alpha.lua' },
            { name: 'alpha', type: 'directory', path: '/alpha' },
          ]
        }
        return []
      })

      const tree = buildTreeFromFileSystem(mockFs)

      expect(tree.map((n) => n.name)).toEqual(['alpha', 'beta', 'alpha.lua', 'zebra.lua'])
    })

    it('handles empty directory', () => {
      const mockFs = createMockFileSystem()
      vi.mocked(mockFs.listDirectory).mockReturnValue([])

      const tree = buildTreeFromFileSystem(mockFs)

      expect(tree).toEqual([])
    })

    it('handles nested directories', () => {
      const mockFs = createMockFileSystem()
      vi.mocked(mockFs.listDirectory).mockImplementation((path: string) => {
        if (path === '/') {
          return [{ name: 'ws', type: 'directory', path: '/ws' }]
        }
        if (path === '/ws') {
          return [{ name: 'src', type: 'directory', path: '/ws/src' }]
        }
        if (path === '/ws/src') {
          return [{ name: 'main.lua', type: 'file', path: '/ws/src/main.lua' }]
        }
        return []
      })

      const tree = buildTreeFromFileSystem(mockFs)

      expect(tree[0].name).toBe('ws')
      expect(tree[0].isWorkspace).toBe(true)
      expect(tree[0].children![0].name).toBe('src')
      expect(tree[0].children![0].isWorkspace).toBe(false)
      expect(tree[0].children![0].children![0].name).toBe('main.lua')
    })
  })

  describe('createFileSystemAdapter', () => {
    let mockFs: IFileSystem

    beforeEach(() => {
      mockFs = createMockFileSystem()
    })

    describe('createFile', () => {
      it('calls writeFile with empty content by default', () => {
        const adapter = createFileSystemAdapter(mockFs)
        adapter.createFile('/test.lua')
        expect(mockFs.writeFile).toHaveBeenCalledWith('/test.lua', '')
      })

      it('calls writeFile with provided content', () => {
        const adapter = createFileSystemAdapter(mockFs)
        adapter.createFile('/test.lua', 'print("hello")')
        expect(mockFs.writeFile).toHaveBeenCalledWith('/test.lua', 'print("hello")')
      })
    })

    describe('readFile', () => {
      it('returns content when file exists', () => {
        vi.mocked(mockFs.exists).mockReturnValue(true)
        vi.mocked(mockFs.isDirectory).mockReturnValue(false)
        vi.mocked(mockFs.readFile).mockReturnValue('file content')

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.readFile('/test.lua')

        expect(result).toBe('file content')
      })

      it('returns null when file does not exist', () => {
        vi.mocked(mockFs.exists).mockReturnValue(false)

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.readFile('/missing.lua')

        expect(result).toBeNull()
      })

      it('returns null when path is a directory', () => {
        vi.mocked(mockFs.exists).mockReturnValue(true)
        vi.mocked(mockFs.isDirectory).mockReturnValue(true)

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.readFile('/folder')

        expect(result).toBeNull()
      })

      it('returns null on error', () => {
        vi.mocked(mockFs.exists).mockImplementation(() => {
          throw new Error('Read error')
        })

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.readFile('/error.lua')

        expect(result).toBeNull()
      })
    })

    describe('writeFile', () => {
      it('delegates to IFileSystem writeFile', () => {
        const adapter = createFileSystemAdapter(mockFs)
        adapter.writeFile('/test.lua', 'content')
        expect(mockFs.writeFile).toHaveBeenCalledWith('/test.lua', 'content')
      })
    })

    describe('deleteFile', () => {
      it('delegates to IFileSystem delete', () => {
        const adapter = createFileSystemAdapter(mockFs)
        adapter.deleteFile('/test.lua')
        expect(mockFs.delete).toHaveBeenCalledWith('/test.lua')
      })
    })

    describe('renameFile', () => {
      it('simulates rename by reading, writing, and deleting', () => {
        vi.mocked(mockFs.readFile).mockReturnValue('file content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.renameFile('/old.lua', '/new.lua')

        expect(mockFs.readFile).toHaveBeenCalledWith('/old.lua')
        expect(mockFs.writeFile).toHaveBeenCalledWith('/new.lua', 'file content')
        expect(mockFs.delete).toHaveBeenCalledWith('/old.lua')
      })
    })

    describe('moveFile', () => {
      it('moves a file to target folder', () => {
        vi.mocked(mockFs.isDirectory).mockReturnValue(false)
        vi.mocked(mockFs.readFile).mockReturnValue('content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.moveFile('/test.lua', '/folder')

        expect(mockFs.writeFile).toHaveBeenCalledWith('/folder/test.lua', 'content')
        expect(mockFs.delete).toHaveBeenCalledWith('/test.lua')
      })

      it('moves a file to root folder', () => {
        vi.mocked(mockFs.isDirectory).mockImplementation((path) => path === '/')
        vi.mocked(mockFs.readFile).mockReturnValue('content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.moveFile('/folder/test.lua', '/')

        expect(mockFs.writeFile).toHaveBeenCalledWith('/test.lua', 'content')
        expect(mockFs.delete).toHaveBeenCalledWith('/folder/test.lua')
      })
    })

    describe('createFolder', () => {
      it('delegates to IFileSystem createDirectory', () => {
        const adapter = createFileSystemAdapter(mockFs)
        adapter.createFolder('/newfolder')
        expect(mockFs.createDirectory).toHaveBeenCalledWith('/newfolder')
      })
    })

    describe('deleteFolder', () => {
      it('delegates to IFileSystem delete', () => {
        const adapter = createFileSystemAdapter(mockFs)
        adapter.deleteFolder('/folder')
        expect(mockFs.delete).toHaveBeenCalledWith('/folder')
      })
    })

    describe('exists', () => {
      it('delegates to IFileSystem exists', () => {
        vi.mocked(mockFs.exists).mockReturnValue(true)

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.exists('/test.lua')

        expect(result).toBe(true)
        expect(mockFs.exists).toHaveBeenCalledWith('/test.lua')
      })
    })

    describe('isDirectory', () => {
      it('delegates to IFileSystem isDirectory', () => {
        vi.mocked(mockFs.isDirectory).mockReturnValue(true)

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.isDirectory('/folder')

        expect(result).toBe(true)
        expect(mockFs.isDirectory).toHaveBeenCalledWith('/folder')
      })
    })

    describe('listDirectory', () => {
      it('returns array of names from IFileSystem listDirectory', () => {
        vi.mocked(mockFs.listDirectory).mockReturnValue([
          { name: 'file1.lua', type: 'file', path: '/file1.lua' },
          { name: 'folder', type: 'directory', path: '/folder' },
        ])

        const adapter = createFileSystemAdapter(mockFs)
        const result = adapter.listDirectory('/')

        expect(result).toEqual(['file1.lua', 'folder'])
      })
    })

    describe('getTree', () => {
      it('returns tree built from IFileSystem', () => {
        vi.mocked(mockFs.listDirectory).mockImplementation((path: string) => {
          if (path === '/') {
            return [{ name: 'workspace', type: 'directory', path: '/workspace' }]
          }
          return []
        })

        const adapter = createFileSystemAdapter(mockFs)
        const tree = adapter.getTree()

        expect(tree).toHaveLength(1)
        expect(tree[0].name).toBe('workspace')
        expect(tree[0].isWorkspace).toBe(true)
      })
    })

    describe('copyFile', () => {
      it('copies a file to target folder', () => {
        vi.mocked(mockFs.isDirectory).mockReturnValue(false)
        vi.mocked(mockFs.readFile).mockReturnValue('content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.copyFile('/test.lua', '/folder')

        // Should write to new location
        expect(mockFs.writeFile).toHaveBeenCalledWith('/folder/test.lua', 'content')
        // Should NOT delete original
        expect(mockFs.delete).not.toHaveBeenCalled()
      })

      it('copies a file to root folder', () => {
        vi.mocked(mockFs.isDirectory).mockImplementation((path) => path === '/')
        vi.mocked(mockFs.readFile).mockReturnValue('content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.copyFile('/folder/test.lua', '/')

        expect(mockFs.writeFile).toHaveBeenCalledWith('/test.lua', 'content')
        expect(mockFs.delete).not.toHaveBeenCalled()
      })

      it('copies a directory by creating directory and copying contents', () => {
        // Setup: /src is a directory with /src/file.lua
        vi.mocked(mockFs.isDirectory).mockImplementation((path) =>
          path === '/src' || path === '/dest'
        )
        vi.mocked(mockFs.listDirectory).mockImplementation((path) => {
          if (path === '/src') {
            return [{ name: 'file.lua', type: 'file', path: '/src/file.lua' }]
          }
          return []
        })
        vi.mocked(mockFs.readFile).mockReturnValue('content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.copyFile('/src', '/dest')

        // Should create directory in destination
        expect(mockFs.createDirectory).toHaveBeenCalledWith('/dest/src')
        // Should copy file contents
        expect(mockFs.writeFile).toHaveBeenCalledWith('/dest/src/file.lua', 'content')
      })

      it('copies a directory with nested structure', () => {
        // Setup: /src is a directory with /src/sub (directory) and /src/sub/file.lua
        vi.mocked(mockFs.isDirectory).mockImplementation((path) =>
          path === '/src' || path === '/src/sub' || path === '/dest'
        )
        vi.mocked(mockFs.listDirectory).mockImplementation((path) => {
          if (path === '/src') {
            return [{ name: 'sub', type: 'directory', path: '/src/sub' }]
          }
          if (path === '/src/sub') {
            return [{ name: 'file.lua', type: 'file', path: '/src/sub/file.lua' }]
          }
          return []
        })
        vi.mocked(mockFs.readFile).mockReturnValue('nested content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.copyFile('/src', '/dest')

        // Should create directories
        expect(mockFs.createDirectory).toHaveBeenCalledWith('/dest/src')
        expect(mockFs.createDirectory).toHaveBeenCalledWith('/dest/src/sub')
        // Should copy nested file
        expect(mockFs.writeFile).toHaveBeenCalledWith('/dest/src/sub/file.lua', 'nested content')
      })
    })

    describe('renameFolder', () => {
      it('renames folder by copying and deleting', () => {
        vi.mocked(mockFs.isDirectory).mockImplementation((path) => path === '/old')
        vi.mocked(mockFs.listDirectory).mockImplementation((path) => {
          if (path === '/old') {
            return [{ name: 'file.lua', type: 'file', path: '/old/file.lua' }]
          }
          return []
        })
        vi.mocked(mockFs.readFile).mockReturnValue('content')

        const adapter = createFileSystemAdapter(mockFs)
        adapter.renameFolder('/old', '/new')

        // Should create new directory
        expect(mockFs.createDirectory).toHaveBeenCalledWith('/new')
        // Should copy file to new location
        expect(mockFs.writeFile).toHaveBeenCalledWith('/new/file.lua', 'content')
        // Should delete old folder contents then folder
        expect(mockFs.delete).toHaveBeenCalledWith('/old/file.lua')
        expect(mockFs.delete).toHaveBeenCalledWith('/old')
      })
    })
  })
})
