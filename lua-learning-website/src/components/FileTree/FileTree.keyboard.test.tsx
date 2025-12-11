import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { FileTree } from './FileTree'
import type { TreeNode } from '../../hooks/useFileSystem'

describe('FileTree', () => {
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

    it('should not move selection below last item with ArrowDown', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath="/config.lua" onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' })

      // Assert - should not be called when at last item
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('should not move selection above first item with ArrowUp', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath="/main.lua" onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowUp' })

      // Assert - should not be called when at first item
      expect(onSelect).not.toHaveBeenCalled()
    })

    it('should expand collapsed folder with ArrowRight', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          expandedPaths={new Set()}
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowRight' })

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })

    it('should not toggle expanded folder with ArrowRight', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          expandedPaths={new Set(['/utils'])}
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowRight' })

      // Assert - should NOT call toggle since folder is already expanded
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('should collapse expanded folder with ArrowLeft', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          expandedPaths={new Set(['/utils'])}
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowLeft' })

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })

    it('should not toggle collapsed folder with ArrowLeft', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          expandedPaths={new Set()}
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowLeft' })

      // Assert - should NOT call toggle since folder is already collapsed
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('should not toggle file with ArrowRight', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath="/main.lua"
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowRight' })

      // Assert - files should not toggle
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('should not toggle file with ArrowLeft', () => {
      // Arrange
      const onToggle = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath="/main.lua"
          onToggle={onToggle}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowLeft' })

      // Assert - files should not toggle
      expect(onToggle).not.toHaveBeenCalled()
    })

    it('should select first item when no selection and ArrowDown pressed', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath={null} onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
    })

    it('should select first item when no selection and ArrowUp pressed', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath={null} onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowUp' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
    })

    it('should select first item when no selection and Enter pressed', () => {
      // Arrange
      const onSelect = vi.fn()
      render(<FileTree {...defaultProps} tree={flatTree} selectedPath={null} onSelect={onSelect} />)

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Enter' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
    })

    it('should navigate through visible expanded folder children', () => {
      // Arrange
      const onSelect = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          expandedPaths={new Set(['/utils'])}
          onSelect={onSelect}
        />
      )

      // Act - arrow down should go to first child in expanded folder
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' })

      // Assert
      expect(onSelect).toHaveBeenCalledWith('/utils/math.lua')
    })

    it('should skip collapsed folder children during navigation', () => {
      // Arrange
      const onSelect = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          expandedPaths={new Set()} // folder is collapsed
          onSelect={onSelect}
        />
      )

      // Act - arrow down should skip to next sibling, not children
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' })

      // Assert - should go to main.lua, skipping folder children
      expect(onSelect).toHaveBeenCalledWith('/main.lua')
    })

    it('should handle selectedPath not in visible paths', () => {
      // Arrange - select a file that's in a collapsed folder
      const onSelect = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils/math.lua" // not visible because /utils is collapsed
          expandedPaths={new Set()}
          onSelect={onSelect}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'ArrowDown' })

      // Assert - should not crash, and should not call onSelect
      expect(onSelect).not.toHaveBeenCalled()
    })
  })

  describe('F2 rename shortcut', () => {
    it('should call onRename when F2 is pressed with selected item', () => {
      // Arrange
      const onRename = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath="/main.lua"
          onRename={onRename}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'F2' })

      // Assert
      expect(onRename).toHaveBeenCalledWith('/main.lua')
    })

    it('should not call onRename when F2 is pressed without selection', () => {
      // Arrange
      const onRename = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath={null}
          onRename={onRename}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'F2' })

      // Assert
      expect(onRename).not.toHaveBeenCalled()
    })

    it('should not call onRename when onRename is not provided', () => {
      // Arrange - no onRename callback provided
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath="/main.lua"
        />
      )

      // Act & Assert - should not throw
      expect(() => {
        fireEvent.keyDown(screen.getByRole('tree'), { key: 'F2' })
      }).not.toThrow()
    })

    it('should call onRename for folders', () => {
      // Arrange
      const onRename = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          onRename={onRename}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'F2' })

      // Assert
      expect(onRename).toHaveBeenCalledWith('/utils')
    })
  })

  describe('Delete key shortcut', () => {
    it('should call onDelete when Delete is pressed with selected item', () => {
      // Arrange
      const onDelete = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath="/main.lua"
          onDelete={onDelete}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })

      // Assert
      expect(onDelete).toHaveBeenCalledWith('/main.lua')
    })

    it('should not call onDelete when Delete is pressed without selection', () => {
      // Arrange
      const onDelete = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath={null}
          onDelete={onDelete}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })

      // Assert
      expect(onDelete).not.toHaveBeenCalled()
    })

    it('should not call onDelete when onDelete is not provided', () => {
      // Arrange - no onDelete callback provided
      render(
        <FileTree
          {...defaultProps}
          tree={flatTree}
          selectedPath="/main.lua"
        />
      )

      // Act & Assert - should not throw
      expect(() => {
        fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })
      }).not.toThrow()
    })

    it('should call onDelete for folders', () => {
      // Arrange
      const onDelete = vi.fn()
      render(
        <FileTree
          {...defaultProps}
          tree={nestedTree}
          selectedPath="/utils"
          onDelete={onDelete}
        />
      )

      // Act
      fireEvent.keyDown(screen.getByRole('tree'), { key: 'Delete' })

      // Assert
      expect(onDelete).toHaveBeenCalledWith('/utils')
    })
  })
})
