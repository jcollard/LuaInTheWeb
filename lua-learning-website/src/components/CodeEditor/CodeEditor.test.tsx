import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { CodeEditor } from './CodeEditor'

// Mock Monaco Editor - it doesn't work in jsdom
interface MockMonacoProps {
  value: string
  onChange?: (value: string | undefined) => void
  options?: { readOnly?: boolean }
  onMount?: (editor: unknown) => void
  loading?: React.ReactNode
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options, loading }: MockMonacoProps) => {
    // If loading is provided, we're simulating the loading state
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

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Cycle 2.0: Shows loading state before Monaco loads
  it('should show loading state before Monaco loads', () => {
    // Arrange & Act
    render(<CodeEditor value="__loading__" onChange={() => {}} />)

    // Assert
    expect(screen.getByText('Loading editor...')).toBeInTheDocument()
  })

  // Cycle 2.1: Renders without crashing
  it('should render the editor', () => {
    // Arrange & Act
    render(<CodeEditor value="" onChange={() => {}} />)

    // Assert
    expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
  })

  // Cycle 2.2: Displays initial value
  it('should display the provided value', () => {
    // Arrange & Act
    render(<CodeEditor value="print('hello')" onChange={() => {}} />)

    // Assert
    expect(screen.getByTestId('mock-monaco')).toHaveValue("print('hello')")
  })

  // Cycle 2.3: Calls onChange when edited
  it('should call onChange when content changes', async () => {
    // Arrange
    const onChange = vi.fn()
    render(<CodeEditor value="" onChange={onChange} />)

    // Act
    await userEvent.type(screen.getByTestId('mock-monaco'), 'x = 1')

    // Assert
    expect(onChange).toHaveBeenCalled()
  })

  // Cycle 2.4: Ctrl+Enter triggers onRun
  it('should call onRun when Ctrl+Enter is pressed', () => {
    // Arrange
    const onRun = vi.fn()
    render(<CodeEditor value="" onChange={() => {}} onRun={onRun} />)
    const wrapper = screen.getByTestId('code-editor-wrapper')

    // Act - simulate Ctrl+Enter on the wrapper
    fireEvent.keyDown(wrapper, { key: 'Enter', ctrlKey: true })

    // Assert
    expect(onRun).toHaveBeenCalled()
  })

  // Cycle 2.5: Respects readOnly prop
  it('should be read-only when readOnly=true', () => {
    // Arrange & Act
    render(<CodeEditor value="code" onChange={() => {}} readOnly />)

    // Assert
    expect(screen.getByTestId('mock-monaco')).toHaveProperty('readOnly', true)
  })

  // Cycle 2.6: Ctrl+Enter without onRun does not crash
  it('should not crash when Ctrl+Enter pressed without onRun handler', () => {
    // Arrange
    render(<CodeEditor value="" onChange={() => {}} />) // no onRun prop
    const wrapper = screen.getByTestId('code-editor-wrapper')

    // Act & Assert - should not throw
    expect(() => {
      fireEvent.keyDown(wrapper, { key: 'Enter', ctrlKey: true })
    }).not.toThrow()
    expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
  })
})
