import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { Toast } from './Toast'
import type { ToastData } from './types'

describe('Toast', () => {
  const defaultToast: ToastData = {
    id: 'test-1',
    message: 'Test message',
    type: 'error',
  }

  it('should render message', () => {
    // Arrange & Act
    render(<Toast toast={defaultToast} onDismiss={vi.fn()} />)

    // Assert
    expect(screen.getByText('Test message')).toBeInTheDocument()
  })

  it('should call onDismiss when close button is clicked', () => {
    // Arrange
    const onDismiss = vi.fn()
    render(<Toast toast={defaultToast} onDismiss={onDismiss} />)

    // Act
    fireEvent.click(screen.getByRole('button', { name: /close/i }))

    // Assert
    expect(onDismiss).toHaveBeenCalledWith('test-1')
  })

  it('should have error styling for error type', () => {
    // Arrange & Act
    render(<Toast toast={{ ...defaultToast, type: 'error' }} onDismiss={vi.fn()} />)

    // Assert
    const toast = screen.getByRole('alert')
    // CSS modules mangle class names, so check for partial match
    expect(toast.className).toMatch(/error/)
  })

  it('should have info styling for info type', () => {
    // Arrange & Act
    render(<Toast toast={{ ...defaultToast, type: 'info' }} onDismiss={vi.fn()} />)

    // Assert
    const toast = screen.getByRole('alert')
    expect(toast.className).toMatch(/info/)
  })

  it('should have success styling for success type', () => {
    // Arrange & Act
    render(<Toast toast={{ ...defaultToast, type: 'success' }} onDismiss={vi.fn()} />)

    // Assert
    const toast = screen.getByRole('alert')
    expect(toast.className).toMatch(/success/)
  })

  it('should be accessible with alert role', () => {
    // Arrange & Act
    render(<Toast toast={defaultToast} onDismiss={vi.fn()} />)

    // Assert
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })
})
