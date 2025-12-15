import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLuaDiagnostics } from './useLuaDiagnostics'
import type { Monaco } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'

// Mock Monaco types
type MockMonaco = {
  editor: {
    setModelMarkers: ReturnType<typeof vi.fn>
  }
  MarkerSeverity: {
    Error: number
    Warning: number
    Info: number
    Hint: number
  }
}

type MockModel = {
  uri: string
}

describe('useLuaDiagnostics', () => {
  let mockMonaco: MockMonaco
  let mockModel: MockModel

  beforeEach(() => {
    mockMonaco = {
      editor: {
        setModelMarkers: vi.fn(),
      },
      MarkerSeverity: {
        Error: 8,
        Warning: 4,
        Info: 2,
        Hint: 1,
      },
    }
    mockModel = {
      uri: 'file:///test.lua',
    }
  })

  describe('setError', () => {
    it('sets marker for a Lua error', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(
          mockMonaco as unknown as Monaco,
          mockModel as unknown as editor.ITextModel
        )
      )

      act(() => {
        result.current.setError('[string "code"]:5: unexpected symbol near \'in\'')
      })

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'lua-diagnostics',
        [
          expect.objectContaining({
            startLineNumber: 5,
            endLineNumber: 5,
            message: "unexpected symbol near 'in'",
            severity: 8, // Error
          }),
        ]
      )
    })

    it('places marker at line 1 for unparseable errors', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(
          mockMonaco as unknown as Monaco,
          mockModel as unknown as editor.ITextModel
        )
      )

      act(() => {
        result.current.setError('Some generic error')
      })

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'lua-diagnostics',
        [
          expect.objectContaining({
            startLineNumber: 1,
            endLineNumber: 1,
            message: 'Some generic error',
          }),
        ]
      )
    })

    it('does nothing when monaco is null', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(null, mockModel as unknown as editor.ITextModel)
      )

      act(() => {
        result.current.setError('[string "code"]:1: error')
      })

      expect(mockMonaco.editor.setModelMarkers).not.toHaveBeenCalled()
    })

    it('does nothing when model is null', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(mockMonaco as unknown as Monaco, null)
      )

      act(() => {
        result.current.setError('[string "code"]:1: error')
      })

      expect(mockMonaco.editor.setModelMarkers).not.toHaveBeenCalled()
    })
  })

  describe('clearErrors', () => {
    it('clears all markers', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(
          mockMonaco as unknown as Monaco,
          mockModel as unknown as editor.ITextModel
        )
      )

      act(() => {
        result.current.clearErrors()
      })

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'lua-diagnostics',
        []
      )
    })

    it('does nothing when monaco is null', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(null, mockModel as unknown as editor.ITextModel)
      )

      act(() => {
        result.current.clearErrors()
      })

      expect(mockMonaco.editor.setModelMarkers).not.toHaveBeenCalled()
    })

    it('does nothing when model is null', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(mockMonaco as unknown as Monaco, null)
      )

      act(() => {
        result.current.clearErrors()
      })

      expect(mockMonaco.editor.setModelMarkers).not.toHaveBeenCalled()
    })
  })

  describe('marker details', () => {
    it('sets correct column range (full line)', () => {
      const { result } = renderHook(() =>
        useLuaDiagnostics(
          mockMonaco as unknown as Monaco,
          mockModel as unknown as editor.ITextModel
        )
      )

      act(() => {
        result.current.setError('[string "code"]:3: error message')
      })

      expect(mockMonaco.editor.setModelMarkers).toHaveBeenCalledWith(
        mockModel,
        'lua-diagnostics',
        [
          expect.objectContaining({
            startColumn: 1,
            endColumn: 1000, // Highlight entire line
          }),
        ]
      )
    })
  })
})
