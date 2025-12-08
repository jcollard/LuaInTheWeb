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

  describe('keyboard navigation', () => {
    it('should move selection down with ArrowDown', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath="/main.lua" onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/config.lua')
    })

    it('should move selection up with ArrowUp', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath="/config.lua" onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowUp' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
    })

    it('should toggle folder with Enter key', () => {
      // Arrange
      const onToggle = vi.fn()
      render(<FileTree {...defaultProps} tree={nestedTree} selectedPath="/utils" onToggle={onToggle} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Enter' })

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })

    it('should call onSelect with Enter for files', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath="/main.lua" onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Enter' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
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
  })
})
