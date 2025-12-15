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
      // default + library = 2
      expect(entries).toHaveLength(2)
      // listDirectory returns mount path names (slugs)
      expect(entries.map((e) => e.name).sort()).toEqual(['home', 'libs'])
    })

    it('updates when workspaces change', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const entries = result.current.compositeFileSystem.listDirectory('/')
      // default + library + new = 3
      expect(entries).toHaveLength(3)
      // listDirectory returns mount path names (slugs), not display names
      expect(entries.map((e) => e.name).sort()).toEqual(['home', 'libs', 'project'])
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

      // Local workspace is disconnected, so only default + library = 2
      const entries = result.current.compositeFileSystem.listDirectory('/')
      expect(entries).toHaveLength(2)
      // listDirectory returns mount path names (slugs)
      expect(entries.map((e) => e.name).sort()).toEqual(['home', 'libs'])
    })
  })

  describe('getMounts', () => {
    it('returns all mount information', () => {
      const { result } = renderHook(() => useWorkspaceManager())

      act(() => {
        result.current.addVirtualWorkspace('Project')
      })

      const mounts = result.current.getMounts()
      // default + library + new = 3
      expect(mounts).toHaveLength(3)
      expect(mounts.some((m) => m.mountPath === '/home' && m.isConnected)).toBe(true)
      expect(mounts.some((m) => m.mountPath === '/libs' && m.isConnected)).toBe(true)
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
