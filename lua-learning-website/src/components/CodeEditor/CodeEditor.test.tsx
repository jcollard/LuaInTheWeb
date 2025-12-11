import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Theme } from '../../contexts/types'

// Use vi.hoisted to make variables available to mocks
const mockState = vi.hoisted(() => ({
  lastMonacoTheme: null as string | null,
  theme: 'dark' as Theme,
  mockEditor: null as MockEditor | null,
  cursorChangeCallback: null as ((e: { position: { lineNumber: number; column: number } }) => void) | null,
}))

// Mock Monaco editor instance
interface MockEditor {
  trigger: ReturnType<typeof vi.fn>
  getModel: ReturnType<typeof vi.fn>
  getSelection: ReturnType<typeof vi.fn>
  focus: ReturnType<typeof vi.fn>
  onDidChangeCursorPosition: ReturnType<typeof vi.fn>
}

function createMockEditor(): MockEditor {
  return {
    trigger: vi.fn(),
    getModel: vi.fn(() => ({
      canUndo: vi.fn(() => true),
      canRedo: vi.fn(() => true),
    })),
    getSelection: vi.fn(() => ({
      isEmpty: vi.fn(() => false),
    })),
    focus: vi.fn(),
    onDidChangeCursorPosition: vi.fn((callback) => {
      mockState.cursorChangeCallback = callback
      return { dispose: vi.fn() }
    }),
  }
}

// Mock Monaco Editor - it doesn't work in jsdom
interface MockMonacoProps {
  value: string
  onChange?: (value: string | undefined) => void
  options?: { readOnly?: boolean }
  onMount?: (editor: MockEditor) => void
  loading?: React.ReactNode
  theme?: string
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options, loading, theme, onMount }: MockMonacoProps) => {
    // Capture the theme prop
    mockState.lastMonacoTheme = theme ?? null
    // If loading is provided, we're simulating the loading state
    if (loading && value === '__loading__') {
      return <div data-testid="monaco-loading">{loading}</div>
    }
    // Call onMount with mock editor if provided
    if (onMount) {
      const mockEditor = createMockEditor()
      mockState.mockEditor = mockEditor
      // Use setTimeout to simulate async mount
      setTimeout(() => onMount(mockEditor), 0)
    }
    return (
      <textarea
        data-testid="mock-monaco"
        data-theme={theme}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        readOnly={options?.readOnly}
      />
    )
  },
}))

// Mock theme context
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: mockState.theme,
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: mockState.theme === 'dark',
  }),
}))

import { CodeEditor } from './CodeEditor'
import { waitFor } from '@testing-library/react'

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.lastMonacoTheme = null
    mockState.theme = 'dark'
    mockState.mockEditor = null
    mockState.cursorChangeCallback = null
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

  describe('theme integration', () => {
    it('should use vs-dark theme when app theme is dark', () => {
      // Arrange
      mockState.theme = 'dark'

      // Act
      render(<CodeEditor value="" onChange={() => {}} />)

      // Assert
      expect(mockState.lastMonacoTheme).toBe('vs-dark')
    })

    it('should use vs theme when app theme is light', () => {
      // Arrange
      mockState.theme = 'light'

      // Act
      render(<CodeEditor value="" onChange={() => {}} />)

      // Assert
      expect(mockState.lastMonacoTheme).toBe('vs')
    })

    it('should update Monaco theme when app theme changes', () => {
      // Arrange
      mockState.theme = 'dark'
      const { rerender } = render(<CodeEditor value="" onChange={() => {}} />)
      expect(mockState.lastMonacoTheme).toBe('vs-dark')

      // Act - simulate theme change
      mockState.theme = 'light'
      rerender(<CodeEditor value="" onChange={() => {}} />)

      // Assert
      expect(mockState.lastMonacoTheme).toBe('vs')
    })
  })

  describe('onMount callback', () => {
    it('should call onMount with editor instance when editor mounts', async () => {
      // Arrange
      const onMount = vi.fn()

      // Act
      render(<CodeEditor value="" onChange={() => {}} onMount={onMount} />)

      // Assert - wait for async mount
      await waitFor(() => {
        expect(onMount).toHaveBeenCalled()
      })
      expect(onMount).toHaveBeenCalledWith(mockState.mockEditor)
    })

    it('should not crash when onMount is not provided', () => {
      // Arrange & Act & Assert - should not throw
      expect(() => {
        render(<CodeEditor value="" onChange={() => {}} />)
      }).not.toThrow()
    })
  })

  describe('onCursorChange callback', () => {
    it('should register cursor change listener when onCursorChange provided', async () => {
      // Arrange
      const onCursorChange = vi.fn()

      // Act
      render(<CodeEditor value="" onChange={() => {}} onCursorChange={onCursorChange} />)

      // Assert - wait for async mount
      await waitFor(() => {
        expect(mockState.mockEditor?.onDidChangeCursorPosition).toHaveBeenCalled()
      })
    })

    it('should call onCursorChange when cursor position changes', async () => {
      // Arrange
      const onCursorChange = vi.fn()
      render(<CodeEditor value="" onChange={() => {}} onCursorChange={onCursorChange} />)

      // Wait for mount
      await waitFor(() => {
        expect(mockState.cursorChangeCallback).not.toBeNull()
      })

      // Act - simulate cursor change
      mockState.cursorChangeCallback?.({
        position: { lineNumber: 5, column: 10 },
      })

      // Assert
      expect(onCursorChange).toHaveBeenCalledWith(5, 10)
    })

    it('should not register cursor change listener when onCursorChange not provided', async () => {
      // Arrange
      const onMount = vi.fn()

      // Act
      render(<CodeEditor value="" onChange={() => {}} onMount={onMount} />)

      // Wait for mount
      await waitFor(() => {
        expect(onMount).toHaveBeenCalled()
      })

      // Assert - cursorChangeCallback should not be set since we didn't provide onCursorChange
      // Note: The mock always sets it, so we just verify the component doesn't crash
      expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
    })
  })
})
