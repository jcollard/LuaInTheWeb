import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCloneProject } from './useCloneProject'
import type { IFileSystem } from '@lua-learning/shell-core'
import type { Workspace } from './workspaceTypes'

function createMockFileSystem(files: Record<string, string | Uint8Array> = {}): IFileSystem & {
  isBinaryFile: (path: string) => boolean
  readBinaryFile: (path: string) => Uint8Array
  writeBinaryFile: (path: string, content: Uint8Array) => void
} {
  const written: Record<string, string | Uint8Array> = {}
  const dirs: string[] = []

  return {
    getCurrentDirectory: vi.fn(() => '/'),
    setCurrentDirectory: vi.fn(),
    exists: vi.fn(() => true),
    isDirectory: vi.fn(() => false),
    isFile: vi.fn(() => true),
    readFile: vi.fn((path: string) => {
      const content = files[path]
      return typeof content === 'string' ? content : ''
    }),
    writeFile: vi.fn((path: string, content: string) => {
      written[path] = content
    }),
    delete: vi.fn(),
    listDirectory: vi.fn((path: string) => {
      const entries: Array<{ name: string; path: string; type: 'file' | 'directory' }> = []
      const prefix = path.endsWith('/') ? path : path + '/'
      const seen = new Set<string>()
      for (const filePath of Object.keys(files)) {
        if (!filePath.startsWith(prefix)) continue
        const rest = filePath.slice(prefix.length)
        const parts = rest.split('/')
        const name = parts[0]
        if (seen.has(name)) continue
        seen.add(name)
        if (parts.length === 1) {
          entries.push({ name, path: filePath, type: 'file' })
        } else {
          entries.push({ name, path: prefix + name, type: 'directory' })
        }
      }
      return entries
    }),
    createDirectory: vi.fn((path: string) => { dirs.push(path) }),
    isBinaryFile: vi.fn(() => false),
    readBinaryFile: vi.fn(() => new Uint8Array()),
    writeBinaryFile: vi.fn(),
  }
}

describe('useCloneProject', () => {
  let sourceFs: ReturnType<typeof createMockFileSystem>
  let targetFs: ReturnType<typeof createMockFileSystem>
  const defaultParams = {
    compositeFileSystem: null as unknown as IFileSystem,
    addVirtualWorkspace: vi.fn(),
    addLocalWorkspace: vi.fn(),
    refreshFileTree: vi.fn(),
    showError: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    sourceFs = createMockFileSystem({
      '/projects/myapp/main.lua': 'print("hello")',
      '/projects/myapp/lib/utils.lua': 'return {}',
    })
    targetFs = createMockFileSystem()
    defaultParams.compositeFileSystem = sourceFs
    defaultParams.addVirtualWorkspace.mockResolvedValue({
      mountPath: '/myapp',
      filesystem: targetFs,
    } as unknown as Workspace)
    defaultParams.addLocalWorkspace.mockResolvedValue({
      mountPath: '/myapp',
      filesystem: targetFs,
    } as unknown as Workspace)
  })

  it('creates virtual workspace and copies files', async () => {
    const { result } = renderHook(() => useCloneProject(defaultParams))

    await act(async () => {
      await result.current.handleCloneProject('/projects/myapp', 'myapp', 'virtual')
    })

    expect(defaultParams.addVirtualWorkspace).toHaveBeenCalledWith('myapp')
    expect(sourceFs.listDirectory).toHaveBeenCalledWith('/projects/myapp')
    expect(targetFs.writeFile).toHaveBeenCalledWith('/main.lua', 'print("hello")')
    expect(targetFs.createDirectory).toHaveBeenCalledWith('/lib')
    expect(defaultParams.refreshFileTree).toHaveBeenCalled()
  })

  it('creates local workspace with handle and copies files', async () => {
    const mockHandle = { name: 'myapp' } as FileSystemDirectoryHandle
    const { result } = renderHook(() => useCloneProject(defaultParams))

    await act(async () => {
      await result.current.handleCloneProject('/projects/myapp', 'myapp', 'local', mockHandle)
    })

    expect(defaultParams.addLocalWorkspace).toHaveBeenCalledWith('myapp', mockHandle)
    expect(defaultParams.refreshFileTree).toHaveBeenCalled()
  })

  it('falls back to virtual workspace when type is local but no handle', async () => {
    const { result } = renderHook(() => useCloneProject(defaultParams))

    await act(async () => {
      await result.current.handleCloneProject('/projects/myapp', 'myapp', 'local')
    })

    expect(defaultParams.addVirtualWorkspace).toHaveBeenCalledWith('myapp')
  })

  it('copies binary files when binary support is available', async () => {
    const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
    sourceFs = createMockFileSystem({
      '/projects/myapp/image.png': 'binary-placeholder',
    })
    sourceFs.isBinaryFile = vi.fn(() => true)
    sourceFs.readBinaryFile = vi.fn(() => binaryContent)
    defaultParams.compositeFileSystem = sourceFs

    const { result } = renderHook(() => useCloneProject(defaultParams))

    await act(async () => {
      await result.current.handleCloneProject('/projects/myapp', 'myapp', 'virtual')
    })

    expect(sourceFs.isBinaryFile).toHaveBeenCalledWith('/projects/myapp/image.png')
    expect(sourceFs.readBinaryFile).toHaveBeenCalledWith('/projects/myapp/image.png')
    expect(targetFs.writeBinaryFile).toHaveBeenCalledWith('/image.png', binaryContent)
  })

  it('calls showError and console.error on failure', async () => {
    defaultParams.addVirtualWorkspace.mockRejectedValue(new Error('Failed'))
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useCloneProject(defaultParams))

    await act(async () => {
      await result.current.handleCloneProject('/projects/myapp', 'myapp', 'virtual')
    })

    expect(defaultParams.showError).toHaveBeenCalledWith('Failed to clone project')
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
  })

  it('does not call refreshFileTree on failure', async () => {
    defaultParams.addVirtualWorkspace.mockRejectedValue(new Error('Failed'))
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const { result } = renderHook(() => useCloneProject(defaultParams))

    await act(async () => {
      await result.current.handleCloneProject('/projects/myapp', 'myapp', 'virtual')
    })

    expect(defaultParams.refreshFileTree).not.toHaveBeenCalled()
    vi.restoreAllMocks()
  })
})
