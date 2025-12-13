import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FormatButton } from './FormatButton'

describe('FormatButton', () => {
  describe('rendering', () => {
    it('should render a format button with accessible label', () => {
      render(<FormatButton onFormat={vi.fn()} />)

      const button = screen.getByRole('button', { name: /format/i })
      expect(button).toBeInTheDocument()
    })

    it('should show format icon', () => {
      render(<FormatButton onFormat={vi.fn()} />)

      const button = screen.getByRole('button', { name: /format/i })
      expect(button.querySelector('svg')).toBeInTheDocument()
    })

    it('should apply custom className when provided', () => {
      render(<FormatButton onFormat={vi.fn()} className="custom-class" />)

      const button = screen.getByRole('button', { name: /format/i })
      expect(button.className).toContain('custom-class')
    })
  })

  describe('interaction', () => {
    it('should call onFormat when clicked', () => {
      const onFormat = vi.fn()
      render(<FormatButton onFormat={onFormat} />)

      const button = screen.getByRole('button', { name: /format/i })
      fireEvent.click(button)

      expect(onFormat).toHaveBeenCalledTimes(1)
    })

    it('should be disabled when disabled prop is true', () => {
      render(<FormatButton onFormat={vi.fn()} disabled />)

      const button = screen.getByRole('button', { name: /format/i })
      expect(button).toBeDisabled()
    })

    it('should not call onFormat when disabled and clicked', () => {
      const onFormat = vi.fn()
      render(<FormatButton onFormat={onFormat} disabled />)

      const button = screen.getByRole('button', { name: /format/i })
      fireEvent.click(button)

      expect(onFormat).not.toHaveBeenCalled()
    })
  })

  describe('loading state', () => {
    it('should show loading state when loading prop is true', () => {
      render(<FormatButton onFormat={vi.fn()} loading />)

      const button = screen.getByRole('button', { name: /formatting/i })
      expect(button).toBeInTheDocument()
    })

    it('should be disabled when loading', () => {
      render(<FormatButton onFormat={vi.fn()} loading />)

      const button = screen.getByRole('button', { name: /formatting/i })
      expect(button).toBeDisabled()
    })
  })

  describe('tooltip', () => {
    it('should have title attribute for tooltip', () => {
      render(<FormatButton onFormat={vi.fn()} />)

      const button = screen.getByRole('button', { name: /format/i })
      expect(button).toHaveAttribute('title', 'Format code (Shift+Alt+F)')
    })
  })
})
