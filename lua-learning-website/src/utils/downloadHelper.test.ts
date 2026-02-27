import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { IFileSystem, FileEntry } from '@lua-learning/shell-core'

// Mock triggerDownload
vi.mock('./dataExporter/dataExporter', () => ({
  triggerDownload: vi.fn(),
}))

// Mock JSZip - use vi.hoisted to define mock fns before vi.mock hoisting
const { mockFile, mockGenerateAsync } = vi.hoisted(() => ({
  mockFile: vi.fn(),
  mockGenerateAsync: vi.fn(),
}))

vi.mock('jszip', () => {
  class MockJSZip {
    file = mockFile
    generateAsync = mockGenerateAsync
  }
  return { default: MockJSZip }
})

import { downloadSingleFile, downloadDirectoryAsZip } from './downloadHelper'
import { triggerDownload } from './dataExporter/dataExporter'

function createMockFileSystem(overrides: Partial<IFileSystem> = {}): IFileSystem {
  return {
    getCurrentDirectory: vi.fn().mockReturnValue('/'),
    setCurrentDirectory: vi.fn(),
    exists: vi.fn().mockReturnValue(true),
    isDirectory: vi.fn().mockReturnValue(false),
    isFile: vi.fn().mockReturnValue(true),
    listDirectory: vi.fn().mockReturnValue([]),
    readFile: vi.fn().mockReturnValue(''),
    writeFile: vi.fn(),
    createDirectory: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  }
}

describe('downloadHelper', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateAsync.mockResolvedValue(new ArrayBuffer(8))
  })

  describe('downloadSingleFile', () => {
    it('downloads a text file with correct filename and content', async () => {
      const fs = createMockFileSystem({
        readFile: vi.fn().mockReturnValue('hello world'),
      })

      await downloadSingleFile(fs, '/workspace/hello.lua')

      expect(fs.readFile).toHaveBeenCalledWith('/workspace/hello.lua')
      const blob = vi.mocked(triggerDownload).mock.calls[0][1]
      expect(blob.type).toBe('text/plain')
      expect(blob.size).toBe(11) // 'hello world'.length
      expect(triggerDownload).toHaveBeenCalledWith('hello.lua', blob)
    })

    it('downloads a binary file using readBinaryFile with octet-stream type', async () => {
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const fs = createMockFileSystem({
        isBinaryFile: vi.fn().mockReturnValue(true),
        readBinaryFile: vi.fn().mockReturnValue(binaryData),
      })

      await downloadSingleFile(fs, '/workspace/image.png')

      expect(fs.readBinaryFile).toHaveBeenCalledWith('/workspace/image.png')
      const blob = vi.mocked(triggerDownload).mock.calls[0][1]
      expect(blob.type).toBe('application/octet-stream')
      expect(blob.size).toBeGreaterThan(0)
      expect(triggerDownload).toHaveBeenCalledWith('image.png', blob)
    })

    it('falls back to readFile when isBinaryFile returns true but readBinaryFile is not available', async () => {
      const fs = createMockFileSystem({
        isBinaryFile: vi.fn().mockReturnValue(true),
        readFile: vi.fn().mockReturnValue('binary-as-text'),
      })
      // No readBinaryFile method

      await downloadSingleFile(fs, '/workspace/data.bin')

      expect(fs.readFile).toHaveBeenCalledWith('/workspace/data.bin')
      expect(triggerDownload).toHaveBeenCalledWith(
        'data.bin',
        expect.any(Blob)
      )
    })

    it('treats file as text when isBinaryFile is not available', async () => {
      const fs = createMockFileSystem({
        readFile: vi.fn().mockReturnValue('text content'),
      })
      // No isBinaryFile method — should default to text, not binary

      await downloadSingleFile(fs, '/workspace/file.txt')

      expect(fs.readFile).toHaveBeenCalledWith('/workspace/file.txt')
      const blob = vi.mocked(triggerDownload).mock.calls[0][1]
      expect(blob.type).toBe('text/plain')
      expect(blob.size).toBe(12) // 'text content'.length
    })

    it('extracts filename from nested path', async () => {
      const fs = createMockFileSystem({
        readFile: vi.fn().mockReturnValue('content'),
      })

      await downloadSingleFile(fs, '/workspace/src/deep/nested/file.lua')

      expect(triggerDownload).toHaveBeenCalledWith(
        'file.lua',
        expect.any(Blob)
      )
    })
  })

  describe('downloadDirectoryAsZip', () => {
    it('creates a ZIP with flat files', async () => {
      const files: FileEntry[] = [
        { name: 'main.lua', type: 'file', path: '/workspace/main.lua' },
        { name: 'util.lua', type: 'file', path: '/workspace/util.lua' },
      ]
      const fs = createMockFileSystem({
        listDirectory: vi.fn().mockReturnValue(files),
        readFile: vi.fn().mockReturnValue('content'),
        isDirectory: vi.fn().mockReturnValue(false),
      })

      await downloadDirectoryAsZip(fs, '/workspace', 'workspace')

      expect(mockFile).toHaveBeenCalledWith('main.lua', 'content')
      expect(mockFile).toHaveBeenCalledWith('util.lua', 'content')
      expect(mockGenerateAsync).toHaveBeenCalledWith({ type: 'arraybuffer' })
      expect(triggerDownload).toHaveBeenCalledWith(
        'workspace.zip',
        expect.any(Blob)
      )
    })

    it('handles nested subdirectories with correct relative paths', async () => {
      const rootFiles: FileEntry[] = [
        { name: 'src', type: 'directory', path: '/workspace/src' },
      ]
      const srcFiles: FileEntry[] = [
        { name: 'main.lua', type: 'file', path: '/workspace/src/main.lua' },
      ]
      const fs = createMockFileSystem({
        listDirectory: vi.fn()
          .mockReturnValueOnce(rootFiles)
          .mockReturnValueOnce(srcFiles),
        readFile: vi.fn().mockReturnValue('code'),
        isDirectory: vi.fn()
          .mockImplementation((path: string) => path === '/workspace/src'),
      })

      await downloadDirectoryAsZip(fs, '/workspace', 'workspace')

      expect(mockFile).toHaveBeenCalledWith('src/main.lua', 'code')
    })

    it('creates a valid ZIP for an empty directory', async () => {
      const fs = createMockFileSystem({
        listDirectory: vi.fn().mockReturnValue([]),
      })

      await downloadDirectoryAsZip(fs, '/empty', 'empty')

      expect(mockFile).not.toHaveBeenCalled()
      expect(mockGenerateAsync).toHaveBeenCalled()
      const blob = vi.mocked(triggerDownload).mock.calls[0][1]
      expect(blob.type).toBe('application/zip')
      expect(blob.size).toBeGreaterThan(0)
      expect(triggerDownload).toHaveBeenCalledWith('empty.zip', blob)
    })

    it('handles binary files in ZIP using readBinaryFile', async () => {
      const binaryData = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const files: FileEntry[] = [
        { name: 'image.png', type: 'file', path: '/dir/image.png' },
      ]
      const fs = createMockFileSystem({
        listDirectory: vi.fn().mockReturnValue(files),
        isDirectory: vi.fn().mockReturnValue(false),
        isBinaryFile: vi.fn().mockReturnValue(true),
        readBinaryFile: vi.fn().mockReturnValue(binaryData),
      })

      await downloadDirectoryAsZip(fs, '/dir', 'dir')

      expect(mockFile).toHaveBeenCalledWith('image.png', binaryData, { binary: true })
    })

    it('handles mixed text and binary files', async () => {
      const binaryData = new Uint8Array([0x00, 0x01])
      const files: FileEntry[] = [
        { name: 'script.lua', type: 'file', path: '/mix/script.lua' },
        { name: 'data.bin', type: 'file', path: '/mix/data.bin' },
      ]
      const fs = createMockFileSystem({
        listDirectory: vi.fn().mockReturnValue(files),
        isDirectory: vi.fn().mockReturnValue(false),
        isBinaryFile: vi.fn().mockImplementation((p: string) => p.endsWith('.bin')),
        readBinaryFile: vi.fn().mockReturnValue(binaryData),
        readFile: vi.fn().mockReturnValue('lua code'),
      })

      await downloadDirectoryAsZip(fs, '/mix', 'mix')

      expect(mockFile).toHaveBeenCalledWith('script.lua', 'lua code')
      expect(mockFile).toHaveBeenCalledWith('data.bin', binaryData, { binary: true })
    })

    it('uses the provided zip name for the download filename', async () => {
      const fs = createMockFileSystem({
        listDirectory: vi.fn().mockReturnValue([]),
      })

      await downloadDirectoryAsZip(fs, '/project', 'my-project')

      expect(triggerDownload).toHaveBeenCalledWith(
        'my-project.zip',
        expect.any(Blob)
      )
    })
  })
})
