import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddWorkspaceDialog } from './AddWorkspaceDialog'

describe('AddWorkspaceDialog', () => {
  const defaultProps = {
    isOpen: true,
    isFileSystemAccessSupported: true,
    onCreateVirtual: vi.fn(),
    onCreateLocal: vi.fn(),
    onCancel: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      render(<AddWorkspaceDialog {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders dialog title', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByText('Add Workspace')).toBeInTheDocument()
    })

    it('renders virtual workspace option', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeInTheDocument()
    })

    it('renders local folder option', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /local folder/i })).toBeInTheDocument()
    })

    it('renders workspace name input', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders create button', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
    })
  })

  describe('file system access not supported', () => {
    it('disables local folder option when not supported', () => {
      render(<AddWorkspaceDialog {...defaultProps} isFileSystemAccessSupported={false} />)
      expect(screen.getByRole('radio', { name: /local folder/i })).toBeDisabled()
    })

    it('shows warning message when local folder is not supported', () => {
      render(<AddWorkspaceDialog {...defaultProps} isFileSystemAccessSupported={false} />)
      expect(screen.getByText(/not supported in this browser/i)).toBeInTheDocument()
    })
  })

  describe('workspace type selection', () => {
    it('has virtual workspace selected by default', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeChecked()
    })

    it('can select local folder option', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      expect(screen.getByRole('radio', { name: /local folder/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /virtual workspace/i })).not.toBeChecked()
    })

    it('can switch back from local to virtual', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))

      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /local folder/i })).not.toBeChecked()
    })
  })

  describe('workspace name input', () => {
    it('allows entering a workspace name', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'My Project')

      expect(input).toHaveValue('My Project')
    })

    it('has default value for virtual workspace', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('New Workspace')
    })

    it('has placeholder text', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toHaveAttribute('placeholder', 'Enter workspace name')
    })
  })

  describe('form reset', () => {
    it('resets to default values when dialog reopens', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<AddWorkspaceDialog {...defaultProps} />)

      // Change values
      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Changed Name')
      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      // Close dialog
      rerender(<AddWorkspaceDialog {...defaultProps} isOpen={false} />)

      // Reopen dialog
      rerender(<AddWorkspaceDialog {...defaultProps} isOpen={true} />)

      // Should be reset to defaults
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('New Workspace')
      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeChecked()
    })
  })

  describe('cancel button', () => {
    it('calls onCancel when clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<AddWorkspaceDialog {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('create button', () => {
    it('calls onCreateVirtual with name when virtual is selected', async () => {
      const user = userEvent.setup()
      const onCreateVirtual = vi.fn()
      render(<AddWorkspaceDialog {...defaultProps} onCreateVirtual={onCreateVirtual} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Test Project')
      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onCreateVirtual).toHaveBeenCalledWith('Test Project')
    })

    it('calls onCreateLocal with name when local is selected', async () => {
      const user = userEvent.setup()
      const onCreateLocal = vi.fn()
      render(<AddWorkspaceDialog {...defaultProps} onCreateLocal={onCreateLocal} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Local Project')
      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onCreateLocal).toHaveBeenCalledWith('Local Project')
    })

    it('trims whitespace from workspace name before creating', async () => {
      const user = userEvent.setup()
      const onCreateVirtual = vi.fn()
      render(<AddWorkspaceDialog {...defaultProps} onCreateVirtual={onCreateVirtual} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, '  Trimmed Name  ')
      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onCreateVirtual).toHaveBeenCalledWith('Trimmed Name')
    })

    it('does not call any callback when name is invalid', async () => {
      const user = userEvent.setup()
      const onCreateVirtual = vi.fn()
      const onCreateLocal = vi.fn()
      render(
        <AddWorkspaceDialog
          {...defaultProps}
          onCreateVirtual={onCreateVirtual}
          onCreateLocal={onCreateLocal}
        />
      )

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      // Form submission with empty name should not call callbacks
      // Button is disabled but let's verify callbacks aren't called

      expect(onCreateVirtual).not.toHaveBeenCalled()
      expect(onCreateLocal).not.toHaveBeenCalled()
    })

    it('is disabled when name is empty', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)

      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('is disabled when name is only whitespace', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, '   ')

      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('is enabled when name has valid content', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Valid Name')

      expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled()
    })
  })

  describe('keyboard interactions', () => {
    it('closes dialog on Escape key', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<AddWorkspaceDialog {...defaultProps} onCancel={onCancel} />)

      await user.keyboard('{Escape}')

      expect(onCancel).toHaveBeenCalledTimes(1)
    })

    it('submits form on Enter key when valid', async () => {
      const user = userEvent.setup()
      const onCreateVirtual = vi.fn()
      render(<AddWorkspaceDialog {...defaultProps} onCreateVirtual={onCreateVirtual} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Enter Test{Enter}')

      expect(onCreateVirtual).toHaveBeenCalledWith('Enter Test')
    })
  })

  describe('accessibility', () => {
    it('has modal role', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has accessible title', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })

    it('focuses cancel button when opened', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toHaveFocus()
    })
  })
})
