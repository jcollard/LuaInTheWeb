import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { LoadingModal } from './LoadingModal'

describe('LoadingModal', () => {
  describe('when closed', () => {
    it('should not render anything when isOpen is false', () => {
      render(<LoadingModal isOpen={false} title="Loading..." />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  describe('when open', () => {
    it('should render the modal when isOpen is true', () => {
      render(<LoadingModal isOpen={true} title="Loading..." />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should display the title', () => {
      render(<LoadingModal isOpen={true} title="Loading workspace..." />)
      expect(screen.getByText('Loading workspace...')).toBeInTheDocument()
    })

    it('should display the message when provided', () => {
      render(
        <LoadingModal
          isOpen={true}
          title="Loading"
          message="Please wait while we load your files"
        />
      )
      expect(screen.getByText('Please wait while we load your files')).toBeInTheDocument()
    })

    it('should not display message element when not provided', () => {
      render(<LoadingModal isOpen={true} title="Loading" />)
      expect(screen.queryByTestId('loading-message')).not.toBeInTheDocument()
    })

    it('should render a spinner', () => {
      render(<LoadingModal isOpen={true} title="Loading" />)
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
    })

    it('should have proper accessibility attributes', () => {
      render(<LoadingModal isOpen={true} title="Loading workspace" />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-modal', 'true')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('should have aria-busy set to true', () => {
      render(<LoadingModal isOpen={true} title="Loading" />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('with progress', () => {
    it('should display progress count when progress is provided', () => {
      render(
        <LoadingModal
          isOpen={true}
          title="Uploading"
          progress={{ current: 3, total: 10 }}
        />
      )
      expect(screen.getByText('3 of 10 files')).toBeInTheDocument()
    })

    it('should display current file name when provided', () => {
      render(
        <LoadingModal
          isOpen={true}
          title="Uploading"
          progress={{ current: 1, total: 5, currentFile: 'example.lua' }}
        />
      )
      expect(screen.getByText('example.lua')).toBeInTheDocument()
    })

    it('should render a progress bar', () => {
      render(
        <LoadingModal
          isOpen={true}
          title="Uploading"
          progress={{ current: 5, total: 10 }}
        />
      )
      const progressBar = screen.getByRole('progressbar')
      expect(progressBar).toBeInTheDocument()
      expect(progressBar).toHaveAttribute('aria-valuenow', '5')
      expect(progressBar).toHaveAttribute('aria-valuemax', '10')
    })

    it('should update progress bar width based on progress', () => {
      render(
        <LoadingModal
          isOpen={true}
          title="Uploading"
          progress={{ current: 5, total: 10 }}
        />
      )
      const progressFill = screen.getByTestId('progress-fill')
      expect(progressFill).toHaveStyle({ width: '50%' })
    })
  })

  describe('with cancel button', () => {
    it('should not render cancel button when onCancel is not provided', () => {
      render(<LoadingModal isOpen={true} title="Loading" />)
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })

    it('should render cancel button when onCancel is provided', () => {
      const handleCancel = vi.fn()
      render(<LoadingModal isOpen={true} title="Loading" onCancel={handleCancel} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const handleCancel = vi.fn()
      render(<LoadingModal isOpen={true} title="Loading" onCancel={handleCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))
      expect(handleCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onCancel when Escape key is pressed', async () => {
      const user = userEvent.setup()
      const handleCancel = vi.fn()
      render(<LoadingModal isOpen={true} title="Loading" onCancel={handleCancel} />)

      await user.keyboard('{Escape}')
      expect(handleCancel).toHaveBeenCalledTimes(1)
    })
  })
})
