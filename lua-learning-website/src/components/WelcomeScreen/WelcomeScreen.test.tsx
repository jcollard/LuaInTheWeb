import { render, screen, fireEvent } from '@testing-library/react'
import { WelcomeScreen } from './WelcomeScreen'
import type { RecentFile } from '../../hooks/useRecentFiles'

describe('WelcomeScreen', () => {
  const mockOnCreateFile = vi.fn()
  const mockOnOpenFile = vi.fn()
  const mockOnOpenShell = vi.fn()
  const mockOnClearRecentFiles = vi.fn()

  const defaultProps = {
    onCreateFile: mockOnCreateFile,
    onOpenFile: mockOnOpenFile,
    onOpenShell: mockOnOpenShell,
    onClearRecentFiles: mockOnClearRecentFiles,
    recentFiles: [] as RecentFile[],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render welcome title', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} />)

      // Assert
      expect(screen.getByText('Welcome to Lua IDE')).toBeInTheDocument()
    })

    it('should render New File button', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /new file/i })).toBeInTheDocument()
    })

    it('should render Open Shell button', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /open shell/i })).toBeInTheDocument()
    })

    it('should render Recent Files section', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} />)

      // Assert
      expect(screen.getByText('Recent Files')).toBeInTheDocument()
    })

    it('should apply custom className', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} className="custom-class" />)

      // Assert
      expect(screen.getByTestId('welcome-screen')).toHaveClass('custom-class')
    })
  })

  describe('actions', () => {
    it('should call onCreateFile when New File button clicked', () => {
      // Arrange
      render(<WelcomeScreen {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /new file/i }))

      // Assert
      expect(mockOnCreateFile).toHaveBeenCalledTimes(1)
    })

    it('should call onOpenShell when Open Shell button clicked', () => {
      // Arrange
      render(<WelcomeScreen {...defaultProps} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /open shell/i }))

      // Assert
      expect(mockOnOpenShell).toHaveBeenCalledTimes(1)
    })
  })

  describe('recent files - empty state', () => {
    it('should show empty state message when no recent files', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} recentFiles={[]} />)

      // Assert
      expect(screen.getByText(/no recent files/i)).toBeInTheDocument()
    })

    it('should not show clear button when no recent files', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} recentFiles={[]} />)

      // Assert
      expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument()
    })
  })

  describe('recent files - with files', () => {
    const recentFiles: RecentFile[] = [
      { path: '/main.lua', name: 'main.lua', accessedAt: 1000 },
      { path: '/utils/helpers.lua', name: 'helpers.lua', accessedAt: 900 },
    ]

    it('should render recent file items', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)

      // Assert
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.getByText('helpers.lua')).toBeInTheDocument()
    })

    it('should show file path as secondary info', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)

      // Assert
      expect(screen.getByText('/main.lua')).toBeInTheDocument()
      expect(screen.getByText('/utils/helpers.lua')).toBeInTheDocument()
    })

    it('should call onOpenFile with path when recent file clicked', () => {
      // Arrange
      render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)

      // Act
      fireEvent.click(screen.getByText('main.lua'))

      // Assert
      expect(mockOnOpenFile).toHaveBeenCalledWith('/main.lua')
    })

    it('should show clear button when recent files exist', () => {
      // Arrange & Act
      render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)

      // Assert
      expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument()
    })

    it('should call onClearRecentFiles when clear button clicked', () => {
      // Arrange
      render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /clear/i }))

      // Assert
      expect(mockOnClearRecentFiles).toHaveBeenCalledTimes(1)
    })
  })

  describe('keyboard accessibility', () => {
    it('should have focusable New File button', () => {
      // Arrange
      render(<WelcomeScreen {...defaultProps} />)
      const button = screen.getByRole('button', { name: /new file/i })

      // Act & Assert - button should be focusable
      button.focus()
      expect(document.activeElement).toBe(button)
    })

    it('should allow keyboard activation of recent file item via Enter', () => {
      // Arrange
      const recentFiles: RecentFile[] = [
        { path: '/main.lua', name: 'main.lua', accessedAt: 1000 },
      ]
      render(<WelcomeScreen {...defaultProps} recentFiles={recentFiles} />)
      const fileItem = screen.getByText('main.lua').closest('button')!

      // Act
      fireEvent.keyDown(fileItem, { key: 'Enter' })

      // Assert
      expect(mockOnOpenFile).toHaveBeenCalledWith('/main.lua')
    })
  })
})
