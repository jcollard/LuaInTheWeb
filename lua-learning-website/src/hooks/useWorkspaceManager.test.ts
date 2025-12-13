import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceManager, WORKSPACE_STORAGE_KEY, DEFAULT_WORKSPACE_ID } from './useWorkspaceManager'

// Mock localStorage
const localStorageMock = (() => {
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
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock FileSystemAccessAPIFileSystem
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
    localStorageMock.clear()
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

    it('sets the default workspace as active', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.activeWorkspace).toBeDefined()
      expect(result.current.activeWorkspace.id).toBe(DEFAULT_WORKSPACE_ID)
      // Verify the constant value
      expect(DEFAULT_WORKSPACE_ID).toBe('default')
    })

    it('provides a filesystem for the default workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.activeWorkspace.filesystem).toBeDefined()
      expect(typeof result.current.activeWorkspace.filesystem.readFile).toBe('function')
    })

    it('default workspace has rootPath of "/"', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].rootPath).toBe('/')
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

    it('sets root path to "/" for virtual workspaces', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace> | undefined
      act(() => {
        workspace = result.current.addVirtualWorkspace('Test')
      })

      expect(workspace!.rootPath).toBe('/')
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

    it('sets rootPath to "/" for local workspaces', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const mockHandle = {
        name: 'test',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      let newWorkspace: Awaited<ReturnType<typeof result.current.addLocalWorkspace>> | undefined
      await act(async () => {
        newWorkspace = await result.current.addLocalWorkspace('Test', mockHandle)
      })

      expect(newWorkspace!.rootPath).toBe('/')
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

    it('switches to default workspace if active workspace is removed', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace>
      act(() => {
        workspace = result.current.addVirtualWorkspace('Will Remove')
        result.current.setActiveWorkspace(workspace.id)
      })

      expect(result.current.activeWorkspace.id).toBe(workspace!.id)

      act(() => {
        result.current.removeWorkspace(workspace!.id)
      })

      expect(result.current.activeWorkspace.id).toBe(DEFAULT_WORKSPACE_ID)
    })

    it('throws error for non-existent workspace ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(() => {
        act(() => {
          result.current.removeWorkspace('non-existent-id')
        })
      }).toThrow('Workspace not found')
    })
  })

  describe('setActiveWorkspace', () => {
    it('changes the active workspace', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      let workspace: ReturnType<typeof result.current.addVirtualWorkspace>
      act(() => {
        workspace = result.current.addVirtualWorkspace('New Active')
      })

      act(() => {
        result.current.setActiveWorkspace(workspace!.id)
      })

      expect(result.current.activeWorkspace.id).toBe(workspace!.id)
    })

    it('throws error for non-existent workspace ID', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      expect(() => {
        act(() => {
          result.current.setActiveWorkspace('non-existent-id')
        })
      }).toThrow('Workspace not found')
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
      expect(savedData).toHaveProperty('activeWorkspaceId')
      expect(savedData.workspaces.length).toBeGreaterThanOrEqual(2)
      expect(savedData.workspaces[0]).toHaveProperty('id')
      expect(savedData.workspaces[0]).toHaveProperty('name')
      expect(savedData.workspaces[0]).toHaveProperty('type')
      expect(savedData.workspaces[0]).toHaveProperty('rootPath')
    })

    it('restores virtual workspaces from localStorage', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
          { id: 'ws-2', name: 'Restored Workspace', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      })
      localStorageMock.getItem.mockReturnValue(savedData)

      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces).toHaveLength(2)
      expect(result.current.workspaces[1].name).toBe('Restored Workspace')
    })

    it('marks local workspaces as disconnected on restore', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
          { id: 'ws-local', name: 'Local Project', type: 'local', rootPath: '/' },
        ],
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      })
      localStorageMock.getItem.mockReturnValue(savedData)

      const { result } = renderHook(() => useWorkspaceManager())

      const localWorkspace = result.current.workspaces.find((w) => w.type === 'local')
      expect(localWorkspace?.status).toBe('disconnected')
    })

    it('restores activeWorkspaceId correctly', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
          { id: 'ws-2', name: 'Second Workspace', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: 'ws-2',
      })
      localStorageMock.getItem.mockReturnValue(savedData)

      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.activeWorkspace.id).toBe('ws-2')
    })

    it('falls back to default if saved activeWorkspaceId does not exist', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: 'non-existent',
      })
      localStorageMock.getItem.mockReturnValue(savedData)

      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.activeWorkspace.id).toBe(DEFAULT_WORKSPACE_ID)
    })

    it('adds default workspace if missing from persisted data', () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: 'ws-other', name: 'Other Workspace', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: 'ws-other',
      })
      localStorageMock.getItem.mockReturnValue(savedData)

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

  describe('reconnectWorkspace', () => {
    it('reconnects a disconnected local workspace', async () => {
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'My Files', type: 'virtual', rootPath: '/' },
          { id: 'ws-local', name: 'Local Project', type: 'local', rootPath: '/' },
        ],
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      })
      localStorageMock.getItem.mockReturnValue(savedData)

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
