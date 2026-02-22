/**
 * Tests for AnsiEditorTabContent component.
 * Verifies loading state when filesystem is not yet ready.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnsiEditorTabContent } from './AnsiEditorTabContent'

// Mock useIDE hook
const mockReadFile = vi.fn()
vi.mock('../IDEContext/useIDE', () => ({
  useIDE: vi.fn(() => ({
    fileSystem: {
      readFile: mockReadFile,
    },
  })),
}))

// Mock AnsiGraphicsEditor to avoid rendering the full editor
vi.mock('../AnsiGraphicsEditor', () => ({
  AnsiGraphicsEditor: vi.fn(({ filePath }: { filePath?: string }) => (
    <div data-testid="ansi-graphics-editor" data-file-path={filePath}>
      Mock Editor
    </div>
  )),
}))

describe('AnsiEditorTabContent', () => {
  beforeEach(() => {
    mockReadFile.mockReset()
  })

  describe('loading state', () => {
    it('shows loading text when readFile returns null for a workspace file', () => {
      mockReadFile.mockReturnValue(null)
      render(<AnsiEditorTabContent filePath="/workspace/test.ansi" />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByTestId('ansi-graphics-editor')).not.toBeInTheDocument()
    })

    it('renders editor when readFile returns content', () => {
      mockReadFile.mockReturnValue('{"layers":[]}')
      render(<AnsiEditorTabContent filePath="/workspace/test.ansi" />)

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByTestId('ansi-graphics-editor')).toBeInTheDocument()
    })

    it('renders editor immediately for new files with ansi-editor:// prefix', () => {
      render(<AnsiEditorTabContent filePath="ansi-editor://new" />)

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByTestId('ansi-graphics-editor')).toBeInTheDocument()
    })

    it('renders editor immediately when filePath is undefined', () => {
      render(<AnsiEditorTabContent />)

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByTestId('ansi-graphics-editor')).toBeInTheDocument()
    })
  })
})
