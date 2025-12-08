import { renderHook } from '@testing-library/react'
import type { Mock } from 'vitest'
import { useKeyboardShortcuts } from './useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  let mockRunCode: Mock<() => void>
  let mockToggleTerminal: Mock<() => void>
  let mockToggleSidebar: Mock<() => void>

  beforeEach(() => {
    mockRunCode = vi.fn<() => void>()
    mockToggleTerminal = vi.fn<() => void>()
    mockToggleSidebar = vi.fn<() => void>()
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

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      // Arrange
      const { unmount } = renderHook(() =>
        useKeyboardShortcuts({
          runCode: mockRunCode,
          toggleTerminal: mockToggleTerminal,
          toggleSidebar: mockToggleSidebar,
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
  })
})
