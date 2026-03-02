import { describe, it, expect, beforeEach, vi } from 'vitest'
import { CompositeFileSystem } from '../src/CompositeFileSystem'
import type { IFileSystem, FileEntry } from '../src/types'

/**
 * Create a mock filesystem for testing.
 */
function createMockFileSystem(
  files: Record<string, string> = {},
  directories: string[] = ['/']
): IFileSystem {
  let cwd = '/'
  const fileMap = new Map(Object.entries(files))
  const dirSet = new Set(directories)

  return {
    getCurrentDirectory: vi.fn(() => cwd),
    setCurrentDirectory: vi.fn((path: string) => {
      if (!dirSet.has(path)) {
        throw new Error(`Directory not found: ${path}`)
      }
      cwd = path
    }),
    exists: vi.fn((path: string) => fileMap.has(path) || dirSet.has(path)),
    isDirectory: vi.fn((path: string) => dirSet.has(path)),
    isFile: vi.fn((path: string) => fileMap.has(path)),
    listDirectory: vi.fn((path: string) => {
      if (!dirSet.has(path)) {
        throw new Error(`Directory not found: ${path}`)
      }
      const entries: FileEntry[] = []
      const prefix = path === '/' ? '/' : `${path}/`

      for (const filePath of fileMap.keys()) {
        if (filePath.startsWith(prefix) && !filePath.slice(prefix.length).includes('/')) {
          entries.push({
            name: filePath.slice(prefix.length),
            type: 'file',
            path: filePath,
          })
        }
      }

      for (const dir of dirSet) {
        if (dir !== path && dir.startsWith(prefix) && !dir.slice(prefix.length).includes('/')) {
          entries.push({
            name: dir.slice(prefix.length),
            type: 'directory',
            path: dir,
          })
        }
      }

      return entries
    }),
    readFile: vi.fn((path: string) => {
      const content = fileMap.get(path)
      if (content === undefined) {
        throw new Error(`File not found: ${path}`)
      }
      return content
    }),
    writeFile: vi.fn((path: string, content: string) => {
      fileMap.set(path, content)
    }),
    createDirectory: vi.fn((path: string) => {
      if (dirSet.has(path)) {
        throw new Error(`Directory already exists: ${path}`)
      }
      dirSet.add(path)
    }),
    delete: vi.fn((path: string) => {
      if (fileMap.has(path)) {
        fileMap.delete(path)
      } else if (dirSet.has(path)) {
        dirSet.delete(path)
      } else {
        throw new Error(`Path not found: ${path}`)
      }
    }),
  }
}

describe('CompositeFileSystem', () => {
  describe('constructor', () => {
    it('creates with no mounts', () => {
      const cfs = new CompositeFileSystem()
      expect(cfs.getMounts()).toHaveLength(0)
      expect(cfs.getCurrentDirectory()).toBe('/')
    })

    it('creates with initial mounts', () => {
      const mockFs = createMockFileSystem()
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/my-files', filesystem: mockFs, name: 'my-files' }],
      })
      expect(cfs.getMounts()).toHaveLength(1)
    })

    it('creates with initial cwd', () => {
      const mockFs = createMockFileSystem()
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/my-files', filesystem: mockFs, name: 'my-files' }],
        initialCwd: '/my-files',
      })
      expect(cfs.getCurrentDirectory()).toBe('/my-files')
    })
  })

  describe('mount/unmount', () => {
    it('mounts a filesystem', () => {
      const cfs = new CompositeFileSystem()
      const mockFs = createMockFileSystem()

      cfs.mount({ mountPath: '/project', filesystem: mockFs, name: 'project' })

      expect(cfs.getMounts()).toHaveLength(1)
      expect(cfs.getMounts()[0].mountPath).toBe('/project')
    })

    it('normalizes mount path', () => {
      const cfs = new CompositeFileSystem()
      const mockFs = createMockFileSystem()

      cfs.mount({ mountPath: '/project/', filesystem: mockFs, name: 'project' })

      expect(cfs.getMounts()[0].mountPath).toBe('/project')
    })

    it('throws when mounting at root', () => {
      const cfs = new CompositeFileSystem()
      const mockFs = createMockFileSystem()

      expect(() => {
        cfs.mount({ mountPath: '/', filesystem: mockFs, name: 'root' })
      }).toThrow('Cannot mount at root path')
    })

    it('throws when mounting at nested path', () => {
      const cfs = new CompositeFileSystem()
      const mockFs = createMockFileSystem()

      expect(() => {
        cfs.mount({ mountPath: '/a/b', filesystem: mockFs, name: 'nested' })
      }).toThrow('Mount path must be at root level')
    })

    it('throws when mount path already in use', () => {
      const cfs = new CompositeFileSystem()
      const mockFs1 = createMockFileSystem()
      const mockFs2 = createMockFileSystem()

      cfs.mount({ mountPath: '/project', filesystem: mockFs1, name: 'project1' })

      expect(() => {
        cfs.mount({ mountPath: '/project', filesystem: mockFs2, name: 'project2' })
      }).toThrow('Mount path already in use')
    })

    it('unmounts a filesystem', () => {
      const cfs = new CompositeFileSystem()
      const mockFs = createMockFileSystem()

      cfs.mount({ mountPath: '/project', filesystem: mockFs, name: 'project' })
      cfs.unmount('/project')

      expect(cfs.getMounts()).toHaveLength(0)
    })

    it('throws when unmounting non-existent mount', () => {
      const cfs = new CompositeFileSystem()

      expect(() => {
        cfs.unmount('/nonexistent')
      }).toThrow('No filesystem mounted at')
    })

    it('resets cwd to root when unmounting current directory mount', () => {
      const mockFs = createMockFileSystem()
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
        initialCwd: '/project',
      })

      cfs.unmount('/project')

      expect(cfs.getCurrentDirectory()).toBe('/')
    })

    it('resets cwd to root when unmounting parent of cwd', () => {
      const mockFs = createMockFileSystem({}, ['/', '/src'])
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })

      cfs.setCurrentDirectory('/project/src')
      cfs.unmount('/project')

      expect(cfs.getCurrentDirectory()).toBe('/')
    })
  })

  describe('virtual root', () => {
    let cfs: CompositeFileSystem
    let mockFs1: IFileSystem
    let mockFs2: IFileSystem

    beforeEach(() => {
      mockFs1 = createMockFileSystem({ '/file1.txt': 'content1' })
      mockFs2 = createMockFileSystem({ '/file2.txt': 'content2' })
      cfs = new CompositeFileSystem({
        mounts: [
          { mountPath: '/my-files', filesystem: mockFs1, name: 'my-files' },
          { mountPath: '/project', filesystem: mockFs2, name: 'project' },
        ],
      })
    })

    it('root exists', () => {
      expect(cfs.exists('/')).toBe(true)
    })

    it('root is a directory', () => {
      expect(cfs.isDirectory('/')).toBe(true)
    })

    it('root is not a file', () => {
      expect(cfs.isFile('/')).toBe(false)
    })

    it('listDirectory at root returns all mounts', () => {
      const entries = cfs.listDirectory('/')

      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['my-files', 'project'])
      expect(entries.every((e) => e.type === 'directory')).toBe(true)
    })

    it('listDirectory at root returns sorted entries', () => {
      const entries = cfs.listDirectory('/')
      const names = entries.map((e) => e.name)

      expect(names).toEqual([...names].sort())
    })

    it('throws when trying to readFile at root', () => {
      expect(() => cfs.readFile('/')).toThrow('Cannot read directory as file')
    })

    it('throws when trying to writeFile at root', () => {
      expect(() => cfs.writeFile('/', 'content')).toThrow('Cannot write to root')
    })

    it('throws when trying to createDirectory at root', () => {
      expect(() => cfs.createDirectory('/')).toThrow('Cannot create directory at root')
    })

    it('throws when trying to delete root', () => {
      expect(() => cfs.delete('/')).toThrow('Cannot delete root')
    })

    it('throws when trying to create file at root level', () => {
      expect(() => cfs.writeFile('/newfile.txt', 'content')).toThrow(
        'Cannot create files at root level'
      )
    })

    it('throws when trying to create directory at root level', () => {
      expect(() => cfs.createDirectory('/newdir')).toThrow(
        'Cannot create directory at root level'
      )
    })
  })

  describe('mount point operations', () => {
    let cfs: CompositeFileSystem
    let mockFs: IFileSystem

    beforeEach(() => {
      mockFs = createMockFileSystem({ '/readme.txt': 'Hello' }, ['/', '/src'])
      cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })
    })

    it('mount point exists', () => {
      expect(cfs.exists('/project')).toBe(true)
    })

    it('mount point is a directory', () => {
      expect(cfs.isDirectory('/project')).toBe(true)
    })

    it('mount point is not a file', () => {
      expect(cfs.isFile('/project')).toBe(false)
    })

    it('can cd to mount point', () => {
      cfs.setCurrentDirectory('/project')
      expect(cfs.getCurrentDirectory()).toBe('/project')
    })

    it('throws when trying to readFile on mount point', () => {
      expect(() => cfs.readFile('/project')).toThrow('Cannot read directory as file')
    })

    it('throws when trying to writeFile to mount point', () => {
      expect(() => cfs.writeFile('/project', 'content')).toThrow('Cannot write to mount point')
    })

    it('throws when trying to delete mount point', () => {
      expect(() => cfs.delete('/project')).toThrow('Cannot delete mount point')
    })
  })

  describe('path resolution', () => {
    let cfs: CompositeFileSystem
    let mockFs: IFileSystem

    beforeEach(() => {
      mockFs = createMockFileSystem(
        { '/readme.txt': 'Hello', '/src/main.lua': 'print("hi")' },
        ['/', '/src']
      )
      cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })
    })

    it('resolves absolute paths', () => {
      expect(cfs.exists('/project/readme.txt')).toBe(true)
      expect(mockFs.exists).toHaveBeenCalledWith('/readme.txt')
    })

    it('resolves relative paths from cwd', () => {
      cfs.setCurrentDirectory('/project')
      expect(cfs.exists('readme.txt')).toBe(true)
    })

    it('resolves paths with ..', () => {
      cfs.setCurrentDirectory('/project/src')
      expect(cfs.exists('../readme.txt')).toBe(true)
    })

    it('resolves paths with .', () => {
      cfs.setCurrentDirectory('/project')
      expect(cfs.exists('./readme.txt')).toBe(true)
    })
  })

  describe('filesystem delegation', () => {
    let cfs: CompositeFileSystem
    let mockFs: IFileSystem

    beforeEach(() => {
      mockFs = createMockFileSystem(
        { '/readme.txt': 'Hello', '/src/main.lua': 'print("hi")' },
        ['/', '/src']
      )
      cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })
    })

    it('delegates exists to correct mount', () => {
      expect(cfs.exists('/project/readme.txt')).toBe(true)
      expect(mockFs.exists).toHaveBeenCalledWith('/readme.txt')
    })

    it('delegates isDirectory to correct mount', () => {
      expect(cfs.isDirectory('/project/src')).toBe(true)
      expect(mockFs.isDirectory).toHaveBeenCalledWith('/src')
    })

    it('delegates isFile to correct mount', () => {
      expect(cfs.isFile('/project/readme.txt')).toBe(true)
      expect(mockFs.isFile).toHaveBeenCalledWith('/readme.txt')
    })

    it('delegates readFile to correct mount', () => {
      expect(cfs.readFile('/project/readme.txt')).toBe('Hello')
      expect(mockFs.readFile).toHaveBeenCalledWith('/readme.txt')
    })

    it('delegates writeFile to correct mount', () => {
      cfs.writeFile('/project/new.txt', 'content')
      expect(mockFs.writeFile).toHaveBeenCalledWith('/new.txt', 'content')
    })

    it('delegates createDirectory to correct mount', () => {
      cfs.createDirectory('/project/newdir')
      expect(mockFs.createDirectory).toHaveBeenCalledWith('/newdir')
    })

    it('delegates delete to correct mount', () => {
      cfs.delete('/project/readme.txt')
      expect(mockFs.delete).toHaveBeenCalledWith('/readme.txt')
    })

    it('delegates listDirectory to correct mount', () => {
      cfs.listDirectory('/project')
      expect(mockFs.listDirectory).toHaveBeenCalledWith('/')
    })

    it('translates paths in listDirectory results', () => {
      const entries = cfs.listDirectory('/project')
      const filePaths = entries.filter((e) => e.type === 'file').map((e) => e.path)

      expect(filePaths).toContain('/project/readme.txt')
    })

    it('delegates setCurrentDirectory validation', () => {
      cfs.setCurrentDirectory('/project/src')
      expect(cfs.getCurrentDirectory()).toBe('/project/src')
    })

    it('throws for setCurrentDirectory on non-directory', () => {
      expect(() => cfs.setCurrentDirectory('/project/readme.txt')).toThrow('Not a directory')
    })
  })

  describe('multiple mounts', () => {
    let cfs: CompositeFileSystem
    let mockFs1: IFileSystem
    let mockFs2: IFileSystem

    beforeEach(() => {
      mockFs1 = createMockFileSystem({ '/file1.txt': 'content1' })
      mockFs2 = createMockFileSystem({ '/file2.txt': 'content2' })
      cfs = new CompositeFileSystem({
        mounts: [
          { mountPath: '/workspace1', filesystem: mockFs1, name: 'workspace1' },
          { mountPath: '/workspace2', filesystem: mockFs2, name: 'workspace2' },
        ],
      })
    })

    it('routes to correct mount based on path', () => {
      expect(cfs.readFile('/workspace1/file1.txt')).toBe('content1')
      expect(cfs.readFile('/workspace2/file2.txt')).toBe('content2')
    })

    it('isolates filesystems from each other', () => {
      expect(cfs.exists('/workspace1/file1.txt')).toBe(true)
      expect(cfs.exists('/workspace1/file2.txt')).toBe(false)
      expect(cfs.exists('/workspace2/file1.txt')).toBe(false)
      expect(cfs.exists('/workspace2/file2.txt')).toBe(true)
    })

    it('can navigate between mounts', () => {
      cfs.setCurrentDirectory('/workspace1')
      expect(cfs.readFile('file1.txt')).toBe('content1')

      cfs.setCurrentDirectory('/workspace2')
      expect(cfs.readFile('file2.txt')).toBe('content2')
    })
  })

  describe('unmounted paths', () => {
    let cfs: CompositeFileSystem

    beforeEach(() => {
      const mockFs = createMockFileSystem()
      cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })
    })

    it('exists returns false for unmounted paths', () => {
      expect(cfs.exists('/nonexistent')).toBe(false)
      expect(cfs.exists('/nonexistent/file.txt')).toBe(false)
    })

    it('isDirectory returns false for unmounted paths', () => {
      expect(cfs.isDirectory('/nonexistent')).toBe(false)
    })

    it('isFile returns false for unmounted paths', () => {
      expect(cfs.isFile('/nonexistent')).toBe(false)
    })

    it('throws for readFile on unmounted path', () => {
      expect(() => cfs.readFile('/nonexistent/file.txt')).toThrow('File not found')
    })

    it('throws for writeFile on unmounted path', () => {
      expect(() => cfs.writeFile('/nonexistent/file.txt', 'content')).toThrow(
        'Path not within any mounted workspace'
      )
    })

    it('throws for createDirectory on unmounted path', () => {
      expect(() => cfs.createDirectory('/nonexistent/dir')).toThrow(
        'Path not within any mounted workspace'
      )
    })

    it('throws for delete on unmounted path', () => {
      expect(() => cfs.delete('/nonexistent/file.txt')).toThrow('Path not found')
    })

    it('throws for listDirectory on unmounted path', () => {
      expect(() => cfs.listDirectory('/nonexistent')).toThrow('Directory not found')
    })

    it('throws for setCurrentDirectory on unmounted path', () => {
      expect(() => cfs.setCurrentDirectory('/nonexistent')).toThrow('Directory not found')
    })
  })

  describe('readonly mounts', () => {
    let cfs: CompositeFileSystem
    let mockFs: IFileSystem

    beforeEach(() => {
      mockFs = createMockFileSystem({ '/readme.txt': 'Hello' }, ['/', '/src'])
      cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/readonly', filesystem: mockFs, name: 'readonly', readonly: true }],
      })
    })

    it('allows read operations on readonly mount', () => {
      expect(cfs.exists('/readonly/readme.txt')).toBe(true)
      expect(cfs.readFile('/readonly/readme.txt')).toBe('Hello')
      expect(cfs.listDirectory('/readonly')).toBeDefined()
    })

    it('throws for writeFile on readonly mount', () => {
      expect(() => cfs.writeFile('/readonly/new.txt', 'content')).toThrow('read-only')
    })

    it('throws for createDirectory on readonly mount', () => {
      expect(() => cfs.createDirectory('/readonly/newdir')).toThrow('read-only')
    })

    it('throws for delete on readonly mount', () => {
      expect(() => cfs.delete('/readonly/readme.txt')).toThrow('read-only')
    })
  })

  describe('edge cases', () => {
    it('handles empty mounts list', () => {
      const cfs = new CompositeFileSystem()

      expect(cfs.listDirectory('/')).toEqual([])
      expect(cfs.exists('/')).toBe(true)
      expect(cfs.isDirectory('/')).toBe(true)
    })

    it('handles paths with trailing slashes', () => {
      const mockFs = createMockFileSystem({ '/file.txt': 'content' })
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })

      expect(cfs.exists('/project/')).toBe(true)
      expect(cfs.listDirectory('/project/')).toBeDefined()
    })

    it('handles relative paths at root', () => {
      const mockFs = createMockFileSystem({ '/file.txt': 'content' })
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
      })

      expect(cfs.exists('project')).toBe(true)
      expect(cfs.exists('project/file.txt')).toBe(true)
    })

    it('handles cd / from within mount', () => {
      const mockFs = createMockFileSystem({}, ['/', '/src'])
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
        initialCwd: '/project/src',
      })

      cfs.setCurrentDirectory('/')
      expect(cfs.getCurrentDirectory()).toBe('/')
    })

    it('handles navigation above mount boundary', () => {
      const mockFs = createMockFileSystem({}, ['/', '/src'])
      const cfs = new CompositeFileSystem({
        mounts: [{ mountPath: '/project', filesystem: mockFs, name: 'project' }],
        initialCwd: '/project/src',
      })

      // ../.. from /project/src should go to /
      cfs.setCurrentDirectory('../..')
      expect(cfs.getCurrentDirectory()).toBe('/')
    })
  })

})
