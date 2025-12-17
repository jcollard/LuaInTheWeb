/**
 * CompositeFileSystem and mount tests for useWorkspaceManager hook.
 * Tests: compositeFileSystem integration, getMounts.
 */
import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWorkspaceManager, WORKSPACE_STORAGE_KEY, DEFAULT_WORKSPACE_ID } from './useWorkspaceManager'
import { setupWorkspaceManagerTests, getLocalStorageMock } from './useWorkspaceManager.testSetup'

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
  describe('compositeFileSystem', () => {
    it('lists mounted workspaces at root', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      const entries = result.current.compositeFileSystem.listDirectory('/')
      // default + library + docs + examples = 4
      expect(entries).toHaveLength(4)
      // listDirectory returns mount path names (slugs)
      expect(entries.map((e) => e.name).sort()).toEqual(['docs', 'examples', 'home', 'libs'])
    })

    it('updates when workspaces change', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const entries = result.current.compositeFileSystem.listDirectory('/')
      // default + library + docs + examples + new = 5
      expect(entries).toHaveLength(5)
      // listDirectory returns mount path names (slugs), not display names
      expect(entries.map((e) => e.name).sort()).toEqual(['docs', 'examples', 'home', 'libs', 'project'])
    })

    it('only includes connected workspaces', () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
          { id: 'ws-local', name: 'Local Project', type: 'local', mountPath: '/local-project' },
        ],
      })
      localStorageMock._setStore({ [WORKSPACE_STORAGE_KEY]: savedData })

      const { result } = renderHook(() => useWorkspaceManager())

      // Local workspace is disconnected, so only default + library + docs + examples = 4
      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(4)
      // listDirectory returns mount path names (slugs)
      expect(entries.map((e) => e.name).sort()).toEqual(['docs', 'examples', 'home', 'libs'])
    })
  })

  describe('refreshAllLocalWorkspaces', () => {
    it('preserves compositeFileSystem identity (cwd preservation) when no local workspaces', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      // Capture the initial compositeFileSystem reference
      const initialFileSystem = result.current.compositeFileSystem

      // Call refresh - this should NOT recreate compositeFileSystem
      await act(async () => {
        await result.current.refreshAllLocalWorkspaces()
      })

      // The compositeFileSystem should be the SAME object (referential equality)
      // If it's recreated, the cwd will reset to DEFAULT_MOUNT_PATH
      expect(result.current.compositeFileSystem).toBe(initialFileSystem)
    })

    it('preserves compositeFileSystem identity with connected local workspaces (issue #280)', async () => {
      const { result } = renderHook(() => useWorkspaceManager())

      // Add a local workspace - this creates a connected local workspace
      const mockHandle = {
        name: 'my-project',
        kind: 'directory',
      } as unknown as FileSystemDirectoryHandle

      await act(async () => {
        await result.current.addLocalWorkspace('My Project', mockHandle)
      })

      // Verify the local workspace was added and is connected
      const localWorkspace = result.current.workspaces.find((w) => w.type === 'local')
      expect(localWorkspace?.status).toBe('connected')

      // Capture the compositeFileSystem reference AFTER adding the local workspace
      const initialFileSystem = result.current.compositeFileSystem

      // Call refresh - this should NOT recreate compositeFileSystem
      // BUG: Previously, this would spread the workspaces array causing useMemo to recreate
      await act(async () => {
        await result.current.refreshAllLocalWorkspaces()
      })

      // The compositeFileSystem should be the SAME object (referential equality)
      // If it's recreated, the cwd will reset to DEFAULT_MOUNT_PATH, losing user's position
      expect(result.current.compositeFileSystem).toBe(initialFileSystem)
    })
  })

  describe('getMounts', () => {
    it('returns all mount information', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const mounts = result.current.getMounts()
      // default + library + docs + examples + new = 5
      expect(mounts).toHaveLength(5)
      expect(mounts.some((m) => m.mountPath === '/home' && m.isConnected)).toBe(true)
      expect(mounts.some((m) => m.mountPath === '/libs' && m.isConnected)).toBe(true)
      expect(mounts.some((m) => m.mountPath === '/docs' && m.isConnected)).toBe(true)
      expect(mounts.some((m) => m.mountPath === '/examples' && m.isConnected)).toBe(true)
      expect(mounts.some((m) => m.mountPath === '/project' && m.isConnected)).toBe(true)
    })

    it('shows disconnected status for local workspaces', () => {
      const localStorageMock = getLocalStorageMock()
      const savedData = JSON.stringify({
        workspaces: [
          { id: DEFAULT_WORKSPACE_ID, name: 'home', type: 'virtual', mountPath: '/home' },
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
      expect(mounts[0].workspace.name).toBe('home')
    })
  })
})
