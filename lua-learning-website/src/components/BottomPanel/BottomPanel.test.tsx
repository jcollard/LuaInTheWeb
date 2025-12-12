import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { BottomPanel } from './BottomPanel'
import type { UseFileSystemReturn } from '../../hooks/useFileSystem'

// Mock ShellTerminal since it uses xterm which doesn't work in jsdom
vi.mock('../ShellTerminal', () => ({
  ShellTerminal: ({ embedded }: { embedded?: boolean }) => (
    <div data-testid="shell-terminal" data-embedded={embedded}>
      ShellTerminal Mock
    </div>
  ),
}))

describe('BottomPanel', () => {
  const mockFileSystem = {} as UseFileSystemReturn

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render bottom panel', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      expect(screen.getByTestId('bottom-panel')).toBeInTheDocument()
    })

    it('should render Shell tab', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      expect(screen.getByRole('tab', { name: /shell/i })).toBeInTheDocument()
    })

    it('should have Shell tab selected', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      expect(screen.getByRole('tab', { name: /shell/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
    })

    it('should render ShellTerminal with embedded prop', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      const shellTerminal = screen.getByTestId('shell-terminal')
      expect(shellTerminal).toBeInTheDocument()
      expect(shellTerminal).toHaveAttribute('data-embedded', 'true')
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} className="custom-class" />)

      // Assert
      expect(screen.getByTestId('bottom-panel')).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have tablist role for tab container', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should have tabpanel role for content area', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      expect(screen.getByRole('tabpanel')).toBeInTheDocument()
    })

    it('should have aria-controls linking tab to panel', () => {
      // Arrange & Act
      render(<BottomPanel fileSystem={mockFileSystem} />)

      // Assert
      const tab = screen.getByRole('tab', { name: /shell/i })
      expect(tab).toHaveAttribute('aria-controls', 'shell-tabpanel')
    })
  })
})
