import { renderHook } from '@testing-library/react'
import type { Mock } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let mockToggleTerminal: Mock<() => void>
  let mockToggleSidebar: Mock<() => void>
  let mockSaveFile: Mock<() => void>
  let mockSaveAllFiles: Mock<() => void>

  beforeEach(() => {
    mockToggleTerminal = vi.fn<() => void>()
    mockToggleSidebar = vi.fn<() => void>()
    mockSaveFile = vi.fn<() => void>()
    mockSaveAllFiles = vi.fn<() => void>()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Ctrl+`', () => {
    it('should call toggleTerminal when Ctrl+` is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
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

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act - unmount the hook
      unmount()

      // Dispatch events after unmount
      const event = new KeyboardEvent('keydown', {
        key: '`',
        ctrlKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert - callbacks should not be called after unmount
      expect(mockToggleTerminal).not.toHaveBeenCalled()
    })
  })

  describe('preventDefault', () => {
    it('should prevent default for Ctrl+B to avoid browser bookmark dialog', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
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
  })

  describe('Ctrl+Shift+S', () => {
    it('should call saveAllFiles when Ctrl+Shift+S is pressed', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          saveAllFiles: mockSaveAllFiles,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveAllFiles).toHaveBeenCalledTimes(1)
      expect(mockSaveFile).not.toHaveBeenCalled()
    })

    it('should call saveFile when Ctrl+S is pressed without Shift', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          saveAllFiles: mockSaveAllFiles,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: false,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).toHaveBeenCalledTimes(1)
      expect(mockSaveAllFiles).not.toHaveBeenCalled()
    })

    it('should fall back to saveFile when saveAllFiles is not provided', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          // saveAllFiles not provided
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).toHaveBeenCalledTimes(1)
    })
  })

  describe('macOS shortcuts (Cmd key)', () => {
    const originalPlatform = navigator.platform

    beforeEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      })
    })

    afterEach(() => {
      Object.defineProperty(navigator, 'platform', {
        value: originalPlatform,
        configurable: true,
      })
    })

    it('should call saveFile when Cmd+S is pressed on macOS', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).toHaveBeenCalledTimes(1)
    })

    it('should NOT call saveFile when Ctrl+S is pressed on macOS', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        ctrlKey: true, // Ctrl, not Cmd
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveFile).not.toHaveBeenCalled()
    })

    it('should call toggleSidebar when Cmd+B is pressed on macOS', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 'b',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleSidebar).toHaveBeenCalledTimes(1)
    })

    it('should call toggleTerminal when Cmd+` is pressed on macOS', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: '`',
        metaKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockToggleTerminal).toHaveBeenCalledTimes(1)
    })

    it('should call saveAllFiles when Cmd+Shift+S is pressed on macOS', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
          saveAllFiles: mockSaveAllFiles,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
        shiftKey: true,
        bubbles: true,
      })
      document.dispatchEvent(event)

      // Assert
      expect(mockSaveAllFiles).toHaveBeenCalledTimes(1)
      expect(mockSaveFile).not.toHaveBeenCalled()
    })

    it('should prevent default for Cmd+S on macOS to avoid browser save dialog', () => {
      // Arrange
      renderHook(() =>
        useKeyboardShortcuts({
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
          saveFile: mockSaveFile,
        })
      )

      // Act
      const event = new KeyboardEvent('keydown', {
        key: 's',
        metaKey: true,
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
