import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CloneProjectDialog } from './CloneProjectDialog'

const mockShowDirectoryPicker = vi.fn()

describe('CloneProjectDialog', () => {
  const defaultProps = {
    isOpen: true,
    projectName: 'space_shooter',
    isFileSystemAccessSupported: true,
    onClone: vi.fn(),
    onCancel: vi.fn(),
    isFolderAlreadyMounted: vi.fn().mockResolvedValue(false),
    getUniqueWorkspaceName: vi.fn((name: string) => name),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: mockShowDirectoryPicker,
      writable: true,
      configurable: true,
    })
  })

  describe('rendering', () => {
    it('renders nothing when closed', () => {
      render(<CloneProjectDialog {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when open', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders dialog title with project name', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByText(/space_shooter/)).toBeInTheDocument()
    })

    it('renders local folder option when file system access is supported', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /local folder/i })).toBeInTheDocument()
    })

    it('renders virtual workspace option', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeInTheDocument()
    })

    it('renders workspace name input', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
    })

    it('renders cancel button', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument()
    })

    it('renders clone button', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /clone/i })).toBeInTheDocument()
    })
  })

  describe('file system access not supported', () => {
    it('hides local folder option when not supported', () => {
      render(<CloneProjectDialog {...defaultProps} isFileSystemAccessSupported={false} />)
      expect(screen.queryByRole('radio', { name: /local folder/i })).not.toBeInTheDocument()
    })

    it('defaults to virtual workspace when not supported', () => {
      render(<CloneProjectDialog {...defaultProps} isFileSystemAccessSupported={false} />)
      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeChecked()
    })
  })

  describe('clone type selection', () => {
    it('has local folder selected by default when supported', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('radio', { name: /local folder/i })).toBeChecked()
    })

    it('can select virtual workspace option', async () => {
      const user = userEvent.setup()
      render(<CloneProjectDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))

      expect(screen.getByRole('radio', { name: /virtual workspace/i })).toBeChecked()
      expect(screen.getByRole('radio', { name: /local folder/i })).not.toBeChecked()
    })

    it('can switch back to local from virtual', async () => {
      const user = userEvent.setup()
      render(<CloneProjectDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))
      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      expect(screen.getByRole('radio', { name: /local folder/i })).toBeChecked()
    })

    it('shows folder selector when local is selected', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByText(/no folder selected/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select folder/i })).toBeInTheDocument()
    })

    it('hides folder selector when virtual is selected', async () => {
      const user = userEvent.setup()
      render(<CloneProjectDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))

      expect(screen.queryByText(/no folder selected/i)).not.toBeInTheDocument()
    })
  })

  describe('form validation', () => {
    it('pre-fills workspace name from project name', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('space_shooter')
    })

    it('uses getUniqueWorkspaceName for initial name', () => {
      const getUniqueWorkspaceName = vi.fn().mockReturnValue('space_shooter-2')
      render(<CloneProjectDialog {...defaultProps} getUniqueWorkspaceName={getUniqueWorkspaceName} />)

      expect(getUniqueWorkspaceName).toHaveBeenCalledWith('space_shooter')
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('space_shooter-2')
    })

    it('disables clone button when local selected and no folder chosen', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('button', { name: /clone/i })).toBeDisabled()
    })

    it('enables clone button for virtual type with non-empty name', async () => {
      const user = userEvent.setup()
      render(<CloneProjectDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))

      expect(screen.getByRole('button', { name: /clone/i })).not.toBeDisabled()
    })

    it('disables clone button when name is empty', async () => {
      const user = userEvent.setup()
      render(<CloneProjectDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))
      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)

      expect(screen.getByRole('button', { name: /clone/i })).toBeDisabled()
    })

    it('disables clone button when name is only whitespace', async () => {
      const user = userEvent.setup()
      render(<CloneProjectDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))
      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, '   ')

      expect(screen.getByRole('button', { name: /clone/i })).toBeDisabled()
    })
  })

  describe('folder selection', () => {
    it('calls showDirectoryPicker when Select Folder is clicked', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<CloneProjectDialog {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      expect(mockShowDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' })
    })

    it('shows folder name after selection', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<CloneProjectDialog {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByText('my-folder')).toBeInTheDocument()
      })
    })

    it('updates workspace name from selected folder', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<CloneProjectDialog {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/workspace name/i)).toHaveValue('my-folder')
      })
    })

    it('shows error when folder is already mounted', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const isFolderAlreadyMounted = vi.fn().mockResolvedValue(true)

      render(<CloneProjectDialog {...defaultProps} isFolderAlreadyMounted={isFolderAlreadyMounted} />)
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByText(/already mounted/i)).toBeInTheDocument()
      })
    })

    it('handles user cancelling directory picker', async () => {
      const user = userEvent.setup()
      const abortError = new Error('User cancelled')
      abortError.name = 'AbortError'
      mockShowDirectoryPicker.mockRejectedValue(abortError)

      render(<CloneProjectDialog {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      })
    })

    it('shows error for non-AbortError failures', async () => {
      const user = userEvent.setup()
      mockShowDirectoryPicker.mockRejectedValue(new Error('Permission denied'))

      render(<CloneProjectDialog {...defaultProps} />)
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByText(/failed to select folder/i)).toBeInTheDocument()
      })
    })
  })

  describe('submit behavior', () => {
    it('calls onClone with virtual type for virtual workspace', async () => {
      const user = userEvent.setup()
      const onClone = vi.fn()
      render(<CloneProjectDialog {...defaultProps} onClone={onClone} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))
      await user.click(screen.getByRole('button', { name: /clone/i }))

      expect(onClone).toHaveBeenCalledWith('space_shooter', 'virtual')
    })

    it('calls onClone with local type and handle for local workspace', async () => {
      const user = userEvent.setup()
      const onClone = vi.fn()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<CloneProjectDialog {...defaultProps} onClone={onClone} />)

      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByText('my-folder')).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /clone/i }))

      expect(onClone).toHaveBeenCalledWith('my-folder', 'local', mockHandle)
    })

    it('trims whitespace from workspace name', async () => {
      const user = userEvent.setup()
      const onClone = vi.fn()
      render(<CloneProjectDialog {...defaultProps} onClone={onClone} />)

      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))
      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, '  Trimmed Name  ')
      await user.click(screen.getByRole('button', { name: /clone/i }))

      expect(onClone).toHaveBeenCalledWith('Trimmed Name', 'virtual')
    })
  })

  describe('cancel button', () => {
    it('calls onCancel when clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<CloneProjectDialog {...defaultProps} onCancel={onCancel} />)

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('keyboard interactions', () => {
    it('closes dialog on Escape key', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<CloneProjectDialog {...defaultProps} onCancel={onCancel} />)

      await user.keyboard('{Escape}')

      expect(onCancel).toHaveBeenCalledTimes(1)
    })
  })

  describe('form reset', () => {
    it('resets to default values when dialog reopens', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<CloneProjectDialog {...defaultProps} />)

      // Switch to virtual and change name
      await user.click(screen.getByRole('radio', { name: /virtual workspace/i }))
      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Changed Name')

      // Close dialog
      rerender(<CloneProjectDialog {...defaultProps} isOpen={false} />)

      // Reopen dialog
      rerender(<CloneProjectDialog {...defaultProps} isOpen={true} />)

      // Should be reset
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('space_shooter')
      expect(screen.getByRole('radio', { name: /local folder/i })).toBeChecked()
    })
  })

  describe('accessibility', () => {
    it('has modal role', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has accessible title', () => {
      render(<CloneProjectDialog {...defaultProps} />)
      const dialog = screen.getByRole('dialog')
      expect(dialog).toHaveAttribute('aria-labelledby')
    })
  })
})
