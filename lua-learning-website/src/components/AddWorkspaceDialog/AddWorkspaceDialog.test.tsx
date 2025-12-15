import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AddWorkspaceDialog } from './AddWorkspaceDialog'

// Mock the File System Access API
const mockShowDirectoryPicker = vi.fn()

describe('AddWorkspaceDialog', () => {
  const defaultProps = {
    isOpen: true,
    isFileSystemAccessSupported: true,
    onCreateVirtual: vi.fn(),
    onCreateLocal: vi.fn(),
    onCancel: vi.fn(),
    isFolderAlreadyMounted: vi.fn().mockResolvedValue(false),
    getUniqueWorkspaceName: vi.fn((name: string) => name),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Setup window.showDirectoryPicker mock
    Object.defineProperty(window, 'showDirectoryPicker', {
      value: mockShowDirectoryPicker,
      writable: true,
      configurable: true,
    })
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

    it('renders workspace name input when virtual is selected', () => {
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

    it('shows folder selector when local folder is selected', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      expect(screen.getByText(/no folder selected/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /select folder/i })).toBeInTheDocument()
    })

    it('hides workspace name input when local folder is selected (before folder selection)', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      expect(screen.queryByLabelText(/workspace name/i)).not.toBeInTheDocument()
    })
  })

  describe('virtual workspace name input', () => {
    it('allows entering a workspace name', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'My Project')

      expect(input).toHaveValue('My Project')
    })

    it('starts with empty value for virtual workspace', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('')
    })

    it('has placeholder text', () => {
      render(<AddWorkspaceDialog {...defaultProps} />)
      expect(screen.getByLabelText(/workspace name/i)).toHaveAttribute('placeholder', 'Enter workspace name')
    })
  })

  describe('local folder selection', () => {
    it('calls showDirectoryPicker when Select Folder is clicked', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      expect(mockShowDirectoryPicker).toHaveBeenCalledWith({ mode: 'readwrite' })
    })

    it('shows folder name after selection', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByText('my-project')).toBeInTheDocument()
      })
    })

    it('shows name input after folder is selected', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
      })
    })

    it('pre-fills name with folder name', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/workspace name/i)).toHaveValue('my-project')
      })
    })

    it('uses getUniqueWorkspaceName to handle name collisions', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const getUniqueWorkspaceName = vi.fn().mockReturnValue('my-project-2')

      render(<AddWorkspaceDialog {...defaultProps} getUniqueWorkspaceName={getUniqueWorkspaceName} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(getUniqueWorkspaceName).toHaveBeenCalledWith('my-project')
        expect(screen.getByLabelText(/workspace name/i)).toHaveValue('my-project-2')
      })
    })

    it('shows error when folder is already mounted', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const isFolderAlreadyMounted = vi.fn().mockResolvedValue(true)

      render(<AddWorkspaceDialog {...defaultProps} isFolderAlreadyMounted={isFolderAlreadyMounted} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
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

      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      // Should not show error for user cancellation
      await waitFor(() => {
        expect(screen.queryByText(/error/i)).not.toBeInTheDocument()
      })
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

      // Should be reset to defaults (empty name, virtual selected)
      expect(screen.getByLabelText(/workspace name/i)).toHaveValue('')
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

    it('calls onCreateLocal with name and handle when local is selected', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const onCreateLocal = vi.fn()

      render(<AddWorkspaceDialog {...defaultProps} onCreateLocal={onCreateLocal} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onCreateLocal).toHaveBeenCalledWith('my-folder', mockHandle)
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

    it('is disabled when name is empty (virtual workspace)', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)

      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('is disabled when name is only whitespace (virtual workspace)', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, '   ')

      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('is enabled when name has valid content (virtual workspace)', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Valid Name')

      expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled()
    })

    it('is disabled when no folder selected (local workspace)', async () => {
      const user = userEvent.setup()
      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
    })

    it('is enabled after folder is selected (local workspace)', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-folder' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)

      render(<AddWorkspaceDialog {...defaultProps} />)

      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /create/i })).not.toBeDisabled()
      })
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
