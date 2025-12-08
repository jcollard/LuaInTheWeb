import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'

// Mock xterm and its addons
vi.mock('@xterm/xterm', () => ({
  Terminal: class MockTerminal {
    loadAddon = vi.fn()
    open = vi.fn()
    attachCustomKeyEventHandler = vi.fn()
    onData = vi.fn()
    dispose = vi.fn()
    write = vi.fn()
    writeln = vi.fn()
    clear = vi.fn()
    buffer = {
      active: {
        cursorY: 0,
      },
    }
  },
}))

vi.mock('@xterm/addon-fit', () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn()
  },
}))

import BashTerminal from './BashTerminal'

describe('BashTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('standalone mode (default)', () => {
    it('should render Output header by default', () => {
      // Arrange & Act
      render(<BashTerminal />)

      // Assert
      expect(screen.getByRole('heading', { name: /output/i })).toBeInTheDocument()
    })

    it('should render terminal container by default', () => {
      // Arrange & Act
      render(<BashTerminal />)

      // Assert
      expect(screen.getByTestId('bash-terminal-container')).toBeInTheDocument()
    })
  })

  describe('embedded mode', () => {
    it('should not render Output header when embedded', () => {
      // Arrange & Act
      render(<BashTerminal embedded />)

      // Assert
      expect(screen.queryByRole('heading', { name: /output/i })).not.toBeInTheDocument()
    })

    it('should render terminal container when embedded', () => {
      // Arrange & Act
      render(<BashTerminal embedded />)

      // Assert
      expect(screen.getByTestId('bash-terminal-container')).toBeInTheDocument()
    })

    it('should add embedded class when embedded', () => {
      // Arrange & Act
      render(<BashTerminal embedded />)

      // Assert
      const container = screen.getByTestId('bash-terminal-container')
      expect(container).toHaveClass('bash-terminal-container--embedded')
    })
  })
})
