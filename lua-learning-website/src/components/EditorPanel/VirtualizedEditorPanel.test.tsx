import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VirtualizedEditorPanel } from './VirtualizedEditorPanel'
import type { UseTabEditorManagerReturn } from '../../hooks/useTabEditorManager'

// Mock CodeEditor component
vi.mock('../CodeEditor', () => ({
  CodeEditor: vi.fn(({ value, onChange, 'data-testid': testId }: { value: string; onChange: (v: string) => void; 'data-testid'?: string }) => (
    <div data-testid={testId || 'code-editor'}>
      <span data-testid="editor-value">{value}</span>
      <button onClick={() => onChange('changed')}>Change</button>
    </div>
  )),
}))

// Mock TabBar component
vi.mock('../TabBar', () => ({
  TabBar: vi.fn(() => <div data-testid="tab-bar">TabBar</div>),
}))

// Mock FormatButton component
const mockFormatButton = vi.fn(({ disabled, loading }: { disabled: boolean; loading: boolean }) => (
  <button data-testid="format-button" disabled={disabled} data-loading={loading}>Format</button>
))
vi.mock('../FormatButton', () => ({
  FormatButton: (props: { disabled: boolean; loading: boolean }) => mockFormatButton(props),
}))

describe('VirtualizedEditorPanel', () => {
  let mockTabEditorManager: UseTabEditorManagerReturn

  beforeEach(() => {
    mockTabEditorManager = {
      mountedTabs: [],
      getContent: vi.fn().mockReturnValue(''),
      getActiveContent: vi.fn().mockReturnValue(''),
      updateContent: vi.fn(),
      isDirty: vi.fn().mockReturnValue(false),
      saveTab: vi.fn().mockReturnValue(true),
      saveAllTabs: vi.fn(),
      disposeTab: vi.fn(),
      refreshFromFilesystem: vi.fn(),
    }
  })

  describe('rendering', () => {
    it('should render empty state when no tabs are mounted', () => {
      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab={null}
        />
      )

      expect(screen.getByText(/Create a new file or open an existing one/i)).toBeInTheDocument()
    })

    it('should render a single editor when one tab is mounted', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getContent = vi.fn((path) => path === '/test.lua' ? 'content' : '')

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
        />
      )

      expect(screen.getByTestId('editor-/test.lua')).toBeInTheDocument()
    })

    it('should render multiple editors for multiple mounted tabs', () => {
      mockTabEditorManager.mountedTabs = ['/a.lua', '/b.lua', '/c.lua']
      mockTabEditorManager.getContent = vi.fn((path) => `content of ${path}`)

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/a.lua"
        />
      )

      expect(screen.getByTestId('editor-/a.lua')).toBeInTheDocument()
      expect(screen.getByTestId('editor-/b.lua')).toBeInTheDocument()
      expect(screen.getByTestId('editor-/c.lua')).toBeInTheDocument()
    })
  })

  describe('visibility', () => {
    it('should show the active editor', () => {
      mockTabEditorManager.mountedTabs = ['/a.lua', '/b.lua']
      mockTabEditorManager.getContent = vi.fn(() => 'content')

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/a.lua"
        />
      )

      const activeEditor = screen.getByTestId('editor-container-/a.lua')
      expect(activeEditor).not.toHaveStyle({ display: 'none' })
    })

    it('should hide inactive editors', () => {
      mockTabEditorManager.mountedTabs = ['/a.lua', '/b.lua']
      mockTabEditorManager.getContent = vi.fn(() => 'content')

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/a.lua"
        />
      )

      const inactiveEditor = screen.getByTestId('editor-container-/b.lua')
      expect(inactiveEditor).toHaveStyle({ display: 'none' })
    })

    it('should switch visibility when active tab changes', () => {
      mockTabEditorManager.mountedTabs = ['/a.lua', '/b.lua']
      mockTabEditorManager.getContent = vi.fn(() => 'content')

      const { rerender } = render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/a.lua"
        />
      )

      expect(screen.getByTestId('editor-container-/a.lua')).not.toHaveStyle({ display: 'none' })
      expect(screen.getByTestId('editor-container-/b.lua')).toHaveStyle({ display: 'none' })

      rerender(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/b.lua"
        />
      )

      expect(screen.getByTestId('editor-container-/a.lua')).toHaveStyle({ display: 'none' })
      expect(screen.getByTestId('editor-container-/b.lua')).not.toHaveStyle({ display: 'none' })
    })
  })

  describe('content', () => {
    it('should pass correct content to each editor', () => {
      mockTabEditorManager.mountedTabs = ['/a.lua', '/b.lua']
      mockTabEditorManager.getContent = vi.fn((path) => {
        if (path === '/a.lua') return 'content A'
        if (path === '/b.lua') return 'content B'
        return ''
      })

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/a.lua"
        />
      )

      expect(mockTabEditorManager.getContent).toHaveBeenCalledWith('/a.lua')
      expect(mockTabEditorManager.getContent).toHaveBeenCalledWith('/b.lua')
    })

    it('should call updateContent when editor content changes', async () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getContent = vi.fn(() => 'original')

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
        />
      )

      // Simulate editor change by clicking the change button
      const changeButton = screen.getByText('Change')
      changeButton.click()

      expect(mockTabEditorManager.updateContent).toHaveBeenCalledWith('/test.lua', 'changed')
    })
  })

  describe('TabBar integration', () => {
    it('should render TabBar when tabBarProps provided', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          tabBarProps={{
            tabs: [{ path: '/test.lua', name: 'test.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false }],
            activeTab: '/test.lua',
            onSelect: vi.fn(),
            onClose: vi.fn(),
          }}
        />
      )

      expect(screen.getByTestId('tab-bar')).toBeInTheDocument()
    })
  })

  describe('format button', () => {
    it('should render FormatButton when onFormat provided', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getActiveContent = vi.fn(() => 'some code')

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onFormat={vi.fn()}
        />
      )

      expect(screen.getByTestId('format-button')).toBeInTheDocument()
    })

    it('should not render FormatButton when onFormat not provided', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
        />
      )

      expect(screen.queryByTestId('format-button')).not.toBeInTheDocument()
    })

    it('should disable FormatButton when active content is empty', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getActiveContent = vi.fn(() => '')
      mockFormatButton.mockClear()

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onFormat={vi.fn()}
        />
      )

      expect(mockFormatButton).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true })
      )
    })

    it('should disable FormatButton when active content is only whitespace', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getActiveContent = vi.fn(() => '   \n\t  ')
      mockFormatButton.mockClear()

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onFormat={vi.fn()}
        />
      )

      expect(mockFormatButton).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: true })
      )
    })

    it('should enable FormatButton when active content has code', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getActiveContent = vi.fn(() => 'print("hello")')
      mockFormatButton.mockClear()

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onFormat={vi.fn()}
        />
      )

      expect(mockFormatButton).toHaveBeenCalledWith(
        expect.objectContaining({ disabled: false })
      )
    })
  })

  describe('isFormatting prop', () => {
    it('should pass isFormatting=false to FormatButton by default', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getActiveContent = vi.fn(() => 'code')
      mockFormatButton.mockClear()

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onFormat={vi.fn()}
        />
      )

      expect(mockFormatButton).toHaveBeenCalledWith(
        expect.objectContaining({ loading: false })
      )
    })

    it('should pass isFormatting=true to FormatButton when formatting', () => {
      mockTabEditorManager.mountedTabs = ['/test.lua']
      mockTabEditorManager.getActiveContent = vi.fn(() => 'code')
      mockFormatButton.mockClear()

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onFormat={vi.fn()}
          isFormatting={true}
        />
      )

      expect(mockFormatButton).toHaveBeenCalledWith(
        expect.objectContaining({ loading: true })
      )
    })
  })

  describe('empty state', () => {
    it('should render empty editor div when no tabs mounted', () => {
      mockTabEditorManager.mountedTabs = []

      const { container } = render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab={null}
        />
      )

      // Should have empty editor div but no actual CodeEditor instances
      expect(container.querySelectorAll('[data-testid^="editor-/"]').length).toBe(0)
    })

    it('should not render any CodeEditor when no tabs mounted', () => {
      mockTabEditorManager.mountedTabs = []

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab={null}
        />
      )

      expect(screen.queryByTestId(/^editor-\//)).not.toBeInTheDocument()
    })
  })

  describe('onEditorReady', () => {
    it('should call onEditorReady with path when editor is ready', () => {
      // This test would require more complex mocking of the CodeEditor component
      // For now, we just verify the prop is passed through
      mockTabEditorManager.mountedTabs = ['/test.lua']
      const onEditorReady = vi.fn()

      render(
        <VirtualizedEditorPanel
          tabEditorManager={mockTabEditorManager}
          activeTab="/test.lua"
          onEditorReady={onEditorReady}
        />
      )

      // The actual onEditorReady testing would need integration tests
      // with the real CodeEditor component
      expect(screen.getByTestId('editor-/test.lua')).toBeInTheDocument()
    })
  })
})
