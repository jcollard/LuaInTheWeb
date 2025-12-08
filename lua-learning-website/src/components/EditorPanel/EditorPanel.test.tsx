import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { EditorPanel } from './EditorPanel'

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

describe('EditorPanel', () => {
  const defaultProps = {
    code: 'print("hello")',
    onChange: vi.fn(),
    fileName: 'main.lua',
    isDirty: false,
    onRun: vi.fn(),
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

    it('should render run button in toolbar', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
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

  describe('run button', () => {
    it('should call onRun when run button is clicked', () => {
      // Arrange
      const onRun = vi.fn()
      render(<EditorPanel {...defaultProps} onRun={onRun} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /run/i }))

      // Assert
      expect(onRun).toHaveBeenCalled()
    })

    it('should show "Running..." when isRunning is true', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} isRunning={true} />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toHaveTextContent('Running...')
    })

    it('should show "Run" when isRunning is false', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} isRunning={false} />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toHaveTextContent('Run')
    })

    it('should disable run button when isRunning is true', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} isRunning={true} />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toBeDisabled()
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
      expect(screen.getByTestId('editor-panel')).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have aria-label for run button', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toHaveAttribute('aria-label')
    })

    it('should indicate running state in aria-label', () => {
      // Arrange & Act
      render(<EditorPanel {...defaultProps} isRunning={true} />)

      // Assert
      const runButton = screen.getByRole('button', { name: /run/i })
      expect(runButton.getAttribute('aria-label')).toMatch(/running/i)
    })
  })
})
