import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { FileExplorer } from './FileExplorer'
import type { TreeNode } from '../../hooks/useFileSystem'

describe('FileExplorer', () => {
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

  describe('rendering', () => {
    it('should render FileTree', () => {
      // Arrange & Act
      render(<FileExplorer {...defaultProps} />)

      // Assert
      expect(screen.getByRole('tree')).toBeInTheDocument()
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.getByText('utils')).toBeInTheDocument()
    })

    it('should render New File button', () => {
      // Arrange & Act
      render(<FileExplorer {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /new file/i })).toBeInTheDocument()
    })

    it('should render New Folder button', () => {
      // Arrange & Act
      render(<FileExplorer {...defaultProps} />)

      // Assert
      expect(screen.getByRole('button', { name: /new folder/i })).toBeInTheDocument()
    })
  })

  describe('file selection', () => {
    it('should call onSelectFile when file clicked', () => {
      // Arrange
      const onSelectFile = vi.fn()
      render(<FileExplorer {...defaultProps} onSelectFile={onSelectFile} />)

      // Act
      fireEvent.click(screen.getByText('main.lua'))

      // Assert
      expect(onSelectFile).toHaveBeenCalledWith('/main.lua')
    })

    it('should highlight selected file', () => {
      // Arrange & Act
      render(<FileExplorer {...defaultProps} selectedPath="/main.lua" />)

      // Assert
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      expect(item?.className).toMatch(/selected/)
    })
  })

  describe('context menu', () => {
    it('should open context menu on right-click', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)

      // Assert
      expect(screen.getByRole('menu')).toBeInTheDocument()
    })

    it('should show rename option in context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)

      // Assert
      expect(screen.getByText('Rename')).toBeInTheDocument()
    })

    it('should show delete option in context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)

      // Assert
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })

    it('should show only rename and delete for file context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - right-click file
      const fileItem = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(fileItem!)

      // Assert - file context menu should NOT have New File/Folder options
      expect(screen.getByText('Rename')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
      expect(screen.queryByText('New File')).not.toBeInTheDocument()
      expect(screen.queryByText('New Folder')).not.toBeInTheDocument()
    })

    it('should show New File and New Folder options for folder context menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - expand folder then right-click it
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      fireEvent.contextMenu(folderItem!)

      // Assert - folder context menu should have all options
      expect(screen.getByText('New File')).toBeInTheDocument()
      expect(screen.getByText('New Folder')).toBeInTheDocument()
      expect(screen.getByText('Rename')).toBeInTheDocument()
      expect(screen.getByText('Delete')).toBeInTheDocument()
    })
  })

  describe('file creation', () => {
    it('should call onCreateFile when New File button clicked', () => {
      // Arrange
      const onCreateFile = vi.fn()
      render(<FileExplorer {...defaultProps} onCreateFile={onCreateFile} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /new file/i }))

      // Assert
      expect(onCreateFile).toHaveBeenCalled()
    })

    it('should call onCreateFolder when New Folder button clicked', () => {
      // Arrange
      const onCreateFolder = vi.fn()
      render(<FileExplorer {...defaultProps} onCreateFolder={onCreateFolder} />)

      // Act
      fireEvent.click(screen.getByRole('button', { name: /new folder/i }))

      // Assert
      expect(onCreateFolder).toHaveBeenCalled()
    })
  })

  describe('file deletion', () => {
    it('should show confirm dialog when delete selected', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - open context menu and click delete
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)
      fireEvent.click(screen.getByText('Delete'))

      // Assert
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument()
    })

    it('should call onDeleteFile when deletion confirmed', () => {
      // Arrange
      const onDeleteFile = vi.fn()
      render(<FileExplorer {...defaultProps} onDeleteFile={onDeleteFile} />)

      // Act - open context menu, click delete, confirm
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)
      fireEvent.click(screen.getByText('Delete'))
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      // Assert
      expect(onDeleteFile).toHaveBeenCalledWith('/main.lua')
    })
  })

  describe('file rename', () => {
    it('should enter rename mode when rename selected from menu', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - open context menu and click rename
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)
      fireEvent.click(screen.getByText('Rename'))

      // Assert - should show input
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('main.lua')
    })

    it('should call onRenameFile when rename submitted', () => {
      // Arrange
      const onRenameFile = vi.fn()
      render(<FileExplorer {...defaultProps} onRenameFile={onRenameFile} />)

      // Act
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)
      fireEvent.click(screen.getByText('Rename'))

      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'renamed.lua' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Assert
      expect(onRenameFile).toHaveBeenCalledWith('/main.lua', 'renamed.lua')
    })
  })

  describe('keyboard shortcuts', () => {
    it('should enter rename mode when F2 pressed on selected file', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} selectedPath="/main.lua" />)

      // Act - press F2 on tree
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'F2' })

      // Assert - should show input for rename
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('main.lua')
    })

    it('should show delete confirmation when Delete pressed on selected file', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} selectedPath="/main.lua" />)

      // Act - press Delete on tree
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })

      // Assert - should show confirm dialog
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByText(/Are you sure you want to delete/i)).toBeInTheDocument()
    })

    it('should call onDeleteFile when Delete confirmed', () => {
      // Arrange
      const onDeleteFile = vi.fn()
      render(<FileExplorer {...defaultProps} selectedPath="/main.lua" onDeleteFile={onDeleteFile} />)

      // Act - press Delete and confirm
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      // Assert
      expect(onDeleteFile).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onDeleteFolder when Delete pressed on folder', () => {
      // Arrange
      const onDeleteFolder = vi.fn()
      render(<FileExplorer {...defaultProps} selectedPath="/utils" onDeleteFolder={onDeleteFolder} />)

      // Act - press Delete and confirm
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      // Assert
      expect(onDeleteFolder).toHaveBeenCalledWith('/utils')
    })
  })
})
