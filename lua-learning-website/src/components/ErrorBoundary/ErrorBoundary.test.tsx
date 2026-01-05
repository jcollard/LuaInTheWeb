import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorBoundary } from './ErrorBoundary'

// Mock the useErrorRecovery hook
vi.mock('./useErrorRecovery', () => ({
  useErrorRecovery: () => ({
    showDetails: false,
    toggleDetails: vi.fn(),
    isExporting: false,
    exportProgress: null,
    handleReload: vi.fn(),
    handleExportAndReset: vi.fn(),
  }),
}))

// Component that throws an error
function ThrowingComponent({ shouldThrow = true }: { shouldThrow?: boolean }) {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>Child content</div>
}

// Suppress React error boundary console.error during tests
const originalError = console.error
beforeEach(() => {
  console.error = (...args: unknown[]) => {
    // Filter out React error boundary logs
    if (typeof args[0] === 'string' && args[0].includes('Error boundaries should')) {
      return
    }
    if (typeof args[0] === 'string' && args[0].includes('The above error occurred')) {
      return
    }
    originalError(...args)
  }
})

describe('ErrorBoundary', () => {
  describe('when no error', () => {
    it('should render children when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      )

      expect(screen.getByText('Child content')).toBeInTheDocument()
    })

    it('should not show error dialog when no error', () => {
      render(
        <ErrorBoundary>
          <div>Child content</div>
        </ErrorBoundary>
      )

      expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    })
  })

  describe('when error occurs', () => {
    it('should catch errors and display recovery dialog', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should not render children when error occurs', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(screen.queryByText('Child content')).not.toBeInTheDocument()
    })

    it('should display error details', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      // Click show details
      fireEvent.click(screen.getByRole('button', { name: /show details/i }))

      expect(screen.getByText(/Test error/)).toBeInTheDocument()
    })
  })

  describe('custom fallback', () => {
    it('should use custom fallback when provided', () => {
      render(
        <ErrorBoundary fallback={<div>Custom fallback</div>}>
          <ThrowingComponent />
        </ErrorBoundary>
      )

      expect(screen.getByText('Custom fallback')).toBeInTheDocument()
    })
  })

  describe('static methods', () => {
    it('should have getDerivedStateFromError', () => {
      expect(ErrorBoundary.getDerivedStateFromError).toBeDefined()
    })

    it('getDerivedStateFromError should return error state', () => {
      const error = new Error('test')
      const state = ErrorBoundary.getDerivedStateFromError(error)
      expect(state.hasError).toBe(true)
      expect(state.error).toBe(error)
    })
  })
})
