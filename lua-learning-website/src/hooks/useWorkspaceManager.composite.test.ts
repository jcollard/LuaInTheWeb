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
      expect(entries).toHaveLength(1)
      // listDirectory returns mount path name (slug), not display name
      expect(entries[0].name).toBe('home')
      expect(entries[0].type).toBe('directory')
    })

    it('updates when workspaces change', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      // listDirectory returns mount path names (slugs), not display names
      expect(entries.map((e) => e.name).sort()).toEqual(['home', 'project'])
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

      // Local workspace is disconnected, so only 1 mount
      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(1)
      // listDirectory returns mount path name (slug), not display name
      expect(entries[0].name).toBe('home')
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
      expect(mounts[0].mountPath).toBe('/home')
      expect(mounts[0].isConnected).toBe(true)
      expect(mounts[1].mountPath).toBe('/project')
      expect(mounts[1].isConnected).toBe(true)
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
