import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { UploadConflictDialog } from './UploadConflictDialog'

describe('UploadConflictDialog', () => {
  const defaultProps = {
    isOpen: true,
    conflictingFiles: ['file1.txt', 'file2.lua'],
    onConfirm: vi.fn(),
    onCancel: vi.fn(),
  }

  describe('rendering', () => {
    it('should render dialog when open with conflicts', () => {
      render(<UploadConflictDialog {...defaultProps} />)

      expect(screen.getByTestId('upload-conflict-dialog')).toBeInTheDocument()
      expect(screen.getByText('Replace Existing Files?')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      render(<UploadConflictDialog {...defaultProps} isOpen={false} />)

      expect(screen.queryByTestId('upload-conflict-dialog')).not.toBeInTheDocument()
    })

    it('should not render when no conflicting files', () => {
      render(<UploadConflictDialog {...defaultProps} conflictingFiles={[]} />)

      expect(screen.queryByTestId('upload-conflict-dialog')).not.toBeInTheDocument()
    })

    it('should display all conflicting file names', () => {
      render(<UploadConflictDialog {...defaultProps} />)

      expect(screen.getByText('file1.txt')).toBeInTheDocument()
      expect(screen.getByText('file2.lua')).toBeInTheDocument()
    })

    it('should show singular message for one file', () => {
      render(<UploadConflictDialog {...defaultProps} conflictingFiles={['single.txt']} />)

      expect(screen.getByText('The following file already exists in this location:')).toBeInTheDocument()
    })

    it('should show plural message for multiple files', () => {
      render(<UploadConflictDialog {...defaultProps} />)

      expect(screen.getByText('The following 2 files already exist in this location:')).toBeInTheDocument()
    })
  })

  describe('button actions', () => {
    it('should call onCancel when Cancel button clicked', () => {
      const onCancel = vi.fn()
      render(<UploadConflictDialog {...defaultProps} onCancel={onCancel} />)

      fireEvent.click(screen.getByTestId('conflict-cancel-button'))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm when Replace button clicked', () => {
      const onConfirm = vi.fn()
      render(<UploadConflictDialog {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.click(screen.getByTestId('conflict-replace-button'))

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('keyboard navigation', () => {
    it('should call onCancel when Escape pressed', () => {
      const onCancel = vi.fn()
      render(<UploadConflictDialog {...defaultProps} onCancel={onCancel} />)

      fireEvent.keyDown(screen.getByTestId('upload-conflict-dialog'), { key: 'Escape' })

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('should call onConfirm when Enter pressed', () => {
      const onConfirm = vi.fn()
      render(<UploadConflictDialog {...defaultProps} onConfirm={onConfirm} />)

      fireEvent.keyDown(screen.getByTestId('upload-conflict-dialog'), { key: 'Enter' })

      expect(onConfirm).toHaveBeenCalledTimes(1)
    })
  })

  describe('accessibility', () => {
    it('should have proper dialog role', () => {
      render(<UploadConflictDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('should have aria-modal attribute', () => {
      render(<UploadConflictDialog {...defaultProps} />)

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('should render Cancel and Replace buttons', () => {
      render(<UploadConflictDialog {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Replace' })).toBeInTheDocument()
    })
  })
})
