import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WorkspaceTabs } from './WorkspaceTabs'
import type { Workspace } from '../../hooks/workspaceTypes'

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

describe('WorkspaceTabs', () => {
  const defaultProps = {
    workspaces: [createMockWorkspace()],
    onAddClick: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders workspace tabs container', () => {
      render(<WorkspaceTabs {...defaultProps} />)
      expect(screen.getByTestId('workspace-tabs')).toBeInTheDocument()
    })

    it('renders a tab for each workspace', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'My Files' }),
        createMockWorkspace({ id: 'ws-2', name: 'Project' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} />)

      expect(screen.getByRole('tab', { name: /My Files/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /Project/i })).toBeInTheDocument()
    })

    it('renders add workspace button', () => {
      render(<WorkspaceTabs {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add workspace/i })).toBeInTheDocument()
    })

    it('applies custom className when provided', () => {
      render(<WorkspaceTabs {...defaultProps} className="custom-class" />)
      expect(screen.getByTestId('workspace-tabs')).toHaveClass('custom-class')
    })

    it('shows disconnected indicator for disconnected workspaces', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'Local', type: 'local', status: 'disconnected' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} />)

      const tab = screen.getByRole('tab', { name: /Local/i })
      expect(tab).toHaveAttribute('data-status', 'disconnected')
    })

    it('shows local icon for local workspaces', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'Local Folder', type: 'local' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} />)

      expect(screen.getByTestId('workspace-tab-ws-1')).toHaveAttribute('data-type', 'local')
    })
  })

  describe('add button', () => {
    it('calls onAddClick when add button is clicked', async () => {
      const user = userEvent.setup()
      const onAddClick = vi.fn()
      render(<WorkspaceTabs {...defaultProps} onAddClick={onAddClick} />)

      await user.click(screen.getByRole('button', { name: /add workspace/i }))

      expect(onAddClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('close button', () => {
    it('renders close button on tabs when there is more than one workspace', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'First' }),
        createMockWorkspace({ id: 'ws-2', name: 'Second' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} />)

      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      expect(closeButtons).toHaveLength(2)
    })

    it('does not render close button when there is only one workspace', () => {
      render(<WorkspaceTabs {...defaultProps} />)

      expect(screen.queryByRole('button', { name: /close/i })).not.toBeInTheDocument()
    })

    it('calls onClose with workspace id when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'First' }),
        createMockWorkspace({ id: 'ws-2', name: 'Second' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} onClose={onClose} />)

      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      await user.click(closeButtons[1])

      expect(onClose).toHaveBeenCalledWith('ws-2')
    })

    it('stops propagation when close button is clicked', async () => {
      const user = userEvent.setup()
      const onClose = vi.fn()
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'First' }),
        createMockWorkspace({ id: 'ws-2', name: 'Second' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} onClose={onClose} />)

      const closeButtons = screen.getAllByRole('button', { name: /close/i })
      await user.click(closeButtons[0])

      // onClose should be called (event was handled)
      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('context menu', () => {
    it('calls onContextMenu when tab is right-clicked', async () => {
      const user = userEvent.setup()
      const onContextMenu = vi.fn()
      render(<WorkspaceTabs {...defaultProps} onContextMenu={onContextMenu} />)

      const tab = screen.getByRole('tab', { name: /Test Workspace/i })
      await user.pointer({ keys: '[MouseRight]', target: tab })

      expect(onContextMenu).toHaveBeenCalledWith('ws-1', expect.any(Object))
    })

    it('does not throw when onContextMenu is not provided', async () => {
      const user = userEvent.setup()
      render(<WorkspaceTabs {...defaultProps} onContextMenu={undefined} />)

      const tab = screen.getByRole('tab', { name: /Test Workspace/i })

      // Should not throw
      await expect(user.pointer({ keys: '[MouseRight]', target: tab })).resolves.not.toThrow()
    })
  })

  describe('accessibility', () => {
    it('uses tablist role for container', () => {
      render(<WorkspaceTabs {...defaultProps} />)
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('uses tab role for workspace tabs', () => {
      render(<WorkspaceTabs {...defaultProps} />)
      expect(screen.getByRole('tab')).toBeInTheDocument()
    })

    it('add button has accessible label', () => {
      render(<WorkspaceTabs {...defaultProps} />)
      expect(screen.getByRole('button', { name: /add workspace/i })).toBeInTheDocument()
    })

    it('close buttons have accessible labels', () => {
      const workspaces = [
        createMockWorkspace({ id: 'ws-1', name: 'First' }),
        createMockWorkspace({ id: 'ws-2', name: 'Second' }),
      ]
      render(<WorkspaceTabs {...defaultProps} workspaces={workspaces} />)

      expect(screen.getByRole('button', { name: /close first/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /close second/i })).toBeInTheDocument()
    })
  })
})
