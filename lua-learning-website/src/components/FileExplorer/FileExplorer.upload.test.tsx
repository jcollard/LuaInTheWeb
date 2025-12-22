import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { FileExplorer } from './FileExplorer'
import type { TreeNode } from '../../hooks/useFileSystem'

describe('FileExplorer Import Files', () => {
  const mockTree: TreeNode[] = [
    {
      name: 'utils',
      path: '/utils',
      type: 'folder',
      children: [
        { name: 'math.lua', path: '/utils/math.lua', type: 'file' },
      ],
    },
    { name: 'main.lua', path: '/main.lua', type: 'file' },
  ]

  const mockTreeWithWorkspace: TreeNode[] = [
    {
      name: 'My Project',
      path: '/my-project',
      type: 'folder',
      isWorkspace: true,
      children: [
        { name: 'main.lua', path: '/my-project/main.lua', type: 'file' },
      ],
    },
  ]

  const defaultProps = {
    tree: mockTree,
    onCreateFile: vi.fn(),
    onCreateFolder: vi.fn(),
    onRenameFile: vi.fn(),
    onRenameFolder: vi.fn(),
    onDeleteFile: vi.fn(),
    onDeleteFolder: vi.fn(),
    onSelectFile: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('context menu', () => {
    it('should show Import Files option for folder context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - right-click on folder
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      fireEvent.contextMenu(folderItem!)

      // Assert - folder context menu should have Import Files option
      expect(screen.getByText('Import Files...')).toBeInTheDocument()
    })

    it('should NOT show Import Files option for file context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - right-click on file
      const fileItem = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(fileItem!)

      // Assert - file context menu should NOT have Import Files option
      expect(screen.queryByText('Import Files...')).not.toBeInTheDocument()
    })

    it('should show Import Files option for workspace context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} tree={mockTreeWithWorkspace} />)

      // Act - right-click on workspace
      const workspaceItem = screen.getByText('My Project').closest('[role="treeitem"]')
      fireEvent.contextMenu(workspaceItem!)

      // Assert - workspace context menu should have Import Files option
      expect(screen.getByText('Import Files...')).toBeInTheDocument()
    })
  })

  describe('import files action', () => {
    it('should call onImportFiles when Import Files option is clicked', () => {
      // Arrange
      const onImportFiles = vi.fn()
      render(<FileExplorer {...defaultProps} onImportFiles={onImportFiles} />)

      // Act - right-click on folder and click Import Files
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      fireEvent.contextMenu(folderItem!)
      fireEvent.click(screen.getByText('Import Files...'))

      // Assert
      expect(onImportFiles).toHaveBeenCalledWith('/utils')
    })

    it('should call onImportFiles with workspace path when clicked on workspace', () => {
      // Arrange
      const onImportFiles = vi.fn()
      render(<FileExplorer {...defaultProps} tree={mockTreeWithWorkspace} onImportFiles={onImportFiles} />)

      // Act - right-click on workspace and click Import Files
      const workspaceItem = screen.getByText('My Project').closest('[role="treeitem"]')
      fireEvent.contextMenu(workspaceItem!)
      fireEvent.click(screen.getByText('Import Files...'))

      // Assert
      expect(onImportFiles).toHaveBeenCalledWith('/my-project')
    })
  })
})
