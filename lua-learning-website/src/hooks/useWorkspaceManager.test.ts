/* eslint-disable max-lines */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceManager, WORKSPACE_STORAGE_KEY, DEFAULT_WORKSPACE_ID } from './useWorkspaceManager'

// Mock localStorage
const createLocalStorageMock = () => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      store = {}
    }),
    _getStore: () => store,
    _setStore: (newStore: Record<string, string>) => {
      store = newStore
    },
  }
}

let localStorageMock = createLocalStorageMock()

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })

// Mock FileSystemAccessAPIFileSystem and CompositeFileSystem
vi.mock('@lua-learning/shell-core', async () => {
  const actual = await vi.importActual('@lua-learning/shell-core')

  // Define the mock class inside the factory
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

describe('useWorkspaceManager', () => {
  beforeEach(() => {
    // Create a fresh mock for each test to avoid state leakage
    localStorageMock = createLocalStorageMock()
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true })
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('initializes with a default virtual workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces).toHaveLength(1)
      expect(result.current.workspaces[0].name).toBe('My Files')
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

    it('default workspace has mountPath of "/my-files"', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].mountPath).toBe('/my-files')
    })

    it('provides a compositeFileSystem', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.compositeFileSystem).toBeDefined()
      expect(typeof result.current.compositeFileSystem.readFile).toBe('function')
      expect(typeof result.current.compositeFileSystem.listDirectory).toBe('function')
    })
  })

  describe('compositeFileSystem', () => {
    it('lists mounted workspaces at root', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('My Files')
      expect(entries[0].type).toBe('directory')
    })

    it('updates when workspaces change', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      expect(entries.map((e) => e.name).sort()).toEqual(['My Files', 'Project'])
    })

    it('only includes connected workspaces', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', mountPath: '/my-files' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Local workspace is disconnected, so only 1 mount
      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(1)
      expect(entries[0].name).toBe('My Files')
    })
  })

  describe('addVirtualWorkspace', () => {
    it('adds a new virtual workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Test Workspace')
      })

      expect(result.current.workspaces).toHaveLength(2)
      expect(result.current.workspaces[1].name).toBe('Test Workspace')
      expect(result.current.workspaces[1].type).toBe('virtual')
    })

    it('returns the newly created workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let newWorkspace: ReturnType<typeof result.current.addVirtualWorkspace> | undefined
      act(() => {
        newWorkspace = result.current.addVirtualWorkspace('New Workspace')
      })

      expect(newWorkspace).toBeDefined()
      expect(newWorkspace!.name).toBe('New Workspace')
    })

    it('generates unique IDs for each workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Workspace 1')
        result.current.addVirtualWorkspace('Workspace 2')
      })

      const ids = result.current.workspaces.map((w) => w.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('generates mountPath from workspace name', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace> | undefined
      act(() => {
        workspace = result.current.addVirtualWorkspace('My Project')
      })

      expect(workspace!.mountPath).toBe('/my-project')
    })

    it('converts name with special chars to valid mount path', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace> | undefined
      act(() => {
        workspace = result.current.addVirtualWorkspace('Project #1 - Test!')
      })

      expect(workspace!.mountPath).toBe('/project-1-test')
    })

    it('handles mount path collisions by appending numbers', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })
      act(() => {
        result.current.addVirtualWorkspace('Project')
      })
      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      // Verify the workspaces have unique mount paths
      const projects = result.current.workspaces.filter((w) => w.name === 'Project')
      expect(projects).toHaveLength(3)
      const mountPaths = projects.map((w) => w.mountPath).sort()
      expect(mountPaths).toEqual(['/project', '/project-2', '/project-3'])
    })

    it('uses "workspace" for empty name after sanitization', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace> | undefined
      act(() => {
        workspace = result.current.addVirtualWorkspace('!!!')
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

      expect(result.current.workspaces).toHaveLength(2)
      expect(result.current.workspaces[1].name).toBe('My Project')
      expect(result.current.workspaces[1].type).toBe('local')
      expect(result.current.workspaces[1].directoryHandle).toBe(mockHandle)
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
    it('removes a workspace by ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace>
      act(() => {
        workspace = result.current.addVirtualWorkspace('To Remove')
      })

      act(() => {
        result.current.removeWorkspace(workspace!.id)
      })

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

      // Only have the default workspace
      expect(result.current.workspaces).toHaveLength(1)

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

    it('updates compositeFileSystem when workspace is removed', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace>
      act(() => {
        workspace = result.current.addVirtualWorkspace('To Remove')
      })

      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(2)

      act(() => {
        result.current.removeWorkspace(workspace!.id)
      })

      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(1)
    })
  })

  describe('getWorkspace', () => {
    it('returns workspace by ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace>
      act(() => {
        workspace = result.current.addVirtualWorkspace('Find Me')
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
    it('returns workspace by mount path', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Find Me')
      })

      const found = result.current.getWorkspaceByMountPath('/find-me')
      expect(found).toBeDefined()
      expect(found?.name).toBe('Find Me')
    })

    it('returns default workspace for /my-files', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const found = result.current.getWorkspaceByMountPath('/my-files')
      expect(found).toBeDefined()
      expect(found?.id).toBe(DEFAULT_WORKSPACE_ID)
    })

    it('returns undefined for non-existent mount path', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const found = result.current.getWorkspaceByMountPath('/does-not-exist')
      expect(found).toBeUndefined()
    })
  })

  describe('getMounts', () => {
    it('returns all mount information', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const mounts = result.current.getMounts()
      expect(mounts).toHaveLength(2)
      expect(mounts[0].mountPath).toBe('/my-files')
      expect(mounts[0].isConnected).toBe(true)
      expect(mounts[1].mountPath).toBe('/project')
      expect(mounts[1].isConnected).toBe(true)
    })

    it('shows disconnected status for local workspaces', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', mountPath: '/my-files' },
          { id: 'ws-local', name: 'Local', type: 'local', mountPath: '/local' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      const mounts = result.current.getMounts()
      const localMount = mounts.find((m) => m.mountPath === '/local')
      expect(localMount?.isConnected).toBe(false)
    })

    it('includes workspace reference in each mount', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mounts = result.current.getMounts()
      expect(mounts[0].workspace).toBeDefined()
      expect(mounts[0].workspace.name).toBe('My Files')
    })
  })

  describe('isFileSystemAccessSupported', () => {
    it('returns boolean indicating browser support', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const supported = result.current.isFileSystemAccessSupported()
      expect(typeof supported).toBe('boolean')
    })
  })

  describe('localStorage persistence', () => {
    it('saves workspace metadata to localStorage with correct key', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Persisted Workspace')
      })

      // Verify exact key is used
      expect(WORKSPACE_STORAGE_KEY).toBe('lua-workspaces')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lua-workspaces',
        expect.any(String)
      )
    })

    it('saves workspace data with all required fields', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Test Workspace')
      })

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls.slice(-1)[0][1])
      expect(savedData).toHaveProperty('workspaces')
      expect(savedData.workspaces.length).toBeGreaterThanOrEqual(2)
      expect(savedData.workspaces[0]).toHaveProperty('id')
      expect(savedData.workspaces[0]).toHaveProperty('name')
      expect(savedData.workspaces[0]).toHaveProperty('type')
      expect(savedData.workspaces[0]).toHaveProperty('mountPath')
    })

    it('restores virtual workspaces from localStorage', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', mountPath: '/my-files' },
          { id: 'ws-2', name: 'Restored Workspace', type: 'virtual', mountPath: '/restored-workspace' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces).toHaveLength(2)
      expect(result.current.workspaces[1].name).toBe('Restored Workspace')
    })

    it('marks local workspaces as disconnected on restore', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', mountPath: '/my-files' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      const localWorkspace = result.current.workspaces.find((w) => w.type === 'local')
      expect(localWorkspace?.status).toBe('disconnected')
    })

    it('adds default workspace if missing from persisted data', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: 'ws-other', name: 'Other Workspace', type: 'virtual', mountPath: '/other-workspace' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Should have both default and the other workspace
      expect(result.current.workspaces.length).toBe(2)
      expect(result.current.workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID)).toBe(true)
    })

    it('does not save on initial mount', () => {
      localStorageMock.clear()
      vi.clearAllMocks()

      renderHook(() => useWorkspaceManager())

      // Should not save on initial mount (only reads)
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(WORKSPACE_STORAGE_KEY, expect.any(String))
    })
  })

  describe('legacy data migration', () => {
    it('migrates workspaces with rootPath to mountPath', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
          { id: 'ws-2', name: 'Old Project', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].mountPath).toBe('/my-files')
      expect(result.current.workspaces[1].mountPath).toBe('/old-project')
    })

    it('generates unique mount paths for legacy data with same names', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
          { id: 'ws-1', name: 'Project', type: 'virtual', rootPath: '/' },
          { id: 'ws-2', name: 'Project', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      const mountPaths = result.current.workspaces.map((w) => w.mountPath)
      const uniquePaths = new Set(mountPaths)
      expect(uniquePaths.size).toBe(mountPaths.length)
    })
  })

  describe('reconnectWorkspace', () => {
    it('reconnects a disconnected local workspace', async () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', mountPath: '/my-files' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {
        name: 'project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      await act(async () => {
        await result.current.reconnectWorkspace('ws-local', mockHandle)
      })

      const localWorkspace = result.current.workspaces.find((w) => w.id === 'ws-local')
      expect(localWorkspace?.status).toBe('connected')
      expect(localWorkspace?.directoryHandle).toBe(mockHandle)
    })

    it('updates compositeFileSystem when workspace is reconnected', async () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', mountPath: '/my-files' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Before reconnect: only 1 mount (default)
      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(1)

      const mockHandle = {
        name: 'project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      await act(async () => {
        await result.current.reconnectWorkspace('ws-local', mockHandle)
      })

      // After reconnect: 2 mounts
      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(2)
    })

    it('throws error for non-existent workspace', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {} as FileSystemDirectoryHandle

      await expect(
        act(async () => {
          await result.current.reconnectWorkspace('non-existent', mockHandle)
        })
      ).rejects.toThrow('Workspace not found')
    })

    it('throws error when trying to reconnect a virtual workspace', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {} as FileSystemDirectoryHandle

      await expect(
        act(async () => {
          await result.current.reconnectWorkspace(DEFAULT_WORKSPACE_ID, mockHandle)
        })
      ).rejects.toThrow('Cannot reconnect a virtual workspace')
    })
  })
})
