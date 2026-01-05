import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ErrorRecoveryDialog } from './ErrorRecoveryDialog'

describe('ErrorRecoveryDialog', () => {
  const defaultProps = {
    error: new Error('Test error message'),
    componentStack: '\n    at TestComponent\n    at App',
    onReload: vi.fn(),
    onResetCache: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the dialog title', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('should render error description', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.getByText(/An unexpected error occurred/)).toBeInTheDocument()
    })

    it('should render Reload button', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /reload/i })).toBeInTheDocument()
    })

    it('should render Backup and Reset Cache button', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /backup and reset cache/i })).toBeInTheDocument()
    })

    it('should render Show Details button', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /show details/i })).toBeInTheDocument()
    })
  })

  describe('error details', () => {
    it('should not show error details by default', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument()
    })

    it('should show error details when Show Details is clicked', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /show details/i }))

      expect(screen.getByText(/Test error message/)).toBeInTheDocument()
    })

    it('should show component stack when details are visible', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /show details/i }))

      expect(screen.getByText(/TestComponent/)).toBeInTheDocument()
    })

    it('should toggle details visibility', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      const button = screen.getByRole('button', { name: /show details/i })

      fireEvent.click(button)
      expect(screen.getByText(/Test error message/)).toBeInTheDocument()

      fireEvent.click(screen.getByRole('button', { name: /hide details/i }))
      expect(screen.queryByText('Test error message')).not.toBeInTheDocument()
    })

    it('should handle null component stack gracefully', () => {
      render(<ErrorRecoveryDialog {...defaultProps} componentStack={null} />)

      fireEvent.click(screen.getByRole('button', { name: /show details/i }))

      expect(screen.getByText(/Test error message/)).toBeInTheDocument()
      // Should not throw
    })
  })

  describe('callbacks', () => {
    it('should call onReload when Reload is clicked', () => {
      const onReload = vi.fn()
      render(<ErrorRecoveryDialog {...defaultProps} onReload={onReload} />)

      fireEvent.click(screen.getByRole('button', { name: /reload/i }))

      expect(onReload).toHaveBeenCalled()
    })

    it('should show confirmation dialog when Backup and Reset Cache is clicked', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)

      fireEvent.click(screen.getByRole('button', { name: /backup and reset cache/i }))

      // Should show confirmation dialog
      expect(screen.getByText('Reset Cache?')).toBeInTheDocument()
      expect(screen.getByText(/This will erase all your saved data/)).toBeInTheDocument()
    })

    it('should call onResetCache when Reset Cache is clicked in confirmation', async () => {
      const onResetCache = vi.fn().mockResolvedValue(undefined)
      render(<ErrorRecoveryDialog {...defaultProps} onResetCache={onResetCache} />)

      // Click Backup and Reset Cache to open confirmation
      fireEvent.click(screen.getByRole('button', { name: /backup and reset cache/i }))

      // Click Reset Cache in confirmation
      fireEvent.click(screen.getByRole('button', { name: /^reset cache$/i }))

      expect(onResetCache).toHaveBeenCalled()
    })

    it('should call onExportData when Download Backup is clicked', async () => {
      const onExportData = vi.fn().mockResolvedValue(undefined)
      const onResetCache = vi.fn().mockResolvedValue(undefined)
      render(<ErrorRecoveryDialog {...defaultProps} onExportData={onExportData} onResetCache={onResetCache} />)

      // Click Backup and Reset Cache to open confirmation
      fireEvent.click(screen.getByRole('button', { name: /backup and reset cache/i }))

      // Click Download Backup in confirmation
      fireEvent.click(screen.getByRole('button', { name: /download backup/i }))

      expect(onExportData).toHaveBeenCalled()
      expect(onResetCache).not.toHaveBeenCalled()
    })

    it('should go back when Cancel is clicked in confirmation', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)

      // Click Backup and Reset Cache to open confirmation
      fireEvent.click(screen.getByRole('button', { name: /backup and reset cache/i }))
      expect(screen.getByText('Reset Cache?')).toBeInTheDocument()

      // Click Cancel
      fireEvent.click(screen.getByRole('button', { name: /cancel/i }))

      // Should be back to main dialog
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText('Reset Cache?')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have role="alertdialog"', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    })

    it('should have aria-labelledby pointing to title', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      const dialog = screen.getByRole('alertdialog')
      const titleId = dialog.getAttribute('aria-labelledby')
      expect(titleId).toBeDefined()
      expect(document.getElementById(titleId!)).toHaveTextContent('Something went wrong')
    })

    it('should have aria-describedby pointing to description', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)
      const dialog = screen.getByRole('alertdialog')
      const descId = dialog.getAttribute('aria-describedby')
      expect(descId).toBeDefined()
      expect(document.getElementById(descId!)).toHaveTextContent(/unexpected error/)
    })
  })

  describe('keyboard navigation', () => {
    it('should close on Escape key', () => {
      const onReload = vi.fn()
      render(<ErrorRecoveryDialog {...defaultProps} onReload={onReload} />)

      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

      expect(onReload).toHaveBeenCalled()
    })

    it('should go back to main dialog on Escape key in confirmation', () => {
      render(<ErrorRecoveryDialog {...defaultProps} />)

      // Open confirmation
      fireEvent.click(screen.getByRole('button', { name: /backup and reset cache/i }))
      expect(screen.getByText('Reset Cache?')).toBeInTheDocument()

      // Press Escape
      fireEvent.keyDown(screen.getByRole('alertdialog'), { key: 'Escape' })

      // Should be back to main dialog
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
      expect(screen.queryByText('Reset Cache?')).not.toBeInTheDocument()
    })
  })
})
