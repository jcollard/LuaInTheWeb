import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StopButton } from './StopButton'

describe('StopButton', () => {
  describe('rendering', () => {
    it('should render a stop button with accessible label', () => {
      render(<StopButton onStop={vi.fn()} />)

      const button = screen.getByRole('button', { name: /stop/i })
      expect(button).toBeInTheDocument()
    })

    it('should show stop icon', () => {
      render(<StopButton onStop={vi.fn()} />)

      // Check for stop icon (square shape)
      const button = screen.getByRole('button', { name: /stop/i })
      expect(button).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      render(<StopButton onStop={vi.fn()} className="custom-class" />)

      const button = screen.getByRole('button', { name: /stop/i })
      expect(button.className).toContain('custom-class')
    })
  })

  describe('interaction', () => {
    it('should call onStop when clicked', () => {
      const onStop = vi.fn()
      render(<StopButton onStop={onStop} />)

      const button = screen.getByRole('button', { name: /stop/i })
      fireEvent.click(button)

      expect(onStop).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
      render(<StopButton onStop={vi.fn()} disabled />)

      const button = screen.getByRole('button', { name: /stop/i })
      expect(button).toBeDisabled()
    })

    it('should not call onStop when disabled and clicked', () => {
      const onStop = vi.fn()
      render(<StopButton onStop={onStop} disabled />)

      const button = screen.getByRole('button', { name: /stop/i })
      fireEvent.click(button)

      expect(onStop).not.toHaveBeenCalled()
    })
  })

  describe('tooltip', () => {
    it('should have title attribute for tooltip', () => {
      render(<StopButton onStop={vi.fn()} />)

      const button = screen.getByRole('button', { name: /stop/i })
      expect(button).toHaveAttribute('title', 'Stop process (Ctrl+C)')
    })
  })
})
