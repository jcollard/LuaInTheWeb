import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FileExplorer } from './FileExplorer'
import type { Workspace } from '../../hooks/workspaceTypes'
import type { WorkspaceProps } from './types'
import type { TreeNode } from '../../hooks/fileSystemTypes'

// Mock the File System Access API
const mockShowDirectoryPicker = vi.fn()

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

function createWorkspaceTree(workspaces: Workspace[]): TreeNode[] {
  return workspaces.map((ws) => ({
    name: ws.mountPath.replace('/', ''),
    path: ws.mountPath,
    type: 'folder' as const,
    isWorkspace: true,
    children: [],
  }))
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
    onRefreshWorkspace: vi.fn(),
    supportsRefresh: vi.fn(() => false),
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

  describe('without workspace props', () => {
    it('does not render add workspace button', () => {
      render(<FileExplorer {...baseProps} />)
      expect(screen.queryByRole('button', { name: /add workspace/i })).not.toBeInTheDocument()
    })
  })

  describe('with workspace props', () => {
    it('renders add workspace button in toolbar', () => {
      render(<FileExplorer {...baseProps} workspaceProps={defaultWorkspaceProps} />)
      expect(screen.getByRole('button', { name: /add workspace/i })).toBeInTheDocument()
    })

    it('renders workspaces as root-level folders in tree', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'My Files', mountPath: '/my-files' }),
        createMockWorkspace({ id: 'ws-2', name: 'Project', mountPath: '/project' }),
      ]
      const tree = createWorkspaceTree(workspaces)
      render(
        <FileExplorer
          {...baseProps}
          tree={tree}
          workspaceProps={{ ...defaultWorkspaceProps, workspaces }}
        />
      )

      // Workspaces appear as tree items, not tabs
      expect(screen.getByRole('treeitem', { name: /my-files/i })).toBeInTheDocument()
      expect(screen.getByRole('treeitem', { name: /project/i })).toBeInTheDocument()
    })

    it('displays virtual workspace icons for virtual workspace folders', () => {
      const workspaces = [createMockWorkspace({ id: 'ws-1', name: 'My Files', mountPath: '/my-files', type: 'virtual' })]
      const tree = createWorkspaceTree(workspaces)
      render(
        <FileExplorer
          {...baseProps}
          tree={tree}
          workspaceProps={{ ...defaultWorkspaceProps, workspaces }}
        />
      )

      // Virtual workspace icon should be rendered (not regular folder icon)
      expect(screen.getByTestId('virtual-workspace-icon')).toBeInTheDocument()
    })

    it('displays local workspace icons for local workspace folders', () => {
      const workspaces = [createMockWorkspace({ id: 'ws-1', name: 'My Project', mountPath: '/my-project', type: 'local' })]
      const tree = workspaces.map((ws) => ({
        name: ws.mountPath.replace('/', ''),
        path: ws.mountPath,
        type: 'folder' as const,
        isWorkspace: true,
        isLocalWorkspace: true,
        children: [],
      }))
      render(
        <FileExplorer
          {...baseProps}
          tree={tree}
          workspaceProps={{ ...defaultWorkspaceProps, workspaces }}
        />
      )

      // Local workspace icon should be rendered (not regular folder icon)
      expect(screen.getByTestId('local-workspace-icon')).toBeInTheDocument()
    })

    it('displays disconnected workspace icon for disconnected workspaces', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'Local Project', mountPath: '/local-project', status: 'disconnected' }),
      ]
      // Create tree with isDisconnected flag
      const tree = workspaces.map((ws) => ({
        name: ws.mountPath.replace('/', ''),
        path: ws.mountPath,
        type: 'folder' as const,
        isWorkspace: true,
        isDisconnected: true,
        children: [],
      }))
      render(
        <FileExplorer
          {...baseProps}
          tree={tree}
          workspaceProps={{ ...defaultWorkspaceProps, workspaces }}
        />
      )

      // Disconnected workspace icon should be rendered
      expect(screen.getByTestId('disconnected-workspace-icon')).toBeInTheDocument()
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

    it('calls onAddLocalWorkspace with name and handle when creating local workspace', async () => {
      const user = userEvent.setup()
      const mockHandle = { name: 'my-project' } as FileSystemDirectoryHandle
      mockShowDirectoryPicker.mockResolvedValue(mockHandle)
      const onAddLocalWorkspace = vi.fn()

      render(
        <FileExplorer
          {...baseProps}
          workspaceProps={{ ...defaultWorkspaceProps, onAddLocalWorkspace }}
        />
      )

      await user.click(screen.getByRole('button', { name: /add workspace/i }))
      await user.click(screen.getByRole('radio', { name: /local folder/i }))
      await user.click(screen.getByRole('button', { name: /select folder/i }))

      // Wait for folder to be selected and name input to appear
      await waitFor(() => {
        expect(screen.getByLabelText(/workspace name/i)).toBeInTheDocument()
      })

      await user.click(screen.getByRole('button', { name: /create/i }))

      expect(onAddLocalWorkspace).toHaveBeenCalledWith('my-project', mockHandle)
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
})
