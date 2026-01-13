import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createVirtualFileSystem, type VirtualFileSystemExtended } from './virtualFileSystemFactory'

// Mock the storage module
vi.mock('./virtualFileSystemStorage', () => {
  // Per-workspace storage simulation
  const workspaceFiles = new Map<string, Map<string, object>>()
  const workspaceFolders = new Map<string, Set<string>>()

  function getFilesMap(workspaceId: string): Map<string, object> {
    if (!workspaceFiles.has(workspaceId)) {
      workspaceFiles.set(workspaceId, new Map())
    }
    return workspaceFiles.get(workspaceId)!
  }

  function getFoldersSet(workspaceId: string): Set<string> {
    if (!workspaceFolders.has(workspaceId)) {
      workspaceFolders.set(workspaceId, new Set())
    }
    return workspaceFolders.get(workspaceId)!
  }

  return {
    storeFile: vi.fn(
      async (
        workspaceId: string,
        path: string,
        content: string | Uint8Array,
        isBinary: boolean
      ) => {
        const files = getFilesMap(workspaceId)
        const existing = files.get(path) as { createdAt?: number } | undefined
        const now = Date.now()
        files.set(path, {
          key: `${workspaceId}:${path}`,
          workspaceId,
          path,
          content,
          isBinary,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
        })
      }
    ),

    getFile: vi.fn(async (workspaceId: string, path: string) => {
      const files = getFilesMap(workspaceId)
      return files.get(path) ?? null
    }),

    deleteFile: vi.fn(async (workspaceId: string, path: string) => {
      const files = getFilesMap(workspaceId)
      files.delete(path)
    }),

    getAllFilesForWorkspace: vi.fn(async (workspaceId: string) => {
      const files = getFilesMap(workspaceId)
      return new Map(files)
    }),

    storeFolder: vi.fn(async (workspaceId: string, path: string) => {
      const folders = getFoldersSet(workspaceId)
      folders.add(path)
    }),

    deleteFolder: vi.fn(async (workspaceId: string, path: string) => {
      const folders = getFoldersSet(workspaceId)
      folders.delete(path)
    }),

    getAllFoldersForWorkspace: vi.fn(async (workspaceId: string) => {
      const folders = getFoldersSet(workspaceId)
      return new Set(folders)
    }),

    deleteWorkspaceData: vi.fn(async (workspaceId: string) => {
      workspaceFiles.delete(workspaceId)
      workspaceFolders.delete(workspaceId)
    }),

    // For test cleanup
    __clearAll: () => {
      workspaceFiles.clear()
      workspaceFolders.clear()
    },
  }
})

// Import the mock to access __clearAll
import * as storage from './virtualFileSystemStorage'

describe('createVirtualFileSystem', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(storage as unknown as { __clearAll: () => void }).__clearAll()
  })

  describe('initialization', () => {
    it('creates a filesystem with root directory', async () => {
      const fs = createVirtualFileSystem('test-workspace')
      await fs.initialize()

      expect(fs.exists('/')).toBe(true)
      expect(fs.isDirectory('/')).toBe(true)
    })

    it('starts with current directory as root', async () => {
      const fs = createVirtualFileSystem('test-workspace')
      await fs.initialize()

      expect(fs.getCurrentDirectory()).toBe('/')
    })

    it('creates isolated filesystems per workspace ID', async () => {
      const fs1 = createVirtualFileSystem('workspace-1')
      const fs2 = createVirtualFileSystem('workspace-2')
      await fs1.initialize()
      await fs2.initialize()

      fs1.writeFile('/file1.txt', 'content1')
      fs2.writeFile('/file2.txt', 'content2')

      expect(fs1.exists('/file1.txt')).toBe(true)
      expect(fs1.exists('/file2.txt')).toBe(false)
      expect(fs2.exists('/file1.txt')).toBe(false)
      expect(fs2.exists('/file2.txt')).toBe(true)
    })

    it('tracks initialization state', async () => {
      const fs = createVirtualFileSystem('test')

      expect(fs.isInitialized).toBe(false)

      await fs.initialize()

      expect(fs.isInitialized).toBe(true)
    })
  })

  describe('directory operations', () => {
    let fs: VirtualFileSystemExtended

    beforeEach(async () => {
      fs = createVirtualFileSystem('test')
      await fs.initialize()
    })

    it('can create directories', () => {
      fs.createDirectory('/projects')

      expect(fs.exists('/projects')).toBe(true)
      expect(fs.isDirectory('/projects')).toBe(true)
    })

    it('can create nested directories', () => {
      fs.createDirectory('/projects')
      fs.createDirectory('/projects/app')

      expect(fs.exists('/projects/app')).toBe(true)
      expect(fs.isDirectory('/projects/app')).toBe(true)
    })

    it('throws when creating directory without parent', () => {
      expect(() => fs.createDirectory('/a/b/c')).toThrow('Parent directory not found')
    })

    it('throws when creating directory that already exists', () => {
      fs.createDirectory('/test')

      expect(() => fs.createDirectory('/test')).toThrow('Path already exists')
    })

    it('can set and get current directory', () => {
      fs.createDirectory('/src')
      fs.setCurrentDirectory('/src')

      expect(fs.getCurrentDirectory()).toBe('/src')
    })

    it('throws when setting current directory to non-existent path', () => {
      expect(() => fs.setCurrentDirectory('/nonexistent')).toThrow('Directory not found')
    })

    it('can list directory contents', () => {
      fs.createDirectory('/src')
      fs.createDirectory('/docs')
      fs.writeFile('/README.md', '# Project')

      const entries = fs.listDirectory('/')

      expect(entries).toHaveLength(3)
      expect(entries.map((e) => e.name).sort()).toEqual(['README.md', 'docs', 'src'])
    })

    it('throws when listing non-existent directory', () => {
      expect(() => fs.listDirectory('/nonexistent')).toThrow('Directory not found')
    })

    it('can delete empty directories', () => {
      fs.createDirectory('/empty')
      fs.delete('/empty')

      expect(fs.exists('/empty')).toBe(false)
    })

    it('throws when deleting non-empty directory', () => {
      fs.createDirectory('/notempty')
      fs.writeFile('/notempty/file.txt', 'content')

      expect(() => fs.delete('/notempty')).toThrow('Directory not empty')
    })

    it('throws when deleting directory containing subdirectory', () => {
      fs.createDirectory('/parent')
      fs.createDirectory('/parent/child')

      expect(() => fs.delete('/parent')).toThrow('Directory not empty')
    })

    it('throws when deleting directory containing nested subdirectory', () => {
      fs.createDirectory('/parent')
      fs.createDirectory('/parent/child')
      fs.createDirectory('/parent/child/grandchild')

      expect(() => fs.delete('/parent')).toThrow('Directory not empty')
    })

    it('allows deleting empty directory that had sibling with same prefix', () => {
      fs.createDirectory('/folder')
      fs.createDirectory('/folder-extra')

      fs.delete('/folder')

      expect(fs.exists('/folder')).toBe(false)
      expect(fs.exists('/folder-extra')).toBe(true)
    })
  })

  describe('file operations', () => {
    let fs: VirtualFileSystemExtended

    beforeEach(async () => {
      fs = createVirtualFileSystem('test')
      await fs.initialize()
    })

    it('can write and read files', () => {
      fs.writeFile('/hello.txt', 'Hello, World!')

      expect(fs.exists('/hello.txt')).toBe(true)
      expect(fs.isFile('/hello.txt')).toBe(true)
      expect(fs.readFile('/hello.txt')).toBe('Hello, World!')
    })

    it('can overwrite existing files', () => {
      fs.writeFile('/file.txt', 'original')
      fs.writeFile('/file.txt', 'updated')

      expect(fs.readFile('/file.txt')).toBe('updated')
    })

    it('throws when writing to non-existent parent directory', () => {
      expect(() => fs.writeFile('/noparent/file.txt', 'content')).toThrow(
        'Parent directory not found'
      )
    })

    it('throws when writing to a directory path', () => {
      fs.createDirectory('/dir')

      expect(() => fs.writeFile('/dir', 'content')).toThrow('Cannot write to directory')
    })

    it('throws when reading non-existent file', () => {
      expect(() => fs.readFile('/nonexistent.txt')).toThrow('File not found')
    })

    it('can delete files', () => {
      fs.writeFile('/deleteme.txt', 'content')
      fs.delete('/deleteme.txt')

      expect(fs.exists('/deleteme.txt')).toBe(false)
    })

    it('throws when deleting non-existent path', () => {
      expect(() => fs.delete('/nonexistent')).toThrow('Path not found')
    })
  })

  describe('relative path resolution', () => {
    let fs: VirtualFileSystemExtended

    beforeEach(async () => {
      fs = createVirtualFileSystem('test')
      await fs.initialize()
    })

    it('resolves relative paths from current directory', () => {
      fs.createDirectory('/src')
      fs.setCurrentDirectory('/src')
      fs.writeFile('file.txt', 'content')

      expect(fs.exists('/src/file.txt')).toBe(true)
      expect(fs.readFile('file.txt')).toBe('content')
    })

    it('handles parent directory references', () => {
      fs.createDirectory('/src')
      fs.writeFile('/root.txt', 'root content')
      fs.setCurrentDirectory('/src')

      expect(fs.readFile('../root.txt')).toBe('root content')
    })
  })

  describe('binary file support', () => {
    let fs: VirtualFileSystemExtended

    beforeEach(async () => {
      fs = createVirtualFileSystem('test')
      await fs.initialize()
    })

    it('can write and read binary files', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])

      fs.writeBinaryFile('/image.png', binaryContent)

      expect(fs.exists('/image.png')).toBe(true)
      expect(fs.isFile('/image.png')).toBe(true)
      expect(fs.isBinaryFile('/image.png')).toBe(true)
      const readContent = fs.readBinaryFile('/image.png')
      expect(readContent).not.toBeNull()
      expect(readContent).toEqual(binaryContent)
    })

    it('detects binary files by extension', () => {
      expect(fs.isBinaryFile('/image.png')).toBe(true)
      expect(fs.isBinaryFile('/audio.mp3')).toBe(true)
      expect(fs.isBinaryFile('/code.lua')).toBe(false)
      expect(fs.isBinaryFile('/text.txt')).toBe(false)
    })

    it('throws when reading binary file as text', () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      fs.writeBinaryFile('/image.png', binaryContent)

      expect(() => fs.readFile('/image.png')).toThrow('Cannot read binary file as text')
    })

    it('allows reading text files as binary', () => {
      fs.writeFile('/text.txt', 'Hello')

      const binary = fs.readBinaryFile('/text.txt')
      expect(binary).not.toBeNull()

      // Check it's a Uint8Array-like object (may be different constructor in test env)
      expect(binary!.constructor.name).toBe('Uint8Array')
      expect(new TextDecoder().decode(binary!)).toBe('Hello')
    })

    it('handles empty binary files', () => {
      const emptyBinary = new Uint8Array(0)
      fs.writeBinaryFile('/empty.bin', emptyBinary)

      const readContent = fs.readBinaryFile('/empty.bin')
      expect(readContent).not.toBeNull()
      expect(readContent).toEqual(emptyBinary)
    })

    it('returns null when reading non-existent binary file', () => {
      expect(fs.readBinaryFile('/nonexistent.bin')).toBeNull()
    })

    it('returns null instead of throwing for missing binary files', () => {
      // Ensure we don't have the file
      expect(fs.exists('/missing.png')).toBe(false)

      // Should return null, not throw
      const result = fs.readBinaryFile('/missing.png')
      expect(result).toBeNull()
    })

    it('throws when writing binary to non-existent parent', () => {
      const binaryContent = new Uint8Array([1, 2, 3])

      expect(() => fs.writeBinaryFile('/noparent/file.bin', binaryContent)).toThrow(
        'Parent directory not found'
      )
    })

    it('throws when writing binary to a directory', () => {
      fs.createDirectory('/dir')
      const binaryContent = new Uint8Array([1, 2, 3])

      expect(() => fs.writeBinaryFile('/dir', binaryContent)).toThrow(
        'Cannot write to directory'
      )
    })
  })

  describe('persistence via flush', () => {
    it('flushes pending operations to storage', async () => {
      const fs = createVirtualFileSystem('persist-test')
      await fs.initialize()

      fs.writeFile('/data.txt', 'persisted data')
      fs.createDirectory('/mydir')

      await fs.flush()

      expect(storage.storeFile).toHaveBeenCalledWith(
        'persist-test',
        '/data.txt',
        'persisted data',
        false
      )
      expect(storage.storeFolder).toHaveBeenCalledWith('persist-test', '/mydir')
    })

    it('flushes binary file operations', async () => {
      const fs = createVirtualFileSystem('binary-test')
      await fs.initialize()

      const binaryContent = new Uint8Array([1, 2, 3])
      fs.writeBinaryFile('/data.bin', binaryContent)

      await fs.flush()

      expect(storage.storeFile).toHaveBeenCalledWith(
        'binary-test',
        '/data.bin',
        binaryContent,
        true
      )
    })

    it('flushes delete operations', async () => {
      const fs = createVirtualFileSystem('delete-test')
      await fs.initialize()

      fs.writeFile('/file.txt', 'content')
      fs.createDirectory('/folder')
      await fs.flush()

      fs.delete('/file.txt')
      fs.delete('/folder')
      await fs.flush()

      expect(storage.deleteFile).toHaveBeenCalledWith('delete-test', '/file.txt')
      expect(storage.deleteFolder).toHaveBeenCalledWith('delete-test', '/folder')
    })

    it('restores files from storage on initialize', async () => {
      // First, create and persist some data
      const fs1 = createVirtualFileSystem('restore-test')
      await fs1.initialize()
      fs1.writeFile('/restored.txt', 'restored content')
      fs1.createDirectory('/restoredDir')
      await fs1.flush()

      // Create a new filesystem for the same workspace
      const fs2 = createVirtualFileSystem('restore-test')
      await fs2.initialize()

      // It should have the data from storage
      expect(fs2.exists('/restored.txt')).toBe(true)
      expect(fs2.readFile('/restored.txt')).toBe('restored content')
      expect(fs2.exists('/restoredDir')).toBe(true)
      expect(fs2.isDirectory('/restoredDir')).toBe(true)
    })
  })

  describe('edge cases', () => {
    let fs: VirtualFileSystemExtended

    beforeEach(async () => {
      fs = createVirtualFileSystem('test')
      await fs.initialize()
    })

    it('isFile returns false for directories', () => {
      fs.createDirectory('/dir')

      expect(fs.isFile('/dir')).toBe(false)
    })

    it('isDirectory returns false for files', () => {
      fs.writeFile('/file.txt', 'content')

      expect(fs.isDirectory('/file.txt')).toBe(false)
    })

    it('exists returns false for non-existent paths', () => {
      expect(fs.exists('/nonexistent')).toBe(false)
    })

    it('listDirectory returns sorted entries', () => {
      fs.writeFile('/zebra.txt', 'z')
      fs.writeFile('/apple.txt', 'a')
      fs.createDirectory('/banana')

      const entries = fs.listDirectory('/')
      const names = entries.map((e) => e.name)

      expect(names).toEqual(['apple.txt', 'banana', 'zebra.txt'])
    })

    it('listDirectory includes correct types', () => {
      fs.writeFile('/file.txt', 'content')
      fs.createDirectory('/dir')

      const entries = fs.listDirectory('/')
      const fileEntry = entries.find((e) => e.name === 'file.txt')
      const dirEntry = entries.find((e) => e.name === 'dir')

      expect(fileEntry?.type).toBe('file')
      expect(dirEntry?.type).toBe('directory')
    })
  })
})
