import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { EditorPanel } from './EditorPanel'
import type { TabInfo } from '../TabBar'

// Mock Monaco Editor - it doesn't work in jsdom
interface MockMonacoProps {
  value: string
  onChange?: (value: string | undefined) => void
  options?: { readOnly?: boolean }
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: MockMonacoProps) => {
    return (
      <textarea
        data-testid="mock-monaco"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
      />
    )
  },
}))

// Mock theme context (CodeEditor uses useTheme)
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}))

describe('EditorPanel', () => {
  const defaultProps = {
    code: 'print("hello")',
    onChange: vi.fn(),
    fileName: 'main.lua',
    isDirty: false,
  }

  const mockTabs: TabInfo[] = [
    { path: '/main.lua', name: 'main.lua', isDirty: false, type: 'file', isPreview: false, isPinned: false },
    { path: '/utils/math.lua', name: 'math.lua', isDirty: true, type: 'file', isPreview: false, isPinned: false },
  ]

  const defaultTabBarProps = {
    tabs: mockTabs,
    activeTab: '/main.lua',
    onSelect: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render CodeEditor', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} />)

      // Assert
      expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
    })

    it('should render tab with filename', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} fileName="test.lua" />)

      // Assert
      expect(screen.getByText('test.lua')).toBeInTheDocument()
    })
  })

  describe('dirty indicator', () => {
    it('should show dirty indicator (*) when isDirty is true', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} isDirty={true} />)

      // Assert - filename should have * suffix
      expect(screen.getByText(/main\.lua\s*\*/)).toBeInTheDocument()
    })

    it('should not show dirty indicator when isDirty is false', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} isDirty={false} />)

      // Assert - filename should not have *
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.queryByText(/\*/)).not.toBeInTheDocument()
    })
  })

  describe('code changes', () => {
    it('should call onChange when code is edited', () => {
      // Arrange
      const onChange = vi.fn()
      render(<EditorPanel {...defaultProps} onChange={onChange} />)

      // Act
      fireEvent.change(screen.getByTestId('mock-monaco'), {
        target: { value: 'new code' },
      })

      // Assert
      expect(onChange).toHaveBeenCalledWith('new code')
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} className="custom-class" />)

      // Assert
      expect(screen.getByTestId('code-editor-panel')).toHaveClass('custom-class')
    })
  })

  describe('TabBar integration', () => {
    it('should render TabBar when tabBarProps provided', () => {
      // Arrange & Act
      render(
        <EditorPanel
          {...defaultProps}
          tabBarProps={defaultTabBarProps}
        />
      )

      // Assert
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should render all tabs from tabBarProps', () => {
      // Arrange & Act
      render(
        <EditorPanel
          {...defaultProps}
          tabBarProps={defaultTabBarProps}
        />
      )

      // Assert
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.getByText('math.lua')).toBeInTheDocument()
    })

    it('should highlight active tab', () => {
      // Arrange & Act
      render(
        <EditorPanel
          {...defaultProps}
          tabBarProps={defaultTabBarProps}
        />
      )

      // Assert
      const mainTab = screen.getByRole('tab', { name: /main\.lua/i })
      expect(mainTab).toHaveAttribute('aria-selected', 'true')
    })

    it('should call onSelect when tab is clicked', () => {
      // Arrange
      const onSelect = vi.fn()
      render(
        <EditorPanel
          {...defaultProps}
          tabBarProps={{ ...defaultTabBarProps, onSelect }}
        />
      )

      // Act
      fireEvent.click(screen.getByRole('tab', { name: /math\.lua/i }))

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/utils/math.lua')
    })

    it('should call onClose when tab close button is clicked', () => {
      // Arrange
      const onClose = vi.fn()
      render(
        <EditorPanel
          {...defaultProps}
          tabBarProps={{ ...defaultTabBarProps, onClose }}
        />
      )

      // Act
      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      fireEvent.click(closeButtons[0])

      // Assert
      expect(onClose).toHaveBeenCalledWith('/main.lua')
    })

    it('should show dirty indicator on modified tabs', () => {
      // Arrange & Act
      render(
        <EditorPanel
          {...defaultProps}
          tabBarProps={defaultTabBarProps}
        />
      )

      // Assert
      const mathTab = screen.getByRole('tab', { name: /math\.lua/i })
      expect(mathTab.textContent).toMatch(/\*/)
    })

    it('should fall back to single tab display when tabBarProps not provided', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} />)

      // Assert
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
      expect(screen.getByText('main.lua')).toBeInTheDocument()
    })
  })

  describe('empty state', () => {
    it('should show welcome message when no file is open', () => {
      // Arrange & Act
      render(
        <EditorPanel
          code=""
          onChange={vi.fn()}
          fileName={null}
          isDirty={false}
        />
      )

      // Assert
      expect(screen.getByText(/create a new file/i)).toBeInTheDocument()
    })

    it('should still show editor when no file is open', () => {
      // Arrange & Act
      render(
        <EditorPanel
          code=""
          onChange={vi.fn()}
          fileName={null}
          isDirty={false}
        />
      )

      // Assert - editor should still be visible for quick experimentation
      expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
    })

    it('should not show tab area when no file is open', () => {
      // Arrange & Act
      render(
        <EditorPanel
          code=""
          onChange={vi.fn()}
          fileName={null}
          isDirty={false}
        />
      )

      // Assert - no tabs or tab-like elements should be shown
      expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    })
  })

  describe('format button', () => {
    it('should render format button when onFormat is provided', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} onFormat={vi.fn()} />)

      // Assert
      expect(screen.getByRole('button', { name: /format/i })).toBeInTheDocument()
    })

    it('should not render format button when onFormat is not provided', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} />)

      // Assert
      expect(screen.queryByRole('button', { name: /format/i })).not.toBeInTheDocument()
    })

    it('should call onFormat when format button is clicked', () => {
      // Arrange
      const onFormat = vi.fn()
      render(<EditorPanel {...defaultProps} onFormat={onFormat} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /format/i }))

      // Assert
      expect(onFormat).toHaveBeenCalledTimes(1)
    })

    it('should show loading state when isFormatting is true', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} onFormat={vi.fn()} isFormatting />)

      // Assert
      expect(screen.getByRole('button', { name: /formatting/i })).toBeInTheDocument()
    })

    it('should disable format button when code is empty', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} code="" onFormat={vi.fn()} />)

      // Assert
      expect(screen.getByRole('button', { name: /format/i })).toBeDisabled()
    })

    it('should disable format button when code is whitespace only', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} code="   " onFormat={vi.fn()} />)

      // Assert
      expect(screen.getByRole('button', { name: /format/i })).toBeDisabled()
    })

    it('should enable format button when code has content', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} code='print("hello")' onFormat={vi.fn()} />)

      // Assert
      expect(screen.getByRole('button', { name: /format/i })).not.toBeDisabled()
    })
  })

})
