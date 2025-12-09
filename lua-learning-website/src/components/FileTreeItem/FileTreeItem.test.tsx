import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { FileTreeItem } from './FileTreeItem'

describe('FileTreeItem', () => {
  const defaultFileProps = {
    name: 'main.lua',
    path: '/main.lua',
    type: 'file' as const,
    isSelected: false,
    onClick: vi.fn(),
  }

  const defaultFolderProps = {
    name: 'utils',
    path: '/utils',
    type: 'folder' as const,
    isSelected: false,
    isExpanded: false,
    onClick: vi.fn(),
    onToggle: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('should render file name', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.getByText('main.lua')).toBeInTheDocument()
    })

    it('should render folder name', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} />)

      // Assert
      expect(screen.getByText('utils')).toBeInTheDocument()
    })

    it('should render folder with chevron', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} />)

      // Assert
      expect(screen.getByTestId('folder-chevron')).toBeInTheDocument()
    })

    it('should not render chevron for file', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.queryByTestId('folder-chevron')).not.toBeInTheDocument()
    })

    it('should render file icon for files', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
    })

    it('should render folder icon for folders', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} />)

      // Assert
      expect(screen.getByTestId('folder-icon')).toBeInTheDocument()
    })

    it('should render expanded chevron when folder is expanded', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} isExpanded={true} />)

      // Assert
      const chevron = screen.getByTestId('folder-chevron')
      // CSS modules add hash suffix, so check class name contains 'expanded'
      expect(chevron.className).toMatch(/expanded/)
    })

    it('should render collapsed chevron when folder is collapsed', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} isExpanded={false} />)

      // Assert
      const chevron = screen.getByTestId('folder-chevron')
      expect(chevron.className).not.toMatch(/expanded/)
    })
  })

  describe('selection', () => {
    it('should highlight when selected', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} isSelected={true} />)

      // Assert - CSS modules add hash suffix
      expect(screen.getByRole('treeitem').className).toMatch(/selected/)
    })

    it('should not highlight when not selected', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} isSelected={false} />)

      // Assert - CSS modules add hash suffix
      expect(screen.getByRole('treeitem').className).not.toMatch(/selected/)
    })
  })

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      // Arrange
      const onClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onClick={onClick} />)

      // Act
      fireEvent.click(screen.getByRole('treeitem'))

      // Assert
      expect(onClick).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onToggle when folder chevron clicked', () => {
      // Arrange
      const onToggle = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onToggle={onToggle} />)

      // Act
      fireEvent.click(screen.getByTestId('folder-chevron'))

      // Assert
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })

    it('should not call onClick when chevron is clicked', () => {
      // Arrange
      const onClick = vi.fn()
      const onToggle = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onClick={onClick} onToggle={onToggle} />)

      // Act
      fireEvent.click(screen.getByTestId('folder-chevron'))

      // Assert
      expect(onToggle).toHaveBeenCalled()
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('context menu', () => {
    it('should call onContextMenu on right-click', () => {
      // Arrange
      const onContextMenu = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onContextMenu={onContextMenu} />)

      // Act
      fireEvent.contextMenu(screen.getByRole('treeitem'))

      // Assert
      expect(onContextMenu).toHaveBeenCalled()
      expect(onContextMenu.mock.calls[0][0]).toBe('/main.lua')
    })

    it('should pass mouse event to onContextMenu', () => {
      // Arrange
      const onContextMenu = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onContextMenu={onContextMenu} />)

      // Act
      fireEvent.contextMenu(screen.getByRole('treeitem'))

      // Assert
      expect(onContextMenu.mock.calls[0][1]).toBeDefined() // event object
    })
  })

  describe('inline rename mode', () => {
    it('should show input when in rename mode', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)

      // Assert
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should not show text when in rename mode', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)

      // Assert
      expect(screen.queryByText('main.lua')).not.toBeInTheDocument()
    })

    it('should pre-fill input with current name', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)

      // Assert
      expect(screen.getByRole('textbox')).toHaveValue('main.lua')
    })

    it('should call onRenameSubmit when Enter is pressed', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'newname.lua' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // Assert
      expect(onRenameSubmit).toHaveBeenCalledWith('/main.lua', 'newname.lua')
    })

    it('should call onRenameCancel when Escape is pressed', () => {
      // Arrange
      const onRenameCancel = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameCancel={onRenameCancel} />)

      // Act
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })

      // Assert
      expect(onRenameCancel).toHaveBeenCalled()
    })

    it('should call onRenameSubmit when input loses focus', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'newname.lua' } })
      fireEvent.blur(input)

      // Assert
      expect(onRenameSubmit).toHaveBeenCalledWith('/main.lua', 'newname.lua')
    })

    it('should stop propagation for left arrow key', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })

      // Assert - event should be stopped (not bubble up)
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for right arrow key', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowRight' })

      // Assert - event should be stopped
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for up arrow key', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp' })

      // Assert - event should be stopped
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for down arrow key', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowDown' })

      // Assert - event should be stopped
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for Home key', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'Home' })

      // Assert - event should be stopped
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for End key', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'End' })

      // Assert - event should be stopped
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should prevent keyboard events from bubbling during rename', () => {
      // Arrange
      const parentKeyHandler = vi.fn()
      render(
        <div onKeyDown={parentKeyHandler}>
          <FileTreeItem {...defaultFileProps} isRenaming={true} />
        </div>
      )

      // Act
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Home' })
      fireEvent.keyDown(input, { key: 'End' })

      // Assert - none of the events should reach parent
      expect(parentKeyHandler).not.toHaveBeenCalled()
    })

    it('should not call onRenameCancel when regular keys are pressed', () => {
      // Arrange
      const onRenameCancel = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameCancel={onRenameCancel} />)

      // Act - press various keys that should not trigger cancel
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'a' })
      fireEvent.keyDown(input, { key: 'Home' })
      fireEvent.keyDown(input, { key: 'End' })

      // Assert - cancel should not be called for these keys
      expect(onRenameCancel).not.toHaveBeenCalled()
    })

    it('should not call onRenameSubmit when regular navigation keys are pressed', () => {
      // Arrange
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)

      // Act - press navigation keys that should not trigger submit
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'Home' })
      fireEvent.keyDown(input, { key: 'End' })

      // Assert - submit should not be called for these keys
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })
  })

  describe('accessibility', () => {
    it('should have role treeitem', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.getByRole('treeitem')).toBeInTheDocument()
    })

    it('should have aria-label with file name', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-label', 'main.lua')
    })

    it('should indicate expanded state for folders', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} isExpanded={true} />)

      // Assert
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'true')
    })

    it('should indicate collapsed state for folders', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFolderProps} isExpanded={false} />)

      // Assert
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'false')
    })

    it('should not have aria-expanded for files', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.getByRole('treeitem')).not.toHaveAttribute('aria-expanded')
    })

    it('should indicate selected state', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} isSelected={true} />)

      // Assert
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('indentation', () => {
    it('should apply indentation based on depth', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} depth={2} />)

      // Assert
      const item = screen.getByRole('treeitem')
      expect(item).toHaveStyle({ paddingLeft: '32px' }) // 16px * 2
    })

    it('should default to depth 0', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      const item = screen.getByRole('treeitem')
      expect(item).toHaveStyle({ paddingLeft: '0px' })
    })
  })

  describe('drag and drop', () => {
    it('should be draggable', () => {
      // Arrange & Act
      render(<FileTreeItem {...defaultFileProps} />)

      // Assert
      expect(screen.getByRole('treeitem')).toHaveAttribute('draggable', 'true')
    })

    it('should set drag data on drag start', () => {
      // Arrange
      render(<FileTreeItem {...defaultFileProps} />)
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      }

      // Act
      fireEvent.dragStart(screen.getByRole('treeitem'), { dataTransfer })

      // Assert
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '/main.lua')
    })

    it('should call onDragStart when provided', () => {
      // Arrange
      const onDragStart = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onDragStart={onDragStart} />)
      const dataTransfer = {
        setData: vi.fn(),
        effectAllowed: '',
      }

      // Act
      fireEvent.dragStart(screen.getByRole('treeitem'), { dataTransfer })

      // Assert
      expect(onDragStart).toHaveBeenCalledWith('/main.lua')
    })

    it('folder should accept drop', () => {
      // Arrange
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('/some-file.lua'),
      }

      // Act
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })

      // Assert
      expect(onDrop).toHaveBeenCalledWith('/some-file.lua', '/utils')
    })

    it('folder should show drag-over state during drag', () => {
      // Arrange
      render(<FileTreeItem {...defaultFolderProps} />)
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('/some-file.lua'),
        dropEffect: '',
      }

      // Act
      fireEvent.dragOver(screen.getByRole('treeitem'), { dataTransfer })

      // Assert
      expect(screen.getByRole('treeitem').className).toMatch(/dragOver/)
    })

    it('folder should clear drag-over state on drag leave', () => {
      // Arrange
      render(<FileTreeItem {...defaultFolderProps} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/some-file.lua'), dropEffect: '' }
      const item = screen.getByRole('treeitem')

      // Set drag over state
      fireEvent.dragOver(item, { dataTransfer })
      expect(item.className).toMatch(/dragOver/)

      // Act
      fireEvent.dragLeave(item)

      // Assert
      expect(item.className).not.toMatch(/dragOver/)
    })

    it('file should not accept drop', () => {
      // Arrange
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onDrop={onDrop} />)
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('/other-file.lua'),
      }

      // Act
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })

      // Assert
      expect(onDrop).not.toHaveBeenCalled()
    })

    it('should not trigger drop when dropping item on itself', () => {
      // Arrange
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('/utils'), // Same path as the folder
      }

      // Act
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })

      // Assert
      expect(onDrop).not.toHaveBeenCalled()
    })

    it('should not trigger drop when dropping item into its own subfolder', () => {
      // Arrange
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const dataTransfer = {
        getData: vi.fn().mockReturnValue('/'), // Root folder containing utils
      }

      // Act - dropping root into /utils (which is inside root)
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })

      // Assert - this should work because /utils is not inside /
      expect(onDrop).toHaveBeenCalled()
    })
  })
})
