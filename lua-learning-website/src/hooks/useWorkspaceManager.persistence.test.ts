/**
 * Persistence and migration tests for useWorkspaceManager hook.
 * Tests: localStorage persistence, legacy data migration, reconnect.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceManager, WORKSPACE_STORAGE_KEY, DEFAULT_WORKSPACE_ID } from './useWorkspaceManager'
import { setupWorkspaceManagerTests, getLocalStorageMock } from './useWorkspaceManager.testSetup'

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

// Mock directoryHandleStorage for auto-reconnect tests
const mockGetDirectoryHandle = vi.fn().mockResolvedValue(null)
const mockRequestHandlePermission = vi.fn().mockResolvedValue(false)
const mockStoreDirectoryHandle = vi.fn().mockResolvedValue(undefined)
const mockRemoveDirectoryHandle = vi.fn().mockResolvedValue(undefined)

vi.mock('./directoryHandleStorage', () => ({
  storeDirectoryHandle: (...args: unknown[]) => mockStoreDirectoryHandle(...args),
  getDirectoryHandle: (...args: unknown[]) => mockGetDirectoryHandle(...args),
  removeDirectoryHandle: (...args: unknown[]) => mockRemoveDirectoryHandle(...args),
  requestHandlePermission: (...args: unknown[]) => mockRequestHandlePermission(...args),
  getAllDirectoryHandles: vi.fn(async () => new Map()),
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
  describe('localStorage persistence', () => {
    it('saves workspace metadata to localStorage with correct key', async () => {
      const localStorageMock = getLocalStorageMock()
      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await result.current.addVirtualWorkspace('Persisted Workspace')
      })

      // Verify exact key is used
      expect(WORKSPACE_STORAGE_KEY).toBe('lua-workspaces')
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'lua-workspaces',
        expect.any(String)
      )
    })

    it('saves workspace data with all required fields', async () => {
      const localStorageMock = getLocalStorageMock()
      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await result.current.addVirtualWorkspace('Test Workspace')
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
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-2', name: 'Restored Workspace', type: 'virtual', mountPath: '/restored-workspace' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Includes 2 persisted workspaces = 2
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.workspaces).toHaveLength(2)
      expect(result.current.workspaces.some((w) => w.name === 'Restored Workspace')).toBe(true)
    })

    it('marks local workspaces as disconnected on restore', () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      const localWorkspace = result.current.workspaces.find((w) => w.type === 'local')
      expect(localWorkspace?.status).toBe('disconnected')
    })

    it('adds default workspace if missing from persisted data', () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: 'ws-other', name: 'Other Workspace', type: 'virtual', mountPath: '/other-workspace' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Should have default + other = 2
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.workspaces.length).toBe(2)
      expect(result.current.workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID)).toBe(true)
    })

    it('does not save on initial mount', () => {
      const localStorageMock = getLocalStorageMock()
      localStorageMock.clear()
      vi.clearAllMocks()

      renderHook(() => useWorkspaceManager())

      // Should not save on initial mount (only reads)
      expect(localStorageMock.setItem).not.toHaveBeenCalledWith(WORKSPACE_STORAGE_KEY, expect.any(String))
    })
  })

  describe('legacy data migration', () => {
    it('migrates workspaces with rootPath to mountPath', () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', rootPath: '/' },
          { id: 'ws-2', name: 'Old Project', type: 'virtual', rootPath: '/' },
        ],
        activeWorkspaceId: DEFAULT_WORKSPACE_ID,
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      expect(result.current.workspaces[0].mountPath).toBe('/home')
      expect(result.current.workspaces[1].mountPath).toBe('/old-project')
    })

    it('generates unique mount paths for legacy data with same names', () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', rootPath: '/' },
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
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
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
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Before reconnect: 1 mount (default)
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
      expect(result.current.compositeFileSystem.listDirectory('/').length).toBe(1)

      const mockHandle = {
        name: 'project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      await act(async () => {
        await result.current.reconnectWorkspace('ws-local', mockHandle)
      })

      // After reconnect: 2 mounts (default + reconnected local)
      // (docs, examples, book, and libs workspaces are loaded asynchronously)
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

  describe('auto-reconnect on startup', () => {
    beforeEach(() => {
      mockGetDirectoryHandle.mockReset()
      mockRequestHandlePermission.mockReset()
      mockStoreDirectoryHandle.mockReset()
      mockRemoveDirectoryHandle.mockReset()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('attempts to reconnect disconnected local workspaces on mount', async () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const mockHandle = {
        name: 'project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      // Simulate stored handle exists and permission is granted
      mockGetDirectoryHandle.mockResolvedValue(mockHandle)
      mockRequestHandlePermission.mockResolvedValue(true)

      const { result } = renderHook(() => useWorkspaceManager())

      // Wait for the auto-reconnect effect to run
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      // Should have attempted to get the stored handle
      expect(mockGetDirectoryHandle).toHaveBeenCalledWith('ws-local')
      // Should have requested permission on the handle
      expect(mockRequestHandlePermission).toHaveBeenCalledWith(mockHandle)
      // Workspace should now be connected
      const localWorkspace = result.current.workspaces.find((w) => w.id === 'ws-local')
      expect(localWorkspace?.status).toBe('connected')
    })

    it('keeps workspace disconnected if no stored handle exists', async () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      // No stored handle
      mockGetDirectoryHandle.mockResolvedValue(null)

      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const localWorkspace = result.current.workspaces.find((w) => w.id === 'ws-local')
      expect(localWorkspace?.status).toBe('disconnected')
    })

    it('keeps workspace disconnected if permission is denied', async () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const mockHandle = {
        name: 'project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      // Handle exists but permission denied
      mockGetDirectoryHandle.mockResolvedValue(mockHandle)
      mockRequestHandlePermission.mockResolvedValue(false)

      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const localWorkspace = result.current.workspaces.find((w) => w.id === 'ws-local')
      expect(localWorkspace?.status).toBe('disconnected')
    })

    it('reconnects multiple disconnected local workspaces', async () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local-1', name: 'Project 1', type: 'local', mountPath: '/project-1' },
          { id: 'ws-local-2', name: 'Project 2', type: 'local', mountPath: '/project-2' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const mockHandle1 = { name: 'project1', kind: 'directory' } as unknown as FileSystemDirectoryHandle
      const mockHandle2 = { name: 'project2', kind: 'directory' } as unknown as FileSystemDirectoryHandle

      mockGetDirectoryHandle.mockImplementation(async (id: string) => {
        if (id === 'ws-local-1') return mockHandle1
        if (id === 'ws-local-2') return mockHandle2
        return null
      })
      mockRequestHandlePermission.mockResolvedValue(true)

      const { result } = renderHook(() => useWorkspaceManager())

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
      })

      const workspace1 = result.current.workspaces.find((w) => w.id === 'ws-local-1')
      const workspace2 = result.current.workspaces.find((w) => w.id === 'ws-local-2')
      expect(workspace1?.status).toBe('connected')
      expect(workspace2?.status).toBe('connected')
    })
  })
})
