import { vi, describe, it, expect } from 'vitest'
import { processFileUpload, processFileUploadBatch, findConflictingFiles } from './uploadHandler'

describe('uploadHandler', () => {
  /**
   * Creates a mock File with proper arrayBuffer() support for testing.
   */
  const createMockFile = (name: string, content: string | Uint8Array): File => {
    const data = content instanceof Uint8Array ? content : new TextEncoder().encode(content)
    const file = {
      name,
      arrayBuffer: vi.fn().mockResolvedValue(data.buffer),
    } as unknown as File
    return file
  }

  describe('processFileUpload', () => {
    describe('text files', () => {
      it('should write text file to target folder', async () => {
        const writeTextFile = vi.fn()
        const writeBinaryFile = vi.fn()
        const onSuccess = vi.fn()
        const file = createMockFile('test.lua', 'print("hello")')

        await processFileUpload({
          file,
          targetFolderPath: '/workspace',
          pathExists: () => false,
          writeTextFile,
          writeBinaryFile,
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
          onSuccess,
        })

        expect(writeTextFile).toHaveBeenCalledWith('/workspace/test.lua', 'print("hello")')
        expect(writeBinaryFile).not.toHaveBeenCalled()
        expect(onSuccess).toHaveBeenCalled()
      })

      it('should handle markdown files as text', async () => {
        const writeTextFile = vi.fn()
        const writeBinaryFile = vi.fn()
        const file = createMockFile('readme.md', '# Hello')

        await processFileUpload({
          file,
          targetFolderPath: '/docs',
          pathExists: () => false,
          writeTextFile,
          writeBinaryFile,
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
        })

        expect(writeTextFile).toHaveBeenCalledWith('/docs/readme.md', '# Hello')
      })
    })

    describe('binary files', () => {
      it('should write binary file for image extensions', async () => {
        const writeTextFile = vi.fn()
        const writeBinaryFile = vi.fn()
        const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
        const file = createMockFile('image.png', binaryContent)

        await processFileUpload({
          file,
          targetFolderPath: '/workspace',
          pathExists: () => false,
          writeTextFile,
          writeBinaryFile,
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
        })

        expect(writeBinaryFile).toHaveBeenCalled()
        expect(writeTextFile).not.toHaveBeenCalled()
        const [path, content] = writeBinaryFile.mock.calls[0]
        expect(path).toBe('/workspace/image.png')
        expect(content).toBeInstanceOf(Uint8Array)
      })

      it('should handle audio files as binary', async () => {
        const writeBinaryFile = vi.fn()
        const file = createMockFile('sound.mp3', new Uint8Array([0xff, 0xfb]))

        await processFileUpload({
          file,
          targetFolderPath: '/audio',
          pathExists: () => false,
          writeTextFile: vi.fn(),
          writeBinaryFile,
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
        })

        expect(writeBinaryFile).toHaveBeenCalledWith('/audio/sound.mp3', expect.any(Uint8Array))
      })

      it('should handle binary extension case-insensitively', async () => {
        const writeBinaryFile = vi.fn()
        const file = createMockFile('image.PNG', new Uint8Array([0x89]))

        await processFileUpload({
          file,
          targetFolderPath: '/workspace',
          pathExists: () => false,
          writeTextFile: vi.fn(),
          writeBinaryFile,
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
        })

        expect(writeBinaryFile).toHaveBeenCalled()
      })
    })

    describe('file conflicts', () => {
      it('should show confirmation dialog when file exists', async () => {
        const openConfirmDialog = vi.fn()
        const file = createMockFile('existing.lua', 'content')

        await processFileUpload({
          file,
          targetFolderPath: '/workspace',
          pathExists: () => true,
          writeTextFile: vi.fn(),
          writeBinaryFile: vi.fn(),
          openConfirmDialog,
          closeConfirmDialog: vi.fn(),
        })

        expect(openConfirmDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Replace File',
            variant: 'danger',
          })
        )
      })

      it('should write file when confirm is clicked', async () => {
        const writeTextFile = vi.fn()
        const closeConfirmDialog = vi.fn()
        let confirmCallback: (() => void) | undefined
        const openConfirmDialog = vi.fn((config) => {
          confirmCallback = config.onConfirm
        })
        const file = createMockFile('existing.lua', 'new content')

        await processFileUpload({
          file,
          targetFolderPath: '/workspace',
          pathExists: () => true,
          writeTextFile,
          writeBinaryFile: vi.fn(),
          openConfirmDialog,
          closeConfirmDialog,
        })

        // Simulate clicking confirm
        expect(confirmCallback).toBeDefined()
        await confirmCallback!()

        expect(writeTextFile).toHaveBeenCalledWith('/workspace/existing.lua', 'new content')
        expect(closeConfirmDialog).toHaveBeenCalled()
      })
    })

    describe('root folder handling', () => {
      it('should handle root folder path correctly', async () => {
        const writeTextFile = vi.fn()
        const file = createMockFile('test.lua', 'content')

        await processFileUpload({
          file,
          targetFolderPath: '/',
          pathExists: () => false,
          writeTextFile,
          writeBinaryFile: vi.fn(),
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
        })

        expect(writeTextFile).toHaveBeenCalledWith('/test.lua', 'content')
      })
    })

    describe('error handling', () => {
      it('should call onError when write fails', async () => {
        const onError = vi.fn()
        const writeTextFile = vi.fn(() => {
          throw new Error('Write failed')
        })
        const file = createMockFile('test.lua', 'content')

        await processFileUpload({
          file,
          targetFolderPath: '/workspace',
          pathExists: () => false,
          writeTextFile,
          writeBinaryFile: vi.fn(),
          openConfirmDialog: vi.fn(),
          closeConfirmDialog: vi.fn(),
          onError,
        })

        expect(onError).toHaveBeenCalledWith('Write failed')
      })
    })
  })

  describe('processFileUploadBatch', () => {
    it('should process multiple files and report results', async () => {
      const onComplete = vi.fn()
      const writeTextFile = vi.fn()
      const files = [
        createMockFile('file1.lua', 'content1'),
        createMockFile('file2.lua', 'content2'),
      ]
      // Create a FileList-like object
      const fileList = {
        length: files.length,
        item: (i: number) => files[i],
        [Symbol.iterator]: function* () {
          for (const file of files) yield file
        },
      } as unknown as FileList

      await processFileUploadBatch({
        files: fileList,
        targetFolderPath: '/workspace',
        pathExists: () => false,
        writeTextFile,
        writeBinaryFile: vi.fn(),
        openConfirmDialog: vi.fn(),
        closeConfirmDialog: vi.fn(),
        onComplete,
      })

      expect(writeTextFile).toHaveBeenCalledTimes(2)
      expect(onComplete).toHaveBeenCalledWith({ success: 2, failed: 0 })
    })

    it('should track failed uploads separately', async () => {
      const onComplete = vi.fn()
      const onError = vi.fn()
      let callCount = 0
      const writeTextFile = vi.fn(() => {
        callCount++
        if (callCount === 2) throw new Error('Failed')
      })
      const files = [
        createMockFile('file1.lua', 'content1'),
        createMockFile('file2.lua', 'content2'),
        createMockFile('file3.lua', 'content3'),
      ]
      const fileList = {
        length: files.length,
        item: (i: number) => files[i],
        [Symbol.iterator]: function* () {
          for (const file of files) yield file
        },
      } as unknown as FileList

      await processFileUploadBatch({
        files: fileList,
        targetFolderPath: '/workspace',
        pathExists: () => false,
        writeTextFile,
        writeBinaryFile: vi.fn(),
        openConfirmDialog: vi.fn(),
        closeConfirmDialog: vi.fn(),
        onComplete,
        onError,
      })

      expect(onComplete).toHaveBeenCalledWith({ success: 2, failed: 1 })
      expect(onError).toHaveBeenCalledWith('file2.lua', 'Failed')
    })
  })

  describe('findConflictingFiles', () => {
    const createMockFileList = (fileNames: string[]): FileList => {
      const files = fileNames.map(name => ({ name }) as File)
      return {
        length: files.length,
        item: (i: number) => files[i],
        [Symbol.iterator]: function* () {
          for (const file of files) yield file
        },
      } as unknown as FileList
    }

    it('should return empty array when no conflicts', () => {
      const fileList = createMockFileList(['new1.lua', 'new2.lua'])
      const pathExists = () => false

      const conflicts = findConflictingFiles(fileList, '/workspace', pathExists)

      expect(conflicts).toEqual([])
    })

    it('should return conflicting file names', () => {
      const fileList = createMockFileList(['existing.lua', 'new.lua', 'another-existing.lua'])
      const pathExists = (path: string) => path.includes('existing')

      const conflicts = findConflictingFiles(fileList, '/workspace', pathExists)

      expect(conflicts).toEqual(['existing.lua', 'another-existing.lua'])
    })

    it('should handle root folder path', () => {
      const fileList = createMockFileList(['test.lua'])
      const pathExists = (path: string) => path === '/test.lua'

      const conflicts = findConflictingFiles(fileList, '/', pathExists)

      expect(conflicts).toEqual(['test.lua'])
    })

    it('should return all files when all conflict', () => {
      const fileList = createMockFileList(['a.lua', 'b.lua', 'c.lua'])
      const pathExists = () => true

      const conflicts = findConflictingFiles(fileList, '/workspace', pathExists)

      expect(conflicts).toEqual(['a.lua', 'b.lua', 'c.lua'])
    })
  })
})
