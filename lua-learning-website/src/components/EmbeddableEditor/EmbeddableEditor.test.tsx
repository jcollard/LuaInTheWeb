import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { EmbeddableEditor } from './EmbeddableEditor'

// Mock Monaco Editor - it doesn't work in jsdom
interface MockMonacoProps {
  value: string
  onChange?: (value: string | undefined) => void
  options?: { readOnly?: boolean }
  loading?: React.ReactNode
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options, loading }: MockMonacoProps) => {
    if (loading && value === '__loading__') {
      return <div data-testid="monaco-loading">{loading}</div>
    }
    return (
      <textarea
        data-testid="mock-monaco"
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={options?.readOnly}
      />
    )
  },
}))

// Mock useLuaEngine
const mockExecute = vi.fn()
const mockReset = vi.fn()

vi.mock('../../hooks/useLuaEngine', () => ({
  useLuaEngine: vi.fn((options: { onOutput?: (msg: string) => void; onError?: (msg: string) => void }) => {
    ;(mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput = options.onOutput
    ;(mockExecute as unknown as { _onError?: (msg: string) => void })._onError = options.onError
    return {
      isReady: true,
      execute: mockExecute,
      reset: mockReset,
    }
  }),
}))

describe('EmbeddableEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render with minimal props (just code)', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="print('hello')" />)

      // Assert
      expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
      expect(screen.getByTestId('mock-monaco')).toHaveValue("print('hello')")
    })

    it('should render toolbar by default when runnable', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
    })

    it('should render reset button by default when not readOnly', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" />)

      // Assert
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })

    it('should render output panel by default when runnable', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" />)

      // Assert
      expect(screen.getByTestId('output-panel')).toBeInTheDocument()
    })
  })

  describe('toolbar visibility', () => {
    it('should hide toolbar when showToolbar={false}', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" showToolbar={false} />)

      // Assert
      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })

    it('should hide toolbar when runnable={false}', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" runnable={false} />)

      // Assert
      expect(screen.queryByRole('button', { name: /run/i })).not.toBeInTheDocument()
    })

    it('should hide reset button when readOnly', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" readOnly />)

      // Assert
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })

    it('should hide reset button when showReset={false}', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" showReset={false} />)

      // Assert
      expect(screen.queryByRole('button', { name: /reset/i })).not.toBeInTheDocument()
    })
  })

  describe('output panel visibility', () => {
    it('should hide output panel when showOutput={false}', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" showOutput={false} />)

      // Assert
      expect(screen.queryByTestId('output-panel')).not.toBeInTheDocument()
    })

    it('should hide output panel when runnable={false}', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" runnable={false} />)

      // Assert
      expect(screen.queryByTestId('output-panel')).not.toBeInTheDocument()
    })
  })

  describe('read-only mode', () => {
    it('should make editor read-only when readOnly=true', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="code" readOnly />)

      // Assert
      expect(screen.getByTestId('mock-monaco')).toHaveProperty('readOnly', true)
    })
  })

  describe('run button', () => {
    it('should execute code when run button is clicked', async () => {
      // Arrange
      render(<EmbeddableEditor code="print('test')" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      expect(mockExecute).toHaveBeenCalledWith("print('test')")
    })

    it('should call onRun callback when code is executed', async () => {
      // Arrange
      const onRun = vi.fn()
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('output')
      })
      render(<EmbeddableEditor code="test" onRun={onRun} />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Wait for async execution to complete
      await vi.waitFor(() => {
        expect(onRun).toHaveBeenCalledWith('test', 'output')
      })
    })
  })

  describe('reset button', () => {
    it('should restore initial code when reset is clicked', async () => {
      // Arrange
      render(<EmbeddableEditor code="initial code" />)
      const editor = screen.getByTestId('mock-monaco')

      // Modify code
      fireEvent.change(editor, { target: { value: 'modified code' } })
      expect(editor).toHaveValue('modified code')

      // Act
      const resetButton = screen.getByRole('button', { name: /reset/i })
      fireEvent.click(resetButton)

      // Assert
      expect(screen.getByTestId('mock-monaco')).toHaveValue('initial code')
    })
  })

  describe('output display', () => {
    it('should display execution output', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('Hello, World!')
      })
      render(<EmbeddableEditor code="print('hello')" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      await vi.waitFor(() => {
        expect(screen.getByTestId('output-panel')).toHaveTextContent('Hello, World!')
      })
    })

    it('should display error messages', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
        onError?.('Lua error: syntax error')
      })
      render(<EmbeddableEditor code="invalid lua" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      await vi.waitFor(() => {
        expect(screen.getByTestId('output-panel')).toHaveTextContent('Lua error: syntax error')
      })
    })
  })

  describe('onChange callback', () => {
    it('should call onChange when code is edited', () => {
      // Arrange
      const onChange = vi.fn()
      render(<EmbeddableEditor code="initial" onChange={onChange} />)
      const editor = screen.getByTestId('mock-monaco')

      // Act
      fireEvent.change(editor, { target: { value: 'updated' } })

      // Assert
      expect(onChange).toHaveBeenCalledWith('updated')
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" className="custom-class" />)

      // Assert
      expect(screen.getByTestId('embeddable-editor')).toHaveClass('custom-class')
    })
  })

  describe('edge cases', () => {
    it('should render without error when code is empty string', () => {
      // Arrange & Act & Assert
      expect(() => {
        render(<EmbeddableEditor code="" />)
      }).not.toThrow()
    })

    it('should handle code with special characters', () => {
      // Arrange
      const specialCode = 'print("Hello\\nWorld")'

      // Act & Assert
      expect(() => {
        render(<EmbeddableEditor code={specialCode} />)
      }).not.toThrow()
      expect(screen.getByTestId('mock-monaco')).toHaveValue(specialCode)
    })
  })

  describe('output panel content', () => {
    it('should show placeholder text when no output', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" />)

      // Assert
      expect(screen.getByText('Run code to see output...')).toBeInTheDocument()
    })

    it('should show Output header', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" />)

      // Assert
      expect(screen.getByText('Output')).toBeInTheDocument()
    })

    it('should display multiple output lines', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('line 1')
        onOutput?.('line 2')
        onOutput?.('line 3')
      })
      render(<EmbeddableEditor code="test" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      await vi.waitFor(() => {
        expect(screen.getByText('line 1')).toBeInTheDocument()
        expect(screen.getByText('line 2')).toBeInTheDocument()
        expect(screen.getByText('line 3')).toBeInTheDocument()
      })
    })

    it('should hide placeholder when output exists', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onOutput = (mockExecute as unknown as { _onOutput?: (msg: string) => void })._onOutput
        onOutput?.('output')
      })
      render(<EmbeddableEditor code="test" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      await vi.waitFor(() => {
        expect(screen.queryByText('Run code to see output...')).not.toBeInTheDocument()
      })
    })

    it('should hide placeholder when error exists', async () => {
      // Arrange
      mockExecute.mockImplementation(async () => {
        const onError = (mockExecute as unknown as { _onError?: (msg: string) => void })._onError
        onError?.('error')
      })
      render(<EmbeddableEditor code="test" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      await vi.waitFor(() => {
        expect(screen.queryByText('Run code to see output...')).not.toBeInTheDocument()
      })
    })
  })

  describe('run button state', () => {
    it('should show "Run" text when not running', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toHaveTextContent('Run')
    })

    it('should show "Running..." text while executing', async () => {
      // Arrange
      let resolveExecution: () => void
      const executionPromise = new Promise<void>(resolve => {
        resolveExecution = resolve
      })
      mockExecute.mockImplementation(() => executionPromise)
      render(<EmbeddableEditor code="" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert - button should show Running...
      expect(screen.getByRole('button', { name: /run/i })).toHaveTextContent('Running...')

      // Cleanup
      await vi.waitFor(async () => {
        resolveExecution!()
      })
    })

    it('should disable run button while executing', async () => {
      // Arrange
      let resolveExecution: () => void
      const executionPromise = new Promise<void>(resolve => {
        resolveExecution = resolve
      })
      mockExecute.mockImplementation(() => executionPromise)
      render(<EmbeddableEditor code="" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      expect(runButton).toBeDisabled()

      // Cleanup
      await vi.waitFor(async () => {
        resolveExecution!()
      })
    })

    it('should re-enable run button after execution completes', async () => {
      // Arrange
      mockExecute.mockResolvedValue(undefined)
      render(<EmbeddableEditor code="" />)
      const runButton = screen.getByRole('button', { name: /run/i })

      // Act
      fireEvent.click(runButton)

      // Assert
      await vi.waitFor(() => {
        expect(runButton).not.toBeDisabled()
        expect(runButton).toHaveTextContent('Run')
      })
    })
  })

  describe('conditional rendering logic', () => {
    it('should show toolbar when showToolbar=true even if runnable=false', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" runnable={false} showToolbar={true} />)

      // Assert
      expect(screen.getByRole('button', { name: /run/i })).toBeInTheDocument()
    })

    it('should show output when showOutput=true even if runnable=false', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" runnable={false} showOutput={true} />)

      // Assert
      expect(screen.getByTestId('output-panel')).toBeInTheDocument()
    })

    it('should show reset when showReset=true even if readOnly', () => {
      // Arrange & Act
      render(<EmbeddableEditor code="" readOnly={true} showReset={true} />)

      // Assert
      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
    })
  })
})
