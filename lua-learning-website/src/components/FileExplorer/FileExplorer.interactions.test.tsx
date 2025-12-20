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

  describe('pending new file', () => {
    it('should enter rename mode when pendingNewFilePath is set', () => {
      // Arrange - add the pending file to the tree
      const treeWithPending: TreeNode[] = [
        ...mockTree,
        { name: 'untitled.lua', path: '/untitled.lua', type: 'file' },
      ]

      // Act
      render(
        <FileExplorer
          {...defaultProps}
          tree={treeWithPending}
          pendingNewFilePath="/untitled.lua"
        />
      )

      // Assert - should show rename input
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('untitled.lua')
    })

    it('should call onCancelPendingNewFile when rename submitted for pending file', () => {
      // Arrange
      const onCancelPendingNewFile = vi.fn()
      const treeWithPending: TreeNode[] = [
        ...mockTree,
        { name: 'untitled.lua', path: '/untitled.lua', type: 'file' },
      ]

      render(
        <FileExplorer
          {...defaultProps}
          tree={treeWithPending}
          pendingNewFilePath="/untitled.lua"
          onCancelPendingNewFile={onCancelPendingNewFile}
        />
      )

      // Act - submit rename
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'newfile.lua' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Assert
      expect(onCancelPendingNewFile).toHaveBeenCalled()
    })

    it('should call onDeleteFile when rename cancelled for pending file', () => {
      // Arrange
      const onDeleteFile = vi.fn()
      const onCancelPendingNewFile = vi.fn()
      const treeWithPending: TreeNode[] = [
        ...mockTree,
        { name: 'untitled.lua', path: '/untitled.lua', type: 'file' },
      ]

      render(
        <FileExplorer
          {...defaultProps}
          tree={treeWithPending}
          pendingNewFilePath="/untitled.lua"
          onDeleteFile={onDeleteFile}
          onCancelPendingNewFile={onCancelPendingNewFile}
        />
      )

      // Act - cancel rename
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'Escape' })

      // Assert - pending file should be deleted
      expect(onDeleteFile).toHaveBeenCalledWith('/untitled.lua')
      expect(onCancelPendingNewFile).toHaveBeenCalled()
    })
  })

  describe('deep tree navigation', () => {
    it('should find nested file in folder children via context menu', () => {
      // Arrange - use mockTree which has /utils/math.lua
      const onDeleteFile = vi.fn()
      render(<FileExplorer {...defaultProps} onDeleteFile={onDeleteFile} />)

      // Act - expand folder first to access nested file
      fireEvent.click(screen.getByTestId('folder-chevron'))

      // Then right-click the nested file
      const nestedFile = screen.getByText('math.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(nestedFile!)
      fireEvent.click(screen.getByText('Delete'))
      fireEvent.click(screen.getByRole('button', { name: /delete/i }))

      // Assert - should call onDeleteFile with nested path
      expect(onDeleteFile).toHaveBeenCalledWith('/utils/math.lua')
    })

    it('should find nested file name correctly in delete dialog', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - expand folder and delete nested file
      fireEvent.click(screen.getByTestId('folder-chevron'))
      const nestedFile = screen.getByText('math.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(nestedFile!)
      fireEvent.click(screen.getByText('Delete'))

      // Assert - dialog should show the correct file name
      expect(screen.getByText(/Are you sure you want to delete "math.lua"/)).toBeInTheDocument()
    })
  })

  describe('className handling', () => {
    it('should apply custom className when provided', () => {
      // Arrange & Act
      const { container } = render(
        <FileExplorer {...defaultProps} className="custom-class" />
      )

      // Assert
      const explorer = container.firstChild as HTMLElement
      expect(explorer.className).toContain('custom-class')
    })

    it('should apply default styles without custom className', () => {
      // Arrange & Act
      const { container } = render(<FileExplorer {...defaultProps} />)

      // Assert - should have explorer class but not custom class
      const explorer = container.firstChild as HTMLElement
      expect(explorer.className).toMatch(/explorer/)
      expect(explorer.className).not.toContain('custom-class')
    })
  })

  describe('controlled vs uncontrolled selection', () => {
    it('should use controlled selectedPath when provided', () => {
      // Arrange & Act
      render(<FileExplorer {...defaultProps} selectedPath="/main.lua" />)

      // Assert - main.lua should be selected
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      expect(item?.className).toMatch(/selected/)
    })

    it('should manage selection internally when no controlled path', () => {
      // Arrange
      const onSelectFile = vi.fn()
      render(<FileExplorer {...defaultProps} onSelectFile={onSelectFile} />)

      // Act - click on file
      fireEvent.click(screen.getByText('main.lua'))

      // Assert
      expect(onSelectFile).toHaveBeenCalledWith('/main.lua')
    })
  })

  describe('delete key with non-existent path', () => {
    it('should not crash when path not found in tree', () => {
      // Arrange - use a selectedPath that doesn't exist
      const onDeleteFile = vi.fn()
      render(
        <FileExplorer
          {...defaultProps}
          selectedPath="/nonexistent.lua"
          onDeleteFile={onDeleteFile}
        />
      )

      // Act - should not throw
      expect(() => {
        fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })
      }).not.toThrow()

      // Assert - onDeleteFile should NOT be called
      expect(onDeleteFile).not.toHaveBeenCalled()
    })
  })

  describe('drag and drop', () => {
    it('should call onMoveFile when file dropped on folder', () => {
      // Arrange
      const onMoveFile = vi.fn()
      render(<FileExplorer {...defaultProps} onMoveFile={onMoveFile} />)

      // Act - simulate drop
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      const dataTransfer = { getData: vi.fn().mockReturnValue('/main.lua') }
      fireEvent.drop(folderItem!, { dataTransfer })

      // Assert
      expect(onMoveFile).toHaveBeenCalledWith('/main.lua', '/utils')
    })
  })

  describe('cd to location', () => {
    it('should show "Open in Shell" option when right-clicking on folder', () => {
      // Arrange
      render(<FileExplorer {...defaultProps} />)

      // Act - right-click on folder
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      fireEvent.contextMenu(folderItem!)

      // Assert - should show "Open in Shell" menu item
      expect(screen.getByText('Open in Shell')).toBeInTheDocument()
    })

    it('should call onCdToLocation when "Open in Shell" is clicked', () => {
      // Arrange
      const onCdToLocation = vi.fn()
      render(<FileExplorer {...defaultProps} onCdToLocation={onCdToLocation} />)

      // Act - right-click on folder and click "Open in Shell"
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      fireEvent.contextMenu(folderItem!)
      fireEvent.click(screen.getByText('Open in Shell'))

      // Assert
      expect(onCdToLocation).toHaveBeenCalledWith('/utils')
    })
  })
})
