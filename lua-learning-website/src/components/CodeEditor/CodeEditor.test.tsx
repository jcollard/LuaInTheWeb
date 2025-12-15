import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import type { Theme } from '../../contexts/types'

// Use vi.hoisted to make variables available to mocks
const mockState = vi.hoisted(() => ({
  lastMonacoTheme: null as string | null,
  theme: 'dark' as Theme,
  lastOptions: null as Record<string, unknown> | null,
}))

// Mock Monaco Editor - it doesn't work in jsdom
interface MockMonacoProps {
  value: string
  onChange?: (value: string | undefined) => void
  options?: { readOnly?: boolean }
  onMount?: (editor: unknown) => void
  loading?: React.ReactNode
  theme?: string
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options, loading, theme }: MockMonacoProps) => {
    // Capture the theme prop and options
    mockState.lastMonacoTheme = theme ?? null
    mockState.lastOptions = options ?? null
    // If loading is provided, we're simulating the loading state
    if (loading && value === '__loading__') {
      return <div data-testid="monaco-loading">{loading}</div>
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

describe('CodeEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockState.lastMonacoTheme = null
    mockState.lastOptions = null
    mockState.theme = 'dark'
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

  // Cycle 2.5: Respects readOnly prop
  it('should be read-only when readOnly=true', () => {
    // Arrange & Act
    render(<CodeEditor value="code" onChange={() => {}} readOnly />)

    // Assert
    expect(screen.getByTestId('mock-monaco')).toHaveProperty('readOnly', true)
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

  describe('autocomplete behavior', () => {
    it('should disable automatic suggestions (only show on Ctrl+Space)', () => {
      // Arrange & Act
      render(<CodeEditor value="" onChange={() => {}} />)

      // Assert - quickSuggestions and suggestOnTriggerCharacters should be false
      expect(mockState.lastOptions?.quickSuggestions).toBe(false)
      expect(mockState.lastOptions?.suggestOnTriggerCharacters).toBe(false)
    })
  })
})
