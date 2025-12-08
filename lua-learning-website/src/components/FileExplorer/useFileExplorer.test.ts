import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { useFileExplorer } from './useFileExplorer'

describe('useFileExplorer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('expanded folders state', () => {
    it('should initialize with empty expanded set', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.expandedPaths.size).toBe(0)
    })

    it('should expand folder when toggle called on collapsed folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.toggleFolder('/utils')
      })

      // Assert
      expect(result.current.expandedPaths.has('/utils')).toBe(true)
    })

    it('should collapse folder when toggle called on expanded folder', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      act(() => {
        result.current.toggleFolder('/utils') // expand first
      })

      // Act
      act(() => {
        result.current.toggleFolder('/utils') // collapse
      })

      // Assert
      expect(result.current.expandedPaths.has('/utils')).toBe(false)
    })
  })

  describe('selected path state', () => {
    it('should initialize with null selected path', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.selectedPath).toBeNull()
    })

    it('should update selected path when select called', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.selectPath('/main.lua')
      })

      // Assert
      expect(result.current.selectedPath).toBe('/main.lua')
    })
  })

  describe('renaming state', () => {
    it('should initialize with null renaming path', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.renamingPath).toBeNull()
    })

    it('should set renaming path when startRename called', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.startRename('/main.lua')
      })

      // Assert
      expect(result.current.renamingPath).toBe('/main.lua')
    })

    it('should clear renaming path when cancelRename called', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      act(() => {
        result.current.startRename('/main.lua')
      })

      // Act
      act(() => {
        result.current.cancelRename()
      })

      // Assert
      expect(result.current.renamingPath).toBeNull()
    })
  })

  describe('context menu state', () => {
    it('should initialize with closed context menu', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.contextMenu.isOpen).toBe(false)
    })

    it('should open context menu with position', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openContextMenu('/main.lua', 100, 200)
      })

      // Assert
      expect(result.current.contextMenu.isOpen).toBe(true)
      expect(result.current.contextMenu.position).toEqual({ x: 100, y: 200 })
      expect(result.current.contextMenu.targetPath).toBe('/main.lua')
    })

    it('should close context menu', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      act(() => {
        result.current.openContextMenu('/main.lua', 100, 200)
      })

      // Act
      act(() => {
        result.current.closeContextMenu()
      })

      // Assert
      expect(result.current.contextMenu.isOpen).toBe(false)
    })
  })

  describe('confirm dialog state', () => {
    it('should initialize with closed confirm dialog', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.confirmDialog.isOpen).toBe(false)
    })

    it('should open confirm dialog with details', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openConfirmDialog({
          title: 'Delete File',
          message: 'Are you sure?',
          onConfirm: vi.fn(),
        })
      })

      // Assert
      expect(result.current.confirmDialog.isOpen).toBe(true)
      expect(result.current.confirmDialog.title).toBe('Delete File')
    })

    it('should close confirm dialog', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      act(() => {
        result.current.openConfirmDialog({
          title: 'Delete',
          message: 'Sure?',
          onConfirm: vi.fn(),
        })
      })

      // Act
      act(() => {
        result.current.closeConfirmDialog()
      })

      // Assert
      expect(result.current.confirmDialog.isOpen).toBe(false)
    })
  })
})
