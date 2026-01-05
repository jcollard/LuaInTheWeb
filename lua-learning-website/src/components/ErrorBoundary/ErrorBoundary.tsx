/**
 * Error boundary component for catching unhandled React errors.
 *
 * Wraps the application to catch rendering errors and display
 * a recovery dialog with options to reload or reset cache.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorRecoveryDialogWrapper } from './ErrorRecoveryDialogWrapper'
import type { ErrorBoundaryProps, ErrorBoundaryState } from './types'

/**
 * Error boundary component.
 *
 * Must be a class component to use componentDidCatch lifecycle.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    }
  }

  /**
   * Update state when an error is caught.
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    }
  }

  /**
   * Log error information for debugging.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error)
    console.error('Component stack:', errorInfo.componentStack)

    this.setState({
      errorInfo,
    })
  }

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state
    const { children, fallback } = this.props

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback
      }

      // Use default recovery dialog
      return (
        <ErrorRecoveryDialogWrapper
          error={error}
          componentStack={errorInfo?.componentStack ?? null}
        />
      )
    }

    return children
  }
}
