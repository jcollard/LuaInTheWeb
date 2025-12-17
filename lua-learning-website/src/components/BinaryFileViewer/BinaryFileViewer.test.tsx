import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { BinaryFileViewer } from './BinaryFileViewer'
import type { IFileSystem } from '@lua-learning/shell-core'

describe('BinaryFileViewer', () => {
  let mockFileSystem: IFileSystem

  // Mock URL.createObjectURL and URL.revokeObjectURL
  const mockCreateObjectURL = vi.fn(() => 'blob:mock-url')
  const mockRevokeObjectURL = vi.fn()
  const originalURL = globalThis.URL

  beforeEach(() => {
    mockFileSystem = {
      getCurrentDirectory: vi.fn(() => '/'),
      setCurrentDirectory: vi.fn(),
      exists: vi.fn(),
      isDirectory: vi.fn(),
      isFile: vi.fn(),
      listDirectory: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      createDirectory: vi.fn(),
      delete: vi.fn(),
      readBinaryFile: vi.fn(),
    }

    // Mock URL methods
    globalThis.URL.createObjectURL = mockCreateObjectURL
    globalThis.URL.revokeObjectURL = mockRevokeObjectURL
  })

  afterEach(() => {
    vi.clearAllMocks()
    globalThis.URL.createObjectURL = originalURL.createObjectURL
    globalThis.URL.revokeObjectURL = originalURL.revokeObjectURL
  })

  describe('filesystem support', () => {
    it('should show error when filesystem does not support binary files', () => {
      // Arrange
      const fsWithoutBinary: IFileSystem = {
        getCurrentDirectory: vi.fn(() => '/'),
        setCurrentDirectory: vi.fn(),
        exists: vi.fn(),
        isDirectory: vi.fn(),
        isFile: vi.fn(),
        listDirectory: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
        createDirectory: vi.fn(),
        delete: vi.fn(),
        // No readBinaryFile method
      }

      // Act
      render(
        <BinaryFileViewer
          filePath="/test.png"
          fileSystem={fsWithoutBinary}
        />
      )

      // Assert
      expect(screen.getByText('This filesystem does not support binary files')).toBeInTheDocument()
    })
  })

  describe('image files', () => {
    it('should display PNG image with blob URL', async () => {
      // Arrange
      const testData = new Uint8Array([0x89, 0x50, 0x4E, 0x47]) // PNG header
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/test.png"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        const img = screen.getByRole('img')
        expect(img).toBeInTheDocument()
        expect(img).toHaveAttribute('src', 'blob:mock-url')
        expect(img).toHaveAttribute('alt', 'test.png')
      })
    })

    it('should display file info for images', async () => {
      // Arrange
      const testData = new Uint8Array(1024) // 1KB file
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/folder/image.jpg"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText(/image\.jpg/)).toBeInTheDocument()
        expect(screen.getByText(/1 KB/)).toBeInTheDocument()
      })
    })

    it('should handle various image extensions', async () => {
      const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.ico', '.svg']

      for (const ext of imageExtensions) {
        // Arrange
        const testData = new Uint8Array([1, 2, 3, 4])
        vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)
        mockCreateObjectURL.mockClear()

        // Act
        const { unmount } = render(
          <BinaryFileViewer
            filePath={`/test${ext}`}
            fileSystem={mockFileSystem}
          />
        )

        // Assert
        await waitFor(() => {
          expect(screen.getByRole('img')).toBeInTheDocument()
        })

        unmount()
      }
    })
  })

  describe('non-image binary files', () => {
    it('should display binary file info for non-image files', async () => {
      // Arrange
      const testData = new Uint8Array(2048) // 2KB file
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/data.bin"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('data.bin')).toBeInTheDocument()
        // Check for extension shown in parentheses after "Binary file"
        expect(screen.getByText(/Binary file.*\.bin/)).toBeInTheDocument()
        expect(screen.getByText('2 KB')).toBeInTheDocument()
      })
    })

    it('should display binary file icon', async () => {
      // Arrange
      const testData = new Uint8Array([1, 2, 3])
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/archive.zip"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        // Should have an SVG icon
        expect(document.querySelector('svg')).toBeInTheDocument()
      })
    })

    it('should handle files without extension', async () => {
      // Arrange
      const testData = new Uint8Array([1, 2, 3])
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/noextension"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('noextension')).toBeInTheDocument()
        expect(screen.getByText('Binary file')).toBeInTheDocument()
      })
    })
  })

  describe('error handling', () => {
    it('should display error when file read fails', async () => {
      // Arrange
      vi.mocked(mockFileSystem.readBinaryFile!).mockImplementation(() => {
        throw new Error('File not found')
      })

      // Act
      render(
        <BinaryFileViewer
          filePath="/missing.png"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('File not found')).toBeInTheDocument()
      })
    })

    it('should display generic error for non-Error throws', async () => {
      // Arrange
      vi.mocked(mockFileSystem.readBinaryFile!).mockImplementation(() => {
        throw 'Unknown error'
      })

      // Act
      render(
        <BinaryFileViewer
          filePath="/missing.png"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('Failed to read file')).toBeInTheDocument()
      })
    })
  })

  describe('file size formatting', () => {
    it('should format 0 bytes correctly', async () => {
      // Arrange
      const testData = new Uint8Array(0)
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/empty.bin"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('0 Bytes')).toBeInTheDocument()
      })
    })

    it('should format bytes correctly', async () => {
      // Arrange
      const testData = new Uint8Array(512)
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/small.bin"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('512 Bytes')).toBeInTheDocument()
      })
    })

    it('should format kilobytes correctly', async () => {
      // Arrange
      const testData = new Uint8Array(1024)
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/kb.bin"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('1 KB')).toBeInTheDocument()
      })
    })

    it('should format megabytes correctly', async () => {
      // Arrange
      const testData = new Uint8Array(1024 * 1024)
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/mb.bin"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('1 MB')).toBeInTheDocument()
      })
    })
  })

  describe('className prop', () => {
    it('should apply custom className', async () => {
      // Arrange
      const testData = new Uint8Array([1, 2, 3])
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      const { container } = render(
        <BinaryFileViewer
          filePath="/test.bin"
          fileSystem={mockFileSystem}
          className="custom-class"
        />
      )

      // Assert
      await waitFor(() => {
        const wrapper = container.firstChild as HTMLElement
        expect(wrapper).toHaveClass('custom-class')
      })
    })
  })

  describe('blob URL management', () => {
    it('should create blob URL for image files', async () => {
      // Arrange
      const testData = new Uint8Array([1, 2, 3])
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/test.png"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled()
      })
    })

    it('should not create blob URL for non-image files', async () => {
      // Arrange
      const testData = new Uint8Array([1, 2, 3])
      vi.mocked(mockFileSystem.readBinaryFile!).mockReturnValue(testData)

      // Act
      render(
        <BinaryFileViewer
          filePath="/test.bin"
          fileSystem={mockFileSystem}
        />
      )

      // Assert
      await waitFor(() => {
        expect(screen.getByText('test.bin')).toBeInTheDocument()
      })
      expect(mockCreateObjectURL).not.toHaveBeenCalled()
    })
  })
})
