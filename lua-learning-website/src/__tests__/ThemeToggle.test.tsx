import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeToggle } from '../components/ThemeToggle'
import { useTheme } from '../contexts'

// Mock the useTheme hook
vi.mock('../contexts', () => ({
  useTheme: vi.fn(),
}))

describe('ThemeToggle', () => {
  const mockToggleTheme = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders a button element', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByRole('button')).toBeInTheDocument()
    })

    it('displays moon icon when in dark mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByLabelText('Switch to light mode')).toBeInTheDocument()
    })

    it('displays sun icon when in light mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'light',
        isDark: false,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByLabelText('Switch to dark mode')).toBeInTheDocument()
    })

    it('renders moon icon SVG in dark mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
      // Moon icon has a specific path
      const path = svg?.querySelector('path')
      expect(path).toBeInTheDocument()
    })

    it('renders sun icon SVG in light mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'light',
        isDark: false,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      const button = screen.getByRole('button')
      const svg = button.querySelector('svg')
      expect(svg).toBeInTheDocument()
      // Sun icon has a specific path
      const path = svg?.querySelector('path')
      expect(path).toBeInTheDocument()
    })
  })

  describe('interaction', () => {
    it('calls toggleTheme when clicked', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      fireEvent.click(screen.getByRole('button'))

      expect(mockToggleTheme).toHaveBeenCalledTimes(1)
    })

    it('calls toggleTheme when Enter key is pressed', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      fireEvent.keyDown(screen.getByRole('button'), { key: 'Enter' })

      expect(mockToggleTheme).toHaveBeenCalledTimes(1)
    })

    it('calls toggleTheme when Space key is pressed', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      fireEvent.keyDown(screen.getByRole('button'), { key: ' ' })

      expect(mockToggleTheme).toHaveBeenCalledTimes(1)
    })

    it('does not call toggleTheme for other keys', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      const button = screen.getByRole('button')

      // Try various keys that should NOT trigger the toggle
      fireEvent.keyDown(button, { key: 'a' })
      fireEvent.keyDown(button, { key: 'Tab' })
      fireEvent.keyDown(button, { key: 'Escape' })
      fireEvent.keyDown(button, { key: 'ArrowDown' })

      expect(mockToggleTheme).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('has correct aria-label for dark mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Switch to light mode'
      )
    })

    it('has correct aria-label for light mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'light',
        isDark: false,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByRole('button')).toHaveAttribute(
        'aria-label',
        'Switch to dark mode'
      )
    })

    it('has correct title tooltip for dark mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Switch to light mode'
      )
    })

    it('has correct title tooltip for light mode', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'light',
        isDark: false,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle />)

      expect(screen.getByRole('button')).toHaveAttribute(
        'title',
        'Switch to dark mode'
      )
    })
  })

  describe('className prop', () => {
    it('applies additional className when provided', () => {
      ;(useTheme as Mock).mockReturnValue({
        theme: 'dark',
        isDark: true,
        toggleTheme: mockToggleTheme,
      })

      render(<ThemeToggle className="custom-class" />)

      expect(screen.getByRole('button')).toHaveClass('custom-class')
    })
  })
})
