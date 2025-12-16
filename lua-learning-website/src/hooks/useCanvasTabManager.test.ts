import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCanvasTabManager } from './useCanvasTabManager'
import type { TabInfo } from '../components/TabBar/types'

describe('useCanvasTabManager', () => {
  const mockOpenCanvasTab = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleRunCanvas', () => {
    it('should not open canvas tab when code is empty', () => {
      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: '',
          tabs: [],
          activeTab: null,
          activeTabType: null,
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      act(() => {
        result.current.handleRunCanvas()
      })

      expect(mockOpenCanvasTab).not.toHaveBeenCalled()
    })

    it('should not open canvas tab when code is whitespace only', () => {
      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: '   \n\t  ',
          tabs: [],
          activeTab: null,
          activeTabType: null,
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      act(() => {
        result.current.handleRunCanvas()
      })

      expect(mockOpenCanvasTab).not.toHaveBeenCalled()
    })

    it('should open canvas tab with unique id when code has content', () => {
      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: 'print("hello")',
          tabs: [],
          activeTab: null,
          activeTabType: null,
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      act(() => {
        result.current.handleRunCanvas()
      })

      expect(mockOpenCanvasTab).toHaveBeenCalledTimes(1)
      expect(mockOpenCanvasTab).toHaveBeenCalledWith(
        expect.stringMatching(/^canvas-\d+$/),
        'Canvas'
      )
    })
  })

  describe('hasCanvasTabs', () => {
    it('should return false when no tabs exist', () => {
      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: '',
          tabs: [],
          activeTab: null,
          activeTabType: null,
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      expect(result.current.hasCanvasTabs).toBe(false)
    })

    it('should return false when only file tabs exist', () => {
      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', isDirty: false, type: 'file' },
        { path: '/file2.lua', name: 'file2.lua', isDirty: false, type: 'file' },
      ]

      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: '',
          tabs,
          activeTab: '/file1.lua',
          activeTabType: 'file',
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      expect(result.current.hasCanvasTabs).toBe(false)
    })

    it('should return true when canvas tabs exist', () => {
      const tabs: TabInfo[] = [
        { path: '/file1.lua', name: 'file1.lua', isDirty: false, type: 'file' },
        { path: 'canvas://canvas-123', name: 'Canvas', isDirty: false, type: 'canvas' },
      ]

      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: '',
          tabs,
          activeTab: '/file1.lua',
          activeTabType: 'file',
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      expect(result.current.hasCanvasTabs).toBe(true)
    })
  })

  describe('canvasCode', () => {
    it('should return empty string when no canvas tabs', () => {
      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: 'print("hello")',
          tabs: [],
          activeTab: null,
          activeTabType: null,
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      expect(result.current.canvasCode).toBe('')
    })

    it('should return code for active canvas tab after running', () => {
      const code = 'print("canvas code")'
      let canvasTabPath = ''

      // Capture the canvas tab path when openCanvasTab is called
      mockOpenCanvasTab.mockImplementation((id: string) => {
        canvasTabPath = `canvas://${id}`
      })

      const { result, rerender } = renderHook(
        (props) => useCanvasTabManager(props),
        {
          initialProps: {
            code,
            tabs: [] as TabInfo[],
            activeTab: null as string | null,
            activeTabType: null as 'file' | 'canvas' | null,
            openCanvasTab: mockOpenCanvasTab,
          },
        }
      )

      // Run canvas to store the code
      act(() => {
        result.current.handleRunCanvas()
      })

      // Simulate the canvas tab being opened and active
      const tabs: TabInfo[] = [
        { path: canvasTabPath, name: 'Canvas', isDirty: false, type: 'canvas' },
      ]

      rerender({
        code,
        tabs,
        activeTab: canvasTabPath,
        activeTabType: 'canvas',
        openCanvasTab: mockOpenCanvasTab,
      })

      expect(result.current.canvasCode).toBe(code)
    })

    it('should preserve canvas code when switching to file tab', () => {
      const code = 'print("canvas code")'
      let canvasTabPath = ''

      mockOpenCanvasTab.mockImplementation((id: string) => {
        canvasTabPath = `canvas://${id}`
      })

      const { result, rerender } = renderHook(
        (props) => useCanvasTabManager(props),
        {
          initialProps: {
            code,
            tabs: [] as TabInfo[],
            activeTab: null as string | null,
            activeTabType: null as 'file' | 'canvas' | null,
            openCanvasTab: mockOpenCanvasTab,
          },
        }
      )

      // Run canvas
      act(() => {
        result.current.handleRunCanvas()
      })

      // Canvas tab is now active
      const canvasTab: TabInfo = { path: canvasTabPath, name: 'Canvas', isDirty: false, type: 'canvas' }
      const fileTab: TabInfo = { path: '/file.lua', name: 'file.lua', isDirty: false, type: 'file' }

      rerender({
        code,
        tabs: [canvasTab, fileTab],
        activeTab: canvasTabPath,
        activeTabType: 'canvas',
        openCanvasTab: mockOpenCanvasTab,
      })

      // Switch to file tab - canvas should still have its code
      rerender({
        code: 'different code',
        tabs: [canvasTab, fileTab],
        activeTab: '/file.lua',
        activeTabType: 'file',
        openCanvasTab: mockOpenCanvasTab,
      })

      // Canvas code should be preserved (from last active canvas tab)
      expect(result.current.canvasCode).toBe(code)
    })
  })

  describe('handleCanvasExit', () => {
    it('should be callable without errors', () => {
      const { result } = renderHook(() =>
        useCanvasTabManager({
          code: '',
          tabs: [],
          activeTab: null,
          activeTabType: null,
          openCanvasTab: mockOpenCanvasTab,
        })
      )

      // Should not throw
      expect(() => {
        result.current.handleCanvasExit(0)
        result.current.handleCanvasExit(1)
      }).not.toThrow()
    })
  })
})
