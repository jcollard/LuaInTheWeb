/**
 * Core tests for useWorkspaceManager hook.
 * Tests: initialization, add/remove workspaces, getters.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceManager, DEFAULT_WORKSPACE_ID } from './useWorkspaceManager'
import { setupWorkspaceManagerTests } from './useWorkspaceManager.testSetup'

// Mock virtualFileSystemStorage to avoid IndexedDB in tests
vi.mock('./virtualFileSystemStorage', () => ({
  storeFile: vi.fn(async () => {}),
  getFile: vi.fn(async () => null),
  deleteFile: vi.fn(async () => {}),
  getAllFilesForWorkspace: vi.fn(async () => []),
  storeFolder: vi.fn(async () => {}),
  deleteFolder: vi.fn(async () => {}),
  getAllFoldersForWorkspace: vi.fn(async () => []),
  deleteWorkspaceData: vi.fn(async () => {}),
}))

// Mock FileSystemAccessAPIFileSystem
vi.mock('@lua-learning/shell-core', async () => {
  const actual = await vi.importActual('@lua-learning/shell-core')

  class MockFileSystemAccessAPIFileSystem {
    initialize = vi.fn().mockResolvedValue(undefined)
    getCurrentDirectory = vi.fn(() => '/')
    setCurrentDirectory = vi.fn()
    exists = vi.fn(() => false)
    isDirectory = vi.fn(() => false)
    isFile = vi.fn(() => false)
    listDirectory = vi.fn(() => [])
    readFile = vi.fn(() => '')
    writeFile = vi.fn()
    createDirectory = vi.fn()
    delete = vi.fn()
  }

  return {
    ...actual,
    isFileSystemAccessSupported: vi.fn(() => true),
    FileSystemAccessAPIFileSystem: MockFileSystemAccessAPIFileSystem,
  }
})

setupWorkspaceManagerTests()

describe('useWorkspaceManager', () => {
  describe('initialization', () => {
    it('initializes with a default virtual workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      // Default workspace only
      // Note: docs, examples, book, and libs workspaces are loaded asynchronously
      expect(result.current.workspaces).toHaveLength(1)
      expect(result.current.workspaces[0].name).toBe('home')
      expect(result.current.workspaces[0].type).toBe('virtual')
      expect(result.current.workspaces[0].status).toBe('connected')
    })

    it('default workspace has id DEFAULT_WORKSPACE_ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].id).toBe(DEFAULT_WORKSPACE_ID)
      // Verify the constant value
      expect(DEFAULT_WORKSPACE_ID).toBe('default')
    })

    it('provides a filesystem for the default workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].filesystem).toBeDefined()
      expect(typeof result.current.workspaces[0].filesystem.readFile).toBe('function')
    })

    it('default workspace has mountPath of "/home"', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].mountPath).toBe('/home')
    })

    it('provides a compositeFileSystem', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.compositeFileSystem).toBeDefined()
      expect(typeof result.current.compositeFileSystem.readFile).toBe('function')
      expect(typeof result.current.compositeFileSystem.listDirectory).toBe('function')
    })
  })

  describe('addVirtualWorkspace', () => {
    it('adds a new virtual workspace', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await result.current.addVirtualWorkspace('Test Workspace')
      })

      // default + new workspace = 2
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.workspaces).toHaveLength(2)
      expect(result.current.workspaces.find((w) => w.name === 'Test Workspace')).toBeDefined()
      expect(result.current.workspaces.find((w) => w.name === 'Test Workspace')?.type).toBe('virtual')
    })

    it('returns the newly created workspace', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let newWorkspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>> | undefined
      await act(async () => {
        newWorkspace = await result.current.addVirtualWorkspace('New Workspace')
      })

      expect(newWorkspace).toBeDefined()
      expect(newWorkspace!.name).toBe('New Workspace')
    })

    it('generates unique IDs for each workspace', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await result.current.addVirtualWorkspace('Workspace 1')
        await result.current.addVirtualWorkspace('Workspace 2')
      })

      const ids = result.current.workspaces.map((w) => w.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('generates mountPath from workspace name', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>> | undefined
      await act(async () => {
        workspace = await result.current.addVirtualWorkspace('My Project')
      })

      expect(workspace!.mountPath).toBe('/my-project')
    })

    it('converts name with special chars to valid mount path', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>> | undefined
      await act(async () => {
        workspace = await result.current.addVirtualWorkspace('Project #1 - Test!')
      })

      expect(workspace!.mountPath).toBe('/project-1-test')
    })

    it('handles mount path collisions by appending numbers', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await result.current.addVirtualWorkspace('Project')
      })
      await act(async () => {
        await result.current.addVirtualWorkspace('Project')
      })
      await act(async () => {
        await result.current.addVirtualWorkspace('Project')
      })

      // Verify the workspaces have unique mount paths
      const projects = result.current.workspaces.filter((w) => w.name === 'Project')
      expect(projects).toHaveLength(3)
      const mountPaths = projects.map((w) => w.mountPath).sort()
      expect(mountPaths).toEqual(['/project', '/project-2', '/project-3'])
    })

    it('uses "workspace" for empty name after sanitization', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>> | undefined
      await act(async () => {
        workspace = await result.current.addVirtualWorkspace('!!!')
      })

      expect(workspace!.mountPath).toBe('/workspace')
    })
  })

  describe('addLocalWorkspace', () => {
    it('adds a new local workspace with directory handle', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {
        name: 'my-project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      await act(async () => {
        await result.current.addLocalWorkspace('My Project', mockHandle)
      })

      // default + new local workspace = 2
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.workspaces).toHaveLength(2)
      const localWorkspace = result.current.workspaces.find((w) => w.name === 'My Project')
      expect(localWorkspace).toBeDefined()
      expect(localWorkspace?.type).toBe('local')
      expect(localWorkspace?.directoryHandle).toBe(mockHandle)
    })

    it('initializes the FileSystemAccessAPIFileSystem', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {
        name: 'test',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      await act(async () => {
        await result.current.addLocalWorkspace('Test', mockHandle)
      })

      const localWorkspace = result.current.workspaces.find((w) => w.type === 'local')
      expect(localWorkspace?.status).toBe('connected')
    })

    it('generates mountPath from workspace name', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {
        name: 'test',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      let newWorkspace: Awaited<ReturnType<typeof result.current.addLocalWorkspace>> | undefined
      await act(async () => {
        newWorkspace = await result.current.addLocalWorkspace('Local Folder', mockHandle)
      })

      expect(newWorkspace!.mountPath).toBe('/local-folder')
    })

    it('returns the newly created workspace', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {
        name: 'project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      let newWorkspace: Awaited<ReturnType<typeof result.current.addLocalWorkspace>> | undefined
      await act(async () => {
        newWorkspace = await result.current.addLocalWorkspace('Project', mockHandle)
      })

      expect(newWorkspace).toBeDefined()
      expect(newWorkspace!.name).toBe('Project')
    })
  })

  describe('removeWorkspace', () => {
    it('removes a workspace by ID', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>>
      await act(async () => {
        workspace = await result.current.addVirtualWorkspace('To Remove')
      })

      act(() => {
        result.current.removeWorkspace(workspace!.id)
      })

      // After removal: default = 1
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.workspaces).toHaveLength(1)
      expect(result.current.workspaces.find((w) => w.id === workspace!.id)).toBeUndefined()
    })

    it('throws error when trying to remove the default workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(() => {
        act(() => {
          result.current.removeWorkspace(DEFAULT_WORKSPACE_ID)
        })
      }).toThrow('Cannot remove the default workspace')
    })

    it('throws error when trying to remove the last workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      // default workspace only
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.workspaces).toHaveLength(1)

      // Try to remove default workspace - should throw "Cannot remove default"
      expect(() => {
        act(() => {
          result.current.removeWorkspace(result.current.workspaces[0].id)
        })
      }).toThrow()
    })

    it('throws error for non-existent workspace ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(() => {
        act(() => {
          result.current.removeWorkspace('non-existent-id')
        })
      }).toThrow('Workspace not found')
    })

    it('updates compositeFileSystem when workspace is removed', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>>
      await act(async () => {
        workspace = await result.current.addVirtualWorkspace('To Remove')
      })

      // default + new workspace = 2
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(2)

      act(() => {
        result.current.removeWorkspace(workspace!.id)
      })

      // After removal: default = 1
      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(1)
    })
  })

  describe('getWorkspace', () => {
    it('returns workspace by ID', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: Awaited<ReturnType<typeof result.current.addVirtualWorkspace>>
      await act(async () => {
        workspace = await result.current.addVirtualWorkspace('Find Me')
      })

      const found = result.current.getWorkspace(workspace!.id)
      expect(found).toBeDefined()
      expect(found?.name).toBe('Find Me')
    })

    it('returns undefined for non-existent ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const found = result.current.getWorkspace('does-not-exist')
      expect(found).toBeUndefined()
    })
  })

  describe('getWorkspaceByMountPath', () => {
    it('returns workspace by mount path', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await result.current.addVirtualWorkspace('Find Me')
      })

      const found = result.current.getWorkspaceByMountPath('/find-me')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Find Me')
    })

    it('returns default workspace for /home', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const found = result.current.getWorkspaceByMountPath('/home')
      expect(found).toBeDefined()
      expect(found?.id).toBe(DEFAULT_WORKSPACE_ID)
    })

    it('returns undefined for non-existent mount path', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const found = result.current.getWorkspaceByMountPath('/does-not-exist')
      expect(found).toBeUndefined()
    })
  })

  describe('isFileSystemAccessSupported', () => {
    it('returns boolean indicating browser support', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const supported = result.current.isFileSystemAccessSupported()
      expect(typeof supported).toBe('boolean')
    })
  })
})
