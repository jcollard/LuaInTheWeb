import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileExplorer } from './FileExplorer'
import type { Workspace } from '../../hooks/workspaceTypes'
import type { WorkspaceProps } from './types'

// Mock filesystem for test workspaces
const mockFileSystem = {
  getCurrentDirectory: () => '/',
  setCurrentDirectory: vi.fn(),
  exists: () => false,
  isDirectory: () => false,
  isFile: () => false,
  listDirectory: () => [],
  readFile: () => '',
  writeFile: vi.fn(),
  createDirectory: vi.fn(),
  delete: vi.fn(),
}

function createMockWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: 'ws-1',
    name: 'Test Workspace',
    type: 'virtual',
    mountPath: '/test',
    filesystem: mockFileSystem,
    status: 'connected',
    ...overrides,
  }
}

describe('FileExplorer with Workspace Management', () => {
  const baseProps = {
    tree: [],
    onCreateFile: vi.fn(),
    onCreateFolder: vi.fn(),
    onRenameFile: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFile: vi.fn(),
    onDeleteFolder: vi.fn(),
    onSelectFile: vi.fn(),
  }

  const defaultWorkspaceProps: WorkspaceProps = {
    workspaces: [createMockWorkspace()],
    isFileSystemAccessSupported: true,
    onAddVirtualWorkspace: vi.fn(),
    onAddLocalWorkspace: vi.fn(),
    onRemoveWorkspace: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('without workspace props', () => {
    it('does not render workspace tabs', () => {
      render(<FileExplorer {...baseProps} />)
      expect(screen.queryByTestId('workspace-tabs')).not.toBeInTheDocument()
    })
  })

  describe('with workspace props', () => {
    it('renders workspace tabs', () => {
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)
      expect(screen.getByTestId('workspace-tabs')).toBeInTheDocument()
    })

    it('renders tabs for each workspace', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'My Files' }),
        createMockWorkspace({ id: 'ws-2', name: 'Project' }),
      ]
      render(
        <FileExplorer
          {...baseProps}
          workspaceProps={{ ...defaultWorkspaceProps, workspaces }}
        />
      )

      expect(screen.getByRole('tab', { name: /My Files/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Project/i })).toBeInTheDocument()
    })

    it('renders add workspace button', () => {
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)
      expect(screen.getByRole('button', { name: /add workspace/i })).toBeInTheDocument()
    })
  })

  describe('add workspace dialog', () => {
    it('opens dialog when add button is clicked', async () => {
      const user = userEvent.setup()
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)

      await user.click(screen.getByRole('button', { name: /add workspace/i }))

      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText('Add Workspace')).toBeInTheDocument()
    })

    it('closes dialog when cancel is clicked', async () => {
      const user = userEvent.setup()
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)

      await user.click(screen.getByRole('button', { name: /add workspace/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: /cancel/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('calls onAddVirtualWorkspace when creating virtual workspace', async () => {
      const user = userEvent.setup()
      const onAddVirtualWorkspace = vi.fn()
      render(
        <FileExplorer
          {...baseProps}
          workspaceProps={{ ...defaultWorkspaceProps, onAddVirtualWorkspace }}
        />
      )

      await user.click(screen.getByRole('button', { name: /add workspace/i }))

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'New Virtual Workspace')
      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onAddVirtualWorkspace).toHaveBeenCalledWith('New Virtual Workspace')
    })

    it('calls onAddLocalWorkspace when creating local workspace', async () => {
      const user = userEvent.setup()
      const onAddLocalWorkspace = vi.fn()
      render(
        <FileExplorer
          {...baseProps}
          workspaceProps={{ ...defaultWorkspaceProps, onAddLocalWorkspace }}
        />
      )

      await user.click(screen.getByRole('button', { name: /add workspace/i }))
      await user.click(screen.getByRole('radio', { name: /local folder/i }))

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Local Project')
      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onAddLocalWorkspace).toHaveBeenCalledWith('Local Project')
    })

    it('closes dialog after creating workspace', async () => {
      const user = userEvent.setup()
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)

      await user.click(screen.getByRole('button', { name: /add workspace/i }))
      expect(screen.getByRole('dialog')).toBeInTheDocument()

      const input = screen.getByLabelText(/workspace name/i)
      await user.clear(input)
      await user.type(input, 'Test')
      await user.click(screen.getByRole('button', { name: /create/i }))

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
    })

    it('disables local folder option when not supported', async () => {
      const user = userEvent.setup()
      render(
        <FileExplorer
          {...baseProps}
          workspaceProps={{ ...defaultWorkspaceProps, isFileSystemAccessSupported: false }}
        />
      )

      await user.click(screen.getByRole('button', { name: /add workspace/i }))

      expect(screen.getByRole('radio', { name: /local folder/i })).toBeDisabled()
    })
  })

  describe('remove workspace', () => {
    it('calls onRemoveWorkspace when close button is clicked', async () => {
      const user = userEvent.setup()
      const onRemoveWorkspace = vi.fn()
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'First' }),
        createMockWorkspace({ id: 'ws-2', name: 'Second' }),
      ]
      render(
        <FileExplorer
          {...baseProps}
          workspaceProps={{ ...defaultWorkspaceProps, workspaces, onRemoveWorkspace }}
        />
      )

      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      await user.click(closeButtons[1]) // Click close on second workspace

      expect(onRemoveWorkspace).toHaveBeenCalledWith('ws-2')
    })

    it('does not show close button when only one workspace', () => {
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })
  })
})
