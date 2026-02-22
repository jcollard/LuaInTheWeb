/**
 * Tests for AnsiEditorTabContent component.
 * Verifies loading state, multi-instance rendering, dirty indicators, and isActive prop.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AnsiEditorTabContent } from './AnsiEditorTabContent'
import type { AnsiGraphicsEditorProps } from '../AnsiGraphicsEditor/AnsiGraphicsEditor'

// Mock useIDE hook
const mockReadFile = vi.fn()
const mockSetTabDirty = vi.fn()
vi.mock('../IDEContext/useIDE', () => ({
  useIDE: vi.fn(() => ({
    fileSystem: {
      readFile: mockReadFile,
    },
    setTabDirty: mockSetTabDirty,
  })),
}))

// Mock AnsiGraphicsEditor to avoid rendering the full editor
vi.mock('../AnsiGraphicsEditor', () => ({
  AnsiGraphicsEditor: vi.fn(({ filePath, isActive, onDirtyChange }: AnsiGraphicsEditorProps) => (
    <div
      data-testid="ansi-graphics-editor"
      data-file-path={filePath}
      data-is-active={String(isActive)}
      data-has-dirty-change={String(!!onDirtyChange)}
    >
      Mock Editor
      {onDirtyChange && (
        <button data-testid={`trigger-dirty-${filePath}`} onClick={() => onDirtyChange(true)}>
          Trigger Dirty
        </button>
      )}
    </div>
  )),
}))

describe('AnsiEditorTabContent', () => {
  beforeEach(() => {
    mockReadFile.mockReset()
    mockSetTabDirty.mockReset()
  })

  describe('loading state', () => {
    it('shows loading text when readFile returns null for a workspace file', () => {
      mockReadFile.mockReturnValue(null)
      const tabBarProps = {
        tabs: [{ path: '/workspace/test.ansi', name: 'test.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false }],
        activeTab: '/workspace/test.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/workspace/test.ansi" />)

      expect(screen.getByText('Loading...')).toBeInTheDocument()
      expect(screen.queryByTestId('ansi-graphics-editor')).not.toBeInTheDocument()
    })

    it('renders editor when readFile returns content', () => {
      mockReadFile.mockReturnValue('{"layers":[]}')
      const tabBarProps = {
        tabs: [{ path: '/workspace/test.ansi', name: 'test.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false }],
        activeTab: '/workspace/test.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/workspace/test.ansi" />)

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByTestId('ansi-graphics-editor')).toBeInTheDocument()
    })

    it('renders editor immediately for new files with ansi-editor:// prefix', () => {
      const tabBarProps = {
        tabs: [{ path: 'ansi-editor://new', name: 'New', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false }],
        activeTab: 'ansi-editor://new',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="ansi-editor://new" />)

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByTestId('ansi-graphics-editor')).toBeInTheDocument()
    })

    it('renders editor immediately when filePath is undefined', () => {
      render(<AnsiEditorTabContent />)

      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
      expect(screen.getByTestId('ansi-graphics-editor')).toBeInTheDocument()
    })
  })

  describe('multi-instance rendering', () => {
    it('renders one editor instance per ansi-editor tab', () => {
      mockReadFile.mockReturnValue('{}')
      const tabBarProps = {
        tabs: [
          { path: '/a.ansi', name: 'a.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
          { path: '/b.ansi', name: 'b.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
        ],
        activeTab: '/a.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/a.ansi" />)

      const editors = screen.getAllByTestId('ansi-graphics-editor')
      expect(editors).toHaveLength(2)
    })

    it('passes isActive=true only to the active tab editor', () => {
      mockReadFile.mockReturnValue('{}')
      const tabBarProps = {
        tabs: [
          { path: '/a.ansi', name: 'a.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
          { path: '/b.ansi', name: 'b.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
        ],
        activeTab: '/a.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/a.ansi" />)

      const editors = screen.getAllByTestId('ansi-graphics-editor')
      const activeEditor = editors.find(e => e.dataset.filePath === '/a.ansi')
      const inactiveEditor = editors.find(e => e.dataset.filePath === '/b.ansi')
      expect(activeEditor?.dataset.isActive).toBe('true')
      expect(inactiveEditor?.dataset.isActive).toBe('false')
    })

    it('only renders non-ansi-editor tabs in tab bar but not as editors', () => {
      mockReadFile.mockReturnValue('{}')
      const tabBarProps = {
        tabs: [
          { path: '/a.ansi', name: 'a.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
          { path: '/code.lua', name: 'code.lua', type: 'file' as const, isDirty: false, isPinned: false, isPreview: false },
        ],
        activeTab: '/a.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/a.ansi" />)

      // Only one editor instance (for the ansi-editor tab)
      const editors = screen.getAllByTestId('ansi-graphics-editor')
      expect(editors).toHaveLength(1)

      // Both tabs shown in tab bar
      expect(screen.getByText('a.ansi')).toBeInTheDocument()
      expect(screen.getByText('code.lua')).toBeInTheDocument()
    })
  })

  describe('dirty indicators', () => {
    it('shows dirty indicator on dirty tabs', () => {
      mockReadFile.mockReturnValue('{}')
      const tabBarProps = {
        tabs: [
          { path: '/a.ansi', name: 'a.ansi', type: 'ansi-editor' as const, isDirty: true, isPinned: false, isPreview: false },
          { path: '/b.ansi', name: 'b.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
        ],
        activeTab: '/a.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/a.ansi" />)

      expect(screen.getByTestId('dirty-indicator-/a.ansi')).toBeInTheDocument()
      expect(screen.queryByTestId('dirty-indicator-/b.ansi')).not.toBeInTheDocument()
    })

    it('calls setTabDirty when onDirtyChange fires', () => {
      mockReadFile.mockReturnValue('{}')
      const tabBarProps = {
        tabs: [
          { path: '/a.ansi', name: 'a.ansi', type: 'ansi-editor' as const, isDirty: false, isPinned: false, isPreview: false },
        ],
        activeTab: '/a.ansi',
        onSelect: vi.fn(),
        onClose: vi.fn(),
      }
      render(<AnsiEditorTabContent tabBarProps={tabBarProps} filePath="/a.ansi" />)

      // Click the trigger button that our mock provides
      screen.getByTestId('trigger-dirty-/a.ansi').click()

      expect(mockSetTabDirty).toHaveBeenCalledWith('/a.ansi', true)
    })
  })
})
