import { renderHook, act } from '@testing-library/react'
import { useTabBar } from './useTabBar'

/**
 * Tests for canvas and preview tab functionality in useTabBar.
 * Split from useTabBar.test.ts to stay under max-lines limit.
 */
describe('useTabBar - canvas and preview tabs', () => {
  describe('tab types', () => {
    it('should default to file type when opening a tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Assert
      expect(result.current.tabs[0].type).toBe('file')
    })

    it('should allow specifying tab type when opening', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('canvas://game', 'Canvas Game', 'canvas')
      })

      // Assert
      expect(result.current.tabs[0].type).toBe('canvas')
    })
  })

  describe('openCanvasTab', () => {
    it('should open a canvas tab with correct properties', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openCanvasTab('canvas-1', 'My Game')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0]).toEqual({
        path: 'canvas://canvas-1',
        name: 'My Game',
        isDirty: false,
        type: 'canvas',
        isPreview: false,
      })
    })

    it('should set canvas tab as active', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openCanvasTab('canvas-1', 'My Game')
      })

      // Assert
      expect(result.current.activeTab).toBe('canvas://canvas-1')
    })

    it('should focus existing canvas tab if already open', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.openCanvasTab('canvas-1', 'My Game')
        result.current.selectTab('/test/file.lua')
      })

      expect(result.current.activeTab).toBe('/test/file.lua')

      // Act - try to open same canvas tab again
      act(() => {
        result.current.openCanvasTab('canvas-1', 'My Game')
      })

      // Assert - should focus existing tab without creating duplicate
      expect(result.current.tabs.filter((t) => t.type === 'canvas')).toHaveLength(1)
      expect(result.current.activeTab).toBe('canvas://canvas-1')
    })

    it('should generate unique canvas tab id with default name', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openCanvasTab('test-id')
      })

      // Assert
      expect(result.current.tabs[0].name).toBe('Canvas')
      expect(result.current.tabs[0].path).toBe('canvas://test-id')
    })
  })

  describe('canvas tab interactions with file tabs', () => {
    it('should allow mixing file and canvas tabs', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Act
      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.openCanvasTab('game-1', 'Game')
        result.current.openTab('/test/another.lua', 'another.lua')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(3)
      expect(result.current.tabs[0].type).toBe('file')
      expect(result.current.tabs[1].type).toBe('canvas')
      expect(result.current.tabs[2].type).toBe('file')
    })

    it('should close canvas tab like any other tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.openCanvasTab('game-1', 'Game')
      })

      // Act
      act(() => {
        result.current.closeTab('canvas://game-1')
      })

      // Assert
      expect(result.current.tabs).toHaveLength(1)
      expect(result.current.tabs[0].path).toBe('/test/file.lua')
    })

    it('should switch to file tab when closing active canvas tab', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
        result.current.openCanvasTab('game-1', 'Game')
      })

      expect(result.current.activeTab).toBe('canvas://game-1')

      // Act
      act(() => {
        result.current.closeTab('canvas://game-1')
      })

      // Assert
      expect(result.current.activeTab).toBe('/test/file.lua')
    })
  })

  describe('getActiveTabType', () => {
    it('should return null when no tab is active', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      // Assert
      expect(result.current.getActiveTabType()).toBeNull()
    })

    it('should return file when a file tab is active', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openTab('/test/file.lua', 'file.lua')
      })

      // Assert
      expect(result.current.getActiveTabType()).toBe('file')
    })

    it('should return canvas when a canvas tab is active', () => {
      // Arrange
      const { result } = renderHook(() => useTabBar())

      act(() => {
        result.current.openCanvasTab('game-1', 'Game')
      })

      // Assert
      expect(result.current.getActiveTabType()).toBe('canvas')
    })
  })

  describe('preview tabs', () => {
    describe('openPreviewTab', () => {
      it('should open a tab with isPreview set to true', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        // Act
        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        // Assert
        expect(result.current.tabs).toHaveLength(1)
        expect(result.current.tabs[0]).toEqual({
          path: '/test/file.lua',
          name: 'file.lua',
          isDirty: false,
          type: 'file',
          isPreview: true,
        })
      })

      it('should set the preview tab as active', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        // Act
        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        // Assert
        expect(result.current.activeTab).toBe('/test/file.lua')
      })

      it('should replace existing preview tab when opening another preview', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openPreviewTab('/test/file1.lua', 'file1.lua')
        })

        expect(result.current.tabs).toHaveLength(1)
        expect(result.current.tabs[0].path).toBe('/test/file1.lua')

        // Act
        act(() => {
          result.current.openPreviewTab('/test/file2.lua', 'file2.lua')
        })

        // Assert - should replace, not add
        expect(result.current.tabs).toHaveLength(1)
        expect(result.current.tabs[0].path).toBe('/test/file2.lua')
        expect(result.current.tabs[0].isPreview).toBe(true)
      })

      it('should not replace permanent tabs when opening preview', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openTab('/test/permanent.lua', 'permanent.lua')
        })

        // Act
        act(() => {
          result.current.openPreviewTab('/test/preview.lua', 'preview.lua')
        })

        // Assert - should have both tabs
        expect(result.current.tabs).toHaveLength(2)
        expect(result.current.tabs[0].path).toBe('/test/permanent.lua')
        expect(result.current.tabs[0].isPreview).toBe(false)
        expect(result.current.tabs[1].path).toBe('/test/preview.lua')
        expect(result.current.tabs[1].isPreview).toBe(true)
      })

      it('should activate existing tab if opening preview for already open permanent tab', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openTab('/test/file.lua', 'file.lua')
          result.current.openTab('/test/other.lua', 'other.lua')
        })

        expect(result.current.activeTab).toBe('/test/other.lua')

        // Act - try to open preview for already permanent tab
        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        // Assert - should just activate, not change preview state
        expect(result.current.activeTab).toBe('/test/file.lua')
        expect(result.current.tabs).toHaveLength(2)
        expect(result.current.tabs[0].isPreview).toBe(false)
      })

      it('should activate existing preview tab without creating duplicate', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
          result.current.openTab('/test/other.lua', 'other.lua')
        })

        expect(result.current.activeTab).toBe('/test/other.lua')

        // Act - try to open preview for already open preview tab
        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        // Assert
        expect(result.current.activeTab).toBe('/test/file.lua')
        expect(result.current.tabs).toHaveLength(2)
      })
    })

    describe('makeTabPermanent', () => {
      it('should convert preview tab to permanent', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        expect(result.current.tabs[0].isPreview).toBe(true)

        // Act
        act(() => {
          result.current.makeTabPermanent('/test/file.lua')
        })

        // Assert
        expect(result.current.tabs[0].isPreview).toBe(false)
      })

      it('should do nothing for already permanent tab', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openTab('/test/file.lua', 'file.lua')
        })

        expect(result.current.tabs[0].isPreview).toBe(false)

        // Act
        act(() => {
          result.current.makeTabPermanent('/test/file.lua')
        })

        // Assert
        expect(result.current.tabs[0].isPreview).toBe(false)
      })

      it('should only affect the specified tab', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openTab('/test/permanent.lua', 'permanent.lua')
          result.current.openPreviewTab('/test/preview.lua', 'preview.lua')
        })

        // Act
        act(() => {
          result.current.makeTabPermanent('/test/preview.lua')
        })

        // Assert
        expect(result.current.tabs[0].isPreview).toBe(false)
        expect(result.current.tabs[1].isPreview).toBe(false)
      })
    })

    describe('openTab with preview tabs', () => {
      it('should open permanent tab with isPreview false', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        // Act
        act(() => {
          result.current.openTab('/test/file.lua', 'file.lua')
        })

        // Assert
        expect(result.current.tabs[0].isPreview).toBe(false)
      })

      it('should not replace preview tab when opening permanent tab', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openPreviewTab('/test/preview.lua', 'preview.lua')
        })

        // Act
        act(() => {
          result.current.openTab('/test/permanent.lua', 'permanent.lua')
        })

        // Assert - should have both tabs
        expect(result.current.tabs).toHaveLength(2)
      })
    })

    describe('setDirty with preview tabs', () => {
      it('should convert preview tab to permanent when marked dirty', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        expect(result.current.tabs[0].isPreview).toBe(true)

        // Act
        act(() => {
          result.current.setDirty('/test/file.lua', true)
        })

        // Assert - should become permanent when edited
        expect(result.current.tabs[0].isDirty).toBe(true)
        expect(result.current.tabs[0].isPreview).toBe(false)
      })
    })

    describe('closeTab with preview tabs', () => {
      it('should close preview tab like any other tab', () => {
        // Arrange
        const { result } = renderHook(() => useTabBar())

        act(() => {
          result.current.openPreviewTab('/test/file.lua', 'file.lua')
        })

        // Act
        act(() => {
          result.current.closeTab('/test/file.lua')
        })

        // Assert
        expect(result.current.tabs).toHaveLength(0)
      })
    })
  })
})
