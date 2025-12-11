import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { FileTree } from './FileTree'
import type { TreeNode } from '../../hooks/useFileSystem'

describe('FileTree', () => {
  const emptyTree: TreeNode[] = []

  const flatTree: TreeNode[] = [
    { name: 'main.lua', path: '/main.lua', type: 'file' },
    { name: 'config.lua', path: '/config.lua', type: 'file' },
  ]

  const nestedTree: TreeNode[] = [
    {
      name: 'utils',
      path: '/utils',
      type: 'folder',
      children: [
        { name: 'math.lua', path: '/utils/math.lua', type: 'file' },
        { name: 'string.lua', path: '/utils/string.lua', type: 'file' },
      ],
    },
    { name: 'main.lua', path: '/main.lua', type: 'file' },
  ]

  const deepTree: TreeNode[] = [
    {
      name: 'a',
      path: '/a',
      type: 'folder',
      children: [
        {
          name: 'b',
          path: '/a/b',
          type: 'folder',
          children: [
            {
              name: 'c',
              path: '/a/b/c',
              type: 'folder',
              children: [
                { name: 'deep.lua', path: '/a/b/c/deep.lua', type: 'file' },
              ],
            },
          ],
        },
      ],
    },
  ]

  const defaultProps = {
    tree: flatTree,
    selectedPath: null as string | null,
    expandedPaths: new Set<string>(),
    onSelect: vi.fn(),
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render empty state when no files', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={emptyTree} />)

      // Assert
      expect(screen.getByText(/no files/i)).toBeInTheDocument()
    })

    it('should render flat list of files', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={flatTree} />)

      // Assert
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.getByText('config.lua')).toBeInTheDocument()
    })

    it('should render nested folders', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={nestedTree} expandedPaths={new Set(['/utils'])} />)

      // Assert
      expect(screen.getByText('utils')).toBeInTheDocument()
      expect(screen.getByText('math.lua')).toBeInTheDocument()
      expect(screen.getByText('string.lua')).toBeInTheDocument()
      expect(screen.getByText('main.lua')).toBeInTheDocument()
    })

    it('should hide children of collapsed folders', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={nestedTree} expandedPaths={new Set()} />)

      // Assert
      expect(screen.getByText('utils')).toBeInTheDocument()
      expect(screen.queryByText('math.lua')).not.toBeInTheDocument()
      expect(screen.queryByText('string.lua')).not.toBeInTheDocument()
    })

    it('should render recursively for deep nesting', () => {
      // Arrange & Act
      const allExpanded = new Set(['/a', '/a/b', '/a/b/c'])
      render(<FileTree {...defaultProps} tree={deepTree} expandedPaths={allExpanded} />)

      // Assert
      expect(screen.getByText('a')).toBeInTheDocument()
      expect(screen.getByText('b')).toBeInTheDocument()
      expect(screen.getByText('c')).toBeInTheDocument()
      expect(screen.getByText('deep.lua')).toBeInTheDocument()
    })
  })

  describe('expand/collapse', () => {
    it('should expand folder when clicked', () => {
      // Arrange
      const onToggle = vi.fn()
      render(<FileTree {...defaultProps} tree={nestedTree} onToggle={onToggle} />)

      // Act
      fireEvent.click(screen.getByTestId('folder-chevron'))

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })

    it('should collapse folder when clicked again', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          expandedPaths={new Set(['/utils'])}
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.click(screen.getByTestId('folder-chevron'))

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })
  })

  describe('selection', () => {
    it('should highlight selected file', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath="/main.lua" />)

      // Assert
      const items = screen.getAllByRole('treeitem')
      const mainItem = items.find(item => item.getAttribute('aria-label') === 'main.lua')
      expect(mainItem?.className).toMatch(/selected/)
    })

    it('should call onSelect when file clicked', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} onSelect={onSelect} />)

      // Act
      fireEvent.click(screen.getByText('main.lua'))

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onSelect when folder clicked', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={nestedTree} onSelect={onSelect} />)

      // Act - click on folder text, not chevron
      fireEvent.click(screen.getByText('utils'))

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/utils')
    })
  })

  describe('context menu', () => {
    it('should call onContextMenu when right-clicking file', () => {
      // Arrange
      const onContextMenu = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} onContextMenu={onContextMenu} />)

      // Act
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      fireEvent.contextMenu(item!)

      // Assert
      expect(onContextMenu).toHaveBeenCalled()
      expect(onContextMenu.mock.calls[0][0]).toBe('/main.lua')
    })
  })

  describe('accessibility', () => {
    it('should have role tree', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={flatTree} />)

      // Assert
      expect(screen.getByRole('tree')).toBeInTheDocument()
    })

    it('should have aria-label', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={flatTree} />)

      // Assert
      expect(screen.getByRole('tree')).toHaveAttribute('aria-label', 'File Explorer')
    })

    it('should have tabindex for keyboard focus', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={flatTree} />)

      // Assert
      expect(screen.getByRole('tree')).toHaveAttribute('tabIndex', '0')
    })

    it('empty tree should have role tree but no tabindex', () => {
      // Arrange & Act
      render(<FileTree {...defaultProps} tree={emptyTree} />)

      // Assert
      expect(screen.getByRole('tree')).toBeInTheDocument()
      expect(screen.getByRole('tree')).not.toHaveAttribute('tabIndex')
    })
  })

  describe('inline rename', () => {
    it('should show rename input when renamingPath matches', () => {
      // Arrange & Act
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          renamingPath="/main.lua"
          onRenameSubmit={vi.fn()}
          onRenameCancel={vi.fn()}
        />
      )

      // Assert
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('main.lua')
    })

    it('should show rename input for folder', () => {
      // Arrange & Act
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          renamingPath="/utils"
          onRenameSubmit={vi.fn()}
          onRenameCancel={vi.fn()}
        />
      )

      // Assert
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByRole('textbox')).toHaveValue('utils')
    })

    it('should not show rename input when renamingPath does not match', () => {
      // Arrange & Act
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          renamingPath="/other.lua"
          onRenameSubmit={vi.fn()}
          onRenameCancel={vi.fn()}
        />
      )

      // Assert
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    })
  })

  describe('drag and drop', () => {
    it('should pass onDrop to FileTreeItem', () => {
      // Arrange
      const onDrop = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          expandedPaths={new Set(['/utils'])}
          onDrop={onDrop}
        />
      )

      // Act - simulate drop on folder
      const folderItem = screen.getByText('utils').closest('[role="treeitem"]')
      const dataTransfer = { getData: vi.fn().mockReturnValue('/main.lua') }
      fireEvent.drop(folderItem!, { dataTransfer })

      // Assert
      expect(onDrop).toHaveBeenCalledWith('/main.lua', '/utils')
    })
  })

  describe('deep tree navigation', () => {
    it('should find selected node in deeply nested tree', () => {
      // Arrange
      const onToggle = vi.fn()
      const allExpanded = new Set(['/a', '/a/b', '/a/b/c'])
      render(
        <FileTree
          {...defaultProps}
          tree={deepTree}
          selectedPath="/a/b/c/deep.lua"
          expandedPaths={allExpanded}
          onToggle={onToggle}
        />
      )

      // Act - try to toggle with Enter (should call onSelect for file)
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Enter' })

      // Assert - should NOT call onToggle since it's a file
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('should find and toggle deeply nested folder', () => {
      // Arrange
      const onToggle = vi.fn()
      const allExpanded = new Set(['/a', '/a/b'])
      render(
        <FileTree
          {...defaultProps}
          tree={deepTree}
          selectedPath="/a/b/c"
          expandedPaths={allExpanded}
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Enter' })

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/a/b/c')
    })
  })
})
