import { renderHook } from '@testing-library/react'
import type { Mock } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let mockRunCode: Mock<() => void>
  let mockToggleTerminal: Mock<() => void>
  let mockToggleSidebar: Mock<() => void>
  let mockSaveFile: Mock<() => void>
  let mockCreateFile: Mock<() => void>

  beforeEach(() => {
    mockRunCode = vi.fn<() => void>()
    mockToggleTerminal = vi.fn<() => void>()
    mockToggleSidebar = vi.fn<() => void>()
    mockSaveFile = vi.fn<() => void>()
    mockCreateFile = vi.fn<() => void>()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Ctrl+Enter', () => {
    it('should call runCode when Ctrl+Enter is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockRunCode).toHaveBeenCalledTimes(1)
    })

    it('should not call runCode when only Enter is pressed without Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockRunCode).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+`', () => {
    it('should call toggleTerminal when Ctrl+` is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: '`',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleTerminal).toHaveBeenCalledTimes(1)
    })

    it('should not call toggleTerminal when only ` is pressed without Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: '`',
        ctrlKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleTerminal).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+B', () => {
    it('should call toggleSidebar when Ctrl+B is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
    })

    it('should call toggleSidebar for uppercase B with Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'B',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
    })

    it('should not call toggleSidebar when only B is pressed without Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleSidebar).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+S', () => {
    it('should call saveFile when Ctrl+S is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).toHaveBeenCalledTimes(1)
    })

    it('should call saveFile for uppercase S with Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'S',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).toHaveBeenCalledTimes(1)
    })

    it('should not call saveFile when only S is pressed without Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).not.toHaveBeenCalled()
    })
  })

  describe('Ctrl+N', () => {
    it('should call createFile when Ctrl+N is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          createFile: mockCreateFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockCreateFile).toHaveBeenCalledTimes(1)
    })

    it('should call createFile for uppercase N with Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          createFile: mockCreateFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'N',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockCreateFile).toHaveBeenCalledTimes(1)
    })

    it('should not call createFile when only N is pressed without Ctrl', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          createFile: mockCreateFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockCreateFile).not.toHaveBeenCalled()
    })

    it('should not crash when createFile is not provided', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act & Assert - should not throw
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
      })
      expect(() => document.dispatchEvent(event)).not.toThrow()
    })

    it('should always prevent default for Ctrl+N even without createFile', () => {
      // Arrange - no createFile provided
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      // Assert - should still prevent browser's new window action
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act - unmount the hook
      unmount()

      // Dispatch events after unmount
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert - callbacks should not be called after unmount
      expect(mockRunCode).not.toHaveBeenCalled()
    })
  })

  describe('preventDefault', () => {
    it('should prevent default for Ctrl+Enter', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'Enter',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should prevent default for Ctrl+B to avoid browser bookmark dialog', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should prevent default for Ctrl+S to avoid browser save dialog', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled()
    })

    it('should prevent default for Ctrl+N to avoid browser new window', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          createFile: mockCreateFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
      const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
      document.dispatchEvent(event)

      // Assert
      expect(preventDefaultSpy).toHaveBeenCalled()
    })
  })
})
