import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileOperationsHandler, type FileSystemOperations } from '../src/FileOperationsHandler'

describe('FileOperationsHandler', () => {
  let mockFs: FileSystemOperations
  let pathResolver: (path: string) => string

  beforeEach(() => {
    mockFs = {
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(false),
      readFile: vi.fn().mockReturnValue('file content'),
      writeFile: vi.fn(),
    }
    pathResolver = (path: string) => `/resolved${path}`
  })

  describe('onFileSystemChange callback', () => {
    it('should call onFileSystemChange when closing a dirty file', async () => {
      const onFileSystemChange = vi.fn()
      const handler = new FileOperationsHandler(mockFs, pathResolver, onFileSystemChange)

      // Open file for writing (creates dirty file)
      const openResult = handler.fileOpen('/test.txt', 'w')
      expect(openResult.success).toBe(true)

      // Write something
      const writeResult = handler.fileWrite(openResult.handle!, 'hello')
      expect(writeResult.success).toBe(true)

      // Close the file - should trigger callback
      const closeResult = await handler.fileClose(openResult.handle!)
      expect(closeResult.success).toBe(true)

      expect(onFileSystemChange).toHaveBeenCalledTimes(1)
    })

    it('should not call onFileSystemChange when closing a clean file', async () => {
      const onFileSystemChange = vi.fn()
      const handler = new FileOperationsHandler(mockFs, pathResolver, onFileSystemChange)

      // Open file for reading (not dirty)
      const openResult = handler.fileOpen('/test.txt', 'r')
      expect(openResult.success).toBe(true)

      // Close the file - should not trigger callback
      const closeResult = await handler.fileClose(openResult.handle!)
      expect(closeResult.success).toBe(true)

      expect(onFileSystemChange).not.toHaveBeenCalled()
    })

    it('should work without onFileSystemChange callback', async () => {
      // No callback provided
      const handler = new FileOperationsHandler(mockFs, pathResolver)

      // Open file for writing
      const openResult = handler.fileOpen('/test.txt', 'w')
      expect(openResult.success).toBe(true)

      // Write something
      handler.fileWrite(openResult.handle!, 'hello')

      // Close should work without callback
      const closeResult = await handler.fileClose(openResult.handle!)
      expect(closeResult.success).toBe(true)
    })

    it('should call onFileSystemChange for each dirty file closed via closeAll', () => {
      const onFileSystemChange = vi.fn()
      const handler = new FileOperationsHandler(mockFs, pathResolver, onFileSystemChange)

      // Open and write to two files
      const result1 = handler.fileOpen('/file1.txt', 'w')
      handler.fileWrite(result1.handle!, 'content1')

      const result2 = handler.fileOpen('/file2.txt', 'w')
      handler.fileWrite(result2.handle!, 'content2')

      // Close all files
      handler.closeAll()

      expect(onFileSystemChange).toHaveBeenCalledTimes(2)
    })

    it('should not call onFileSystemChange if write fails', async () => {
      const onFileSystemChange = vi.fn()
      ;(mockFs.writeFile as ReturnType<typeof vi.fn>).mockImplementation(() => {
        throw new Error('Write failed')
      })
      const handler = new FileOperationsHandler(mockFs, pathResolver, onFileSystemChange)

      // Open file for writing
      const openResult = handler.fileOpen('/test.txt', 'w')
      handler.fileWrite(openResult.handle!, 'hello')

      // Close should fail and not call callback
      const closeResult = await handler.fileClose(openResult.handle!)
      expect(closeResult.success).toBe(false)

      expect(onFileSystemChange).not.toHaveBeenCalled()
    })
  })
})
