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

    it('should set isOpen to true when opening context menu', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openContextMenu('/test', 0, 0)
      })

      // Assert - verify isOpen is specifically true (not just truthy)
      expect(result.current.contextMenu.isOpen).toBe(true)
    })

    it('should set position x and y when opening context menu', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openContextMenu('/test', 150, 250)
      })

      // Assert - verify x and y are set correctly
      expect(result.current.contextMenu.position.x).toBe(150)
      expect(result.current.contextMenu.position.y).toBe(250)
    })

    it('should set targetPath when opening context menu', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openContextMenu('/specific/path.lua', 0, 0)
      })

      // Assert
      expect(result.current.contextMenu.targetPath).toBe('/specific/path.lua')
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

    it('should open context menu with default file type', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openContextMenu('/main.lua', 100, 200)
      })

      // Assert - default type should be 'file'
      expect(result.current.contextMenu.targetType).toBe('file')
    })

    it('should open context menu with explicit folder type', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openContextMenu('/utils', 100, 200, 'folder')
      })

      // Assert
      expect(result.current.contextMenu.targetType).toBe('folder')
    })

    it('should reset context menu state on close', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      act(() => {
        result.current.openContextMenu('/main.lua', 100, 200, 'folder')
      })

      // Act
      act(() => {
        result.current.closeContextMenu()
      })

      // Assert - all fields should be reset
      expect(result.current.contextMenu.isOpen).toBe(false)
      expect(result.current.contextMenu.position).toEqual({ x: 0, y: 0 })
      expect(result.current.contextMenu.targetPath).toBeNull()
      expect(result.current.contextMenu.targetType).toBeNull()
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

    it('should set isOpen to true when opening confirm dialog', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openConfirmDialog({
          title: 'Test',
          message: 'Test message',
          onConfirm: vi.fn(),
        })
      })

      // Assert - verify isOpen is specifically true
      expect(result.current.confirmDialog.isOpen).toBe(true)
    })

    it('should spread config values when opening confirm dialog', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      const onConfirmFn = vi.fn()

      // Act
      act(() => {
        result.current.openConfirmDialog({
          title: 'Specific Title',
          message: 'Specific Message',
          onConfirm: onConfirmFn,
        })
      })

      // Assert - verify all config values are spread
      expect(result.current.confirmDialog.title).toBe('Specific Title')
      expect(result.current.confirmDialog.message).toBe('Specific Message')
      expect(result.current.confirmDialog.onConfirm).toBe(onConfirmFn)
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

    it('should store message in confirm dialog', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act
      act(() => {
        result.current.openConfirmDialog({
          title: 'Confirm Delete',
          message: 'Are you sure you want to delete this file?',
          onConfirm: vi.fn(),
        })
      })

      // Assert
      expect(result.current.confirmDialog.message).toBe('Are you sure you want to delete this file?')
    })

    it('should store onConfirm callback in confirm dialog', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      const onConfirm = vi.fn()

      // Act
      act(() => {
        result.current.openConfirmDialog({
          title: 'Delete',
          message: 'Sure?',
          onConfirm,
        })
      })

      // Assert - callback should be stored and callable
      expect(result.current.confirmDialog.onConfirm).toBe(onConfirm)
      result.current.confirmDialog.onConfirm()
      expect(onConfirm).toHaveBeenCalled()
    })

    it('should reset confirm dialog state on close', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      const onConfirm = vi.fn()
      act(() => {
        result.current.openConfirmDialog({
          title: 'Delete File',
          message: 'Are you sure?',
          onConfirm,
        })
      })

      // Act
      act(() => {
        result.current.closeConfirmDialog()
      })

      // Assert - all fields should be reset to initial state
      expect(result.current.confirmDialog.isOpen).toBe(false)
      expect(result.current.confirmDialog.title).toBe('')
      expect(result.current.confirmDialog.message).toBe('')
    })

    it('should have noop onConfirm after close', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())
      const onConfirm = vi.fn()
      act(() => {
        result.current.openConfirmDialog({
          title: 'Delete',
          message: 'Sure?',
          onConfirm,
        })
      })
      act(() => {
        result.current.closeConfirmDialog()
      })

      // Act - call the reset onConfirm
      result.current.confirmDialog.onConfirm()

      // Assert - original callback should NOT have been called
      expect(onConfirm).not.toHaveBeenCalled()
    })
  })

  describe('initial state', () => {
    it('should initialize with correct context menu initial state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.contextMenu).toEqual({
        isOpen: false,
        position: { x: 0, y: 0 },
        targetPath: null,
        targetType: null,
      })
    })

    it('should initialize with correct confirm dialog initial state', () => {
      // Arrange & Act
      const { result } = renderHook(() => useFileExplorer())

      // Assert
      expect(result.current.confirmDialog.isOpen).toBe(false)
      expect(result.current.confirmDialog.title).toBe('')
      expect(result.current.confirmDialog.message).toBe('')
      expect(typeof result.current.confirmDialog.onConfirm).toBe('function')
    })
  })

  describe('expanded paths state', () => {
    it('should toggle multiple folders independently', () => {
      // Arrange
      const { result } = renderHook(() => useFileExplorer())

      // Act - expand multiple folders
      act(() => {
        result.current.toggleFolder('/folder1')
      })
      act(() => {
        result.current.toggleFolder('/folder2')
      })

      // Assert
      expect(result.current.expandedPaths.has('/folder1')).toBe(true)
      expect(result.current.expandedPaths.has('/folder2')).toBe(true)

      // Act - collapse one folder
      act(() => {
        result.current.toggleFolder('/folder1')
      })

      // Assert - only folder1 should be collapsed
      expect(result.current.expandedPaths.has('/folder1')).toBe(false)
      expect(result.current.expandedPaths.has('/folder2')).toBe(true)
    })
  })
})
