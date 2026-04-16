import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAnsiEditorFile, type FileSystemLike } from './useAnsiEditorFile'
import { deserializeLayers, serializeLayers } from './serialization'
import type { AnsiCell, AnsiGrid, DrawnLayer, Layer, RGBColor } from './types'
import { DEFAULT_FRAME_DURATION_MS } from './types'

function cell(char: string): AnsiCell {
  return { char, fg: [170, 170, 170] as RGBColor, bg: [0, 0, 0] as RGBColor }
}

function makeGrid(cols: number, rows: number, fill = ' '): AnsiGrid {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => cell(fill)))
}

function makeDrawnLayer(id: string, cols: number, rows: number): DrawnLayer {
  const grid = makeGrid(cols, rows)
  return {
    type: 'drawn', id, name: id, visible: true,
    grid, frames: [grid], currentFrameIndex: 0,
    frameDurationMs: DEFAULT_FRAME_DURATION_MS,
  }
}

interface RecordingFs extends FileSystemLike {
  files: Map<string, string>
}

function makeRecordingFs(initial: Record<string, string> = {}): RecordingFs {
  const files = new Map<string, string>(Object.entries(initial))
  return {
    files,
    readFile: (path) => files.get(path) ?? null,
    writeFile: (path, content) => { files.set(path, content) },
    createFile: (path, content) => { files.set(path, content) },
    exists: (path) => files.has(path),
    flush: () => Promise.resolve(),
  }
}

function mountHook(filePath: string | undefined, fileSystem: FileSystemLike) {
  return renderHook(() => useAnsiEditorFile({
    filePath,
    fileSystem,
    refreshFileTree: vi.fn(),
    updateAnsiEditorTabPath: vi.fn(),
    closeSaveDialog: vi.fn(),
  }))
}

describe('useAnsiEditorFile — canvas dimension roundtrip', () => {
  // Silence the "failed to parse" console.error that fires when mountHook
  // reads a placeholder file at mount; tests set up their own content.
  let errorSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => { errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) })
  afterEach(() => { errorSpy.mockRestore() })

  function validStubContent(): string {
    return serializeLayers({ layers: [makeDrawnLayer('bg', 80, 25)], activeLayerId: 'bg', cols: 80, rows: 25 })
  }

  it('handleSave writes the passed cols/rows into the file width/height', async () => {
    const fs = makeRecordingFs({ '/art.ansi.lua': validStubContent() })
    const { result } = mountHook('/art.ansi.lua', fs)

    const layers: Layer[] = [makeDrawnLayer('bg', 120, 40)]
    const markClean = vi.fn()
    const openSaveDialog = vi.fn()

    await act(async () => {
      await result.current.handleSave(layers, 'bg', [], 120, 40, markClean, openSaveDialog)
    })

    const content = fs.files.get('/art.ansi.lua')!
    expect(content).toBeTruthy()
    expect(markClean).toHaveBeenCalled()
    expect(openSaveDialog).not.toHaveBeenCalled()

    // Serialized file should carry the actual project dims.
    expect(content).toContain('["width"] = 120')
    expect(content).toContain('["height"] = 40')

    // And the load path should recover those dims.
    const restored = deserializeLayers(content)
    expect(restored.cols).toBe(120)
    expect(restored.rows).toBe(40)
  })

  it('handleSaveAs writes the passed cols/rows into a new file', async () => {
    const fs = makeRecordingFs()
    const { result } = mountHook('ansi-editor://untitled', fs)

    const layers: Layer[] = [makeDrawnLayer('bg', 40, 10)]

    await act(async () => {
      await result.current.handleSaveAs('/projects', 'small.ansi.lua', layers, 'bg', [], 40, 10)
    })

    const content = fs.files.get('/projects/small.ansi.lua')!
    expect(content).toBeTruthy()
    expect(content).toContain('["width"] = 40')
    expect(content).toContain('["height"] = 10')

    const restored = deserializeLayers(content)
    expect(restored.cols).toBe(40)
    expect(restored.rows).toBe(10)
  })

  it('save → reload roundtrip preserves non-default dimensions', async () => {
    const fs = makeRecordingFs({ '/big.ansi.lua': validStubContent() })
    const { result: saveHook } = mountHook('/big.ansi.lua', fs)

    const layers: Layer[] = [makeDrawnLayer('bg', 160, 60)]
    await act(async () => {
      await saveHook.current.handleSave(layers, 'bg', [], 160, 60, vi.fn(), vi.fn())
    })

    // Simulate reopening the file through a fresh hook mount.
    const { result: loadHook } = mountHook('/big.ansi.lua', fs)
    const loaded = loadHook.current.initialLayerState
    expect(loaded).toBeDefined()
    expect(loaded!.cols).toBe(160)
    expect(loaded!.rows).toBe(60)
  })
})
