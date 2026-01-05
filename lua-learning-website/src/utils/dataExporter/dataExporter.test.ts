import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import type { ExportProgress } from './types'

// Mock JSZip - must be defined inline in the factory due to hoisting
vi.mock('jszip', () => {
  const mockFile = vi.fn()
  const mockFolder = vi.fn().mockReturnValue({ file: mockFile })
  const mockGenerateAsync = vi.fn()

  return {
    default: class MockJSZip {
      file = mockFile
      folder = mockFolder
      generateAsync = mockGenerateAsync
      static __mocks = { mockFile, mockFolder, mockGenerateAsync }
    },
  }
})

// Mock virtualFileSystemStorage
vi.mock('../../hooks/virtualFileSystemStorage', () => ({
  getAllFilesForWorkspace: vi.fn(),
  getAllFoldersForWorkspace: vi.fn(),
}))

// Mock workspaceManagerHelpers
vi.mock('../../hooks/workspaceManagerHelpers', () => ({
  WORKSPACE_STORAGE_KEY: 'lua-workspaces',
  loadPersistedWorkspaces: vi.fn(),
}))

import {
  exportWorkspace,
  exportAllData,
  triggerDownload,
  createExportMetadata,
} from './dataExporter'

import {
  getAllFilesForWorkspace,
  getAllFoldersForWorkspace,
} from '../../hooks/virtualFileSystemStorage'
import { loadPersistedWorkspaces } from '../../hooks/workspaceManagerHelpers'
import JSZip from 'jszip'

// Access mocks through the class static property
const { mockFile, mockFolder, mockGenerateAsync } = (JSZip as unknown as { __mocks: { mockFile: Mock; mockFolder: Mock; mockGenerateAsync: Mock } }).__mocks

describe('dataExporter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()

    // Default mock return values
    ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())
    ;(getAllFoldersForWorkspace as Mock).mockResolvedValue(new Set())
    ;(loadPersistedWorkspaces as Mock).mockReturnValue([])
    mockGenerateAsync.mockResolvedValue(new ArrayBuffer(0))
  })

  describe('createExportMetadata', () => {
    it('should create metadata with version and timestamp', () => {
      const metadata = createExportMetadata([])
      expect(metadata.version).toBe('1.0')
      expect(metadata.exportedAt).toBeDefined()
      expect(new Date(metadata.exportedAt).getTime()).toBeGreaterThan(0)
      expect(metadata.workspaces).toEqual([])
    })

    it('should include workspace information', () => {
      const workspaces = [
        { id: 'ws1', name: 'Test Workspace', mountPath: '/test' },
        { id: 'ws2', name: 'Another', mountPath: '/another' },
      ]
      const metadata = createExportMetadata(workspaces)
      expect(metadata.workspaces).toHaveLength(2)
      expect(metadata.workspaces[0].id).toBe('ws1')
      expect(metadata.workspaces[0].name).toBe('Test Workspace')
      expect(metadata.workspaces[1].id).toBe('ws2')
    })
  })

  describe('exportWorkspace', () => {
    it('should export empty workspace as zip', async () => {
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      const blob = await exportWorkspace('test-workspace')

      expect(getAllFilesForWorkspace).toHaveBeenCalledWith('test-workspace')
      expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'arraybuffer' })
      expect(blob).toBeInstanceOf(Blob)
    })

    it('should include text files in zip', async () => {
      const files = new Map([
        ['/main.lua', { path: '/main.lua', content: 'print("hello")', isBinary: false }],
        ['/utils/helper.lua', { path: '/utils/helper.lua', content: 'return {}', isBinary: false }],
      ])
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(files)

      await exportWorkspace('test-workspace')

      expect(mockFile).toHaveBeenCalledWith('main.lua', 'print("hello")')
      expect(mockFile).toHaveBeenCalledWith('utils/helper.lua', 'return {}')
    })

    it('should include binary files in zip', async () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const files = new Map([
        ['/image.png', { path: '/image.png', content: binaryContent, isBinary: true }],
      ])
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(files)

      await exportWorkspace('test-workspace')

      expect(mockFile).toHaveBeenCalledWith('image.png', binaryContent, { binary: true })
    })

    it('should include metadata when option is set', async () => {
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      await exportWorkspace('test-workspace', { includeMetadata: true })

      expect(mockFile).toHaveBeenCalledWith(
        'metadata.json',
        expect.stringContaining('"version": "1.0"')
      )
    })

    it('should not include metadata by default', async () => {
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      await exportWorkspace('test-workspace')

      expect(mockFile).not.toHaveBeenCalledWith('metadata.json', expect.any(String))
    })

    it('should call progress callback with correct values', async () => {
      const files = new Map([
        ['/file1.lua', { path: '/file1.lua', content: 'a', isBinary: false }],
        ['/file2.lua', { path: '/file2.lua', content: 'b', isBinary: false }],
      ])
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(files)

      const progressUpdates: ExportProgress[] = []
      const onProgress = vi.fn((p: ExportProgress) => progressUpdates.push({ ...p }))

      await exportWorkspace('test-workspace', { onProgress })

      expect(onProgress).toHaveBeenCalled()
      expect(progressUpdates.some(p => p.phase === 'collecting')).toBe(true)
      expect(progressUpdates.some(p => p.phase === 'zipping')).toBe(true)
      expect(progressUpdates.some(p => p.phase === 'complete')).toBe(true)

      // Verify progress values are correct
      const collectingUpdates = progressUpdates.filter(p => p.phase === 'collecting')
      expect(collectingUpdates).toContainEqual(expect.objectContaining({ processed: 0, total: 0 }))
      expect(collectingUpdates).toContainEqual(expect.objectContaining({ processed: 1, total: 2 }))
      expect(collectingUpdates).toContainEqual(expect.objectContaining({ processed: 2, total: 2 }))

      // Verify currentFile is reported
      expect(progressUpdates.some(p => p.currentFile !== undefined)).toBe(true)
    })

    it('should strip leading slash from paths', async () => {
      const files = new Map([
        ['/test.lua', { path: '/test.lua', content: 'content', isBinary: false }],
      ])
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(files)

      await exportWorkspace('test-workspace')

      expect(mockFile).toHaveBeenCalledWith('test.lua', 'content')
    })

    it('should handle paths without leading slash', async () => {
      const files = new Map([
        ['test.lua', { path: 'test.lua', content: 'content', isBinary: false }],
      ])
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(files)

      await exportWorkspace('test-workspace')

      expect(mockFile).toHaveBeenCalledWith('test.lua', 'content')
    })

    it('should return blob with correct type', async () => {
      mockGenerateAsync.mockResolvedValue(new ArrayBuffer(100))
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      const blob = await exportWorkspace('test-workspace')

      expect(blob.type).toBe('application/zip')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should include workspace id, name, and mountPath in metadata', async () => {
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      await exportWorkspace('my-workspace', { includeMetadata: true })

      expect(mockFile).toHaveBeenCalledWith(
        'metadata.json',
        expect.stringContaining('"id": "my-workspace"')
      )
      expect(mockFile).toHaveBeenCalledWith(
        'metadata.json',
        expect.stringContaining('"mountPath": "/"')
      )
    })
  })

  describe('exportAllData', () => {
    it('should export all workspaces', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Workspace 1', mountPath: '/ws1', type: 'virtual' as const },
        { id: 'ws2', name: 'Workspace 2', mountPath: '/ws2', type: 'virtual' as const },
      ]
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(workspaces)
      ;(getAllFilesForWorkspace as Mock).mockImplementation(async (id: string) => {
        if (id === 'ws1') {
          return new Map([['/file1.lua', { path: '/file1.lua', content: 'ws1', isBinary: false }]])
        }
        return new Map([['/file2.lua', { path: '/file2.lua', content: 'ws2', isBinary: false }]])
      })

      await exportAllData()

      expect(getAllFilesForWorkspace).toHaveBeenCalledWith('ws1')
      expect(getAllFilesForWorkspace).toHaveBeenCalledWith('ws2')
      expect(mockFolder).toHaveBeenCalledWith('workspaces/Workspace 1')
      expect(mockFolder).toHaveBeenCalledWith('workspaces/Workspace 2')
    })

    it('should include metadata for all workspaces', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Test', mountPath: '/test', type: 'virtual' as const },
      ]
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(workspaces)
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      await exportAllData()

      expect(mockFile).toHaveBeenCalledWith(
        'metadata.json',
        expect.stringContaining('"workspaces"')
      )
    })

    it('should skip non-virtual workspaces', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Virtual', mountPath: '/ws1', type: 'virtual' as const },
        { id: 'local1', name: 'Local', mountPath: '/local', type: 'local' as const },
      ]
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(workspaces)
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      await exportAllData()

      expect(getAllFilesForWorkspace).toHaveBeenCalledWith('ws1')
      expect(getAllFilesForWorkspace).not.toHaveBeenCalledWith('local1')
    })

    it('should handle empty workspace list', async () => {
      ;(loadPersistedWorkspaces as Mock).mockReturnValue([])

      const blob = await exportAllData()

      expect(blob).toBeInstanceOf(Blob)
      expect(mockFile).toHaveBeenCalledWith('metadata.json', expect.any(String))
    })

    it('should call progress callback during multi-workspace export', async () => {
      const workspaces = [
        { id: 'ws1', name: 'WS1', mountPath: '/ws1', type: 'virtual' as const },
        { id: 'ws2', name: 'WS2', mountPath: '/ws2', type: 'virtual' as const },
      ]
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(workspaces)
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(new Map())

      const progressUpdates: ExportProgress[] = []
      await exportAllData({ onProgress: (p) => progressUpdates.push({ ...p }) })

      expect(progressUpdates.some(p => p.phase === 'complete')).toBe(true)
    })

    it('should return blob with correct type', async () => {
      mockGenerateAsync.mockResolvedValue(new ArrayBuffer(100))
      ;(loadPersistedWorkspaces as Mock).mockReturnValue([])

      const blob = await exportAllData()

      expect(blob.type).toBe('application/zip')
      expect(blob.size).toBeGreaterThan(0)
    })

    it('should handle binary files in workspaces', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Test', mountPath: '/test', type: 'virtual' as const },
      ]
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(workspaces)
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(
        new Map([['/image.png', { content: binaryContent, isBinary: true }]])
      )

      const folderMock = { file: vi.fn() }
      mockFolder.mockReturnValue(folderMock)

      await exportAllData()

      expect(folderMock.file).toHaveBeenCalledWith('image.png', binaryContent, { binary: true })
    })

    it('should track progress with currentFile for each file', async () => {
      const workspaces = [
        { id: 'ws1', name: 'Test', mountPath: '/test', type: 'virtual' as const },
      ]
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(workspaces)
      ;(getAllFilesForWorkspace as Mock).mockResolvedValue(
        new Map([['/file.lua', { content: 'test', isBinary: false }]])
      )

      const progressUpdates: ExportProgress[] = []
      await exportAllData({ onProgress: (p) => progressUpdates.push({ ...p }) })

      expect(progressUpdates.some(p => p.currentFile?.includes('Test'))).toBe(true)
    })

    it('should handle null return from loadPersistedWorkspaces', async () => {
      ;(loadPersistedWorkspaces as Mock).mockReturnValue(null)

      const blob = await exportAllData()

      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('triggerDownload', () => {
    it('should create and click download link', () => {
      const mockClick = vi.fn()
      const mockRemove = vi.fn()
      const mockAnchor = {
        href: '',
        download: '',
        click: mockClick,
        remove: mockRemove,
      }

      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as unknown as HTMLAnchorElement)
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockAnchor as unknown as HTMLAnchorElement)

      const mockRevokeObjectURL = vi.fn()
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test')
      globalThis.URL.createObjectURL = mockCreateObjectURL
      globalThis.URL.revokeObjectURL = mockRevokeObjectURL

      const blob = new Blob(['test'], { type: 'application/zip' })
      triggerDownload('test.zip', blob)

      expect(mockCreateObjectURL).toHaveBeenCalledWith(blob)
      expect(mockAnchor.download).toBe('test.zip')
      expect(mockClick).toHaveBeenCalled()
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test')
      expect(mockRemove).toHaveBeenCalled()
    })
  })
})
