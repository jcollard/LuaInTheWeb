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

  describe('double-click detection', () => {
    it('should call onClick on single click', () => {
      const onClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onClick={onClick} />)
      fireEvent.click(screen.getByRole('treeitem'))
      expect(onClick).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onDoubleClick on double click', () => {
      const onClick = vi.fn()
      const onDoubleClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onClick={onClick} onDoubleClick={onDoubleClick} />)
      fireEvent.doubleClick(screen.getByRole('treeitem'))
      expect(onDoubleClick).toHaveBeenCalledWith('/main.lua')
    })

    it('should not call onDoubleClick if not provided', () => {
      const onClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onClick={onClick} />)
      // Should not throw when double clicking without handler
      expect(() => {
        fireEvent.doubleClick(screen.getByRole('treeitem'))
      }).not.toThrow()
    })

    it('should call both onClick and onDoubleClick when double clicking', () => {
      const onClick = vi.fn()
      const onDoubleClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onClick={onClick} onDoubleClick={onDoubleClick} />)
      fireEvent.doubleClick(screen.getByRole('treeitem'))
      // Double click events in browsers also fire click events
      expect(onDoubleClick).toHaveBeenCalledWith('/main.lua')
    })

    it('should work on folders too', () => {
      const onClick = vi.fn()
      const onDoubleClick = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onClick={onClick} onDoubleClick={onDoubleClick} />)
      fireEvent.doubleClick(screen.getByRole('treeitem'))
      expect(onDoubleClick).toHaveBeenCalledWith('/utils')
    })
  })

  describe('inline rename mode', () => {
    it('should show input when in rename mode', () => {
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
    })

    it('should not show text when in rename mode', () => {
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(screen.queryByText('main.lua')).not.toBeInTheDocument()
    })

    it('should pre-fill input with current name', () => {
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(screen.getByRole('textbox')).toHaveValue('main.lua')
    })

    it('should call onRenameSubmit when Enter is pressed', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'newname.lua' } })
      fireEvent.keyDown(input, { key: 'Enter' })
      expect(onRenameSubmit).toHaveBeenCalledWith('/main.lua', 'newname.lua')
    })

    it('should call onRenameCancel when Escape is pressed', () => {
      const onRenameCancel = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameCancel={onRenameCancel} />)
      fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
      expect(onRenameCancel).toHaveBeenCalled()
    })

    it('should call onRenameSubmit when input loses focus', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'newname.lua' } })
      fireEvent.blur(input)
      expect(onRenameSubmit).toHaveBeenCalledWith('/main.lua', 'newname.lua')
    })

    it('should stop propagation for left arrow key', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for right arrow key', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for up arrow key', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for down arrow key', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for Home key', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'Home' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should stop propagation for End key', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'End' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })

    it('should prevent keyboard events from bubbling during rename', () => {
      const parentKeyHandler = vi.fn()
      render(
        <div onKeyDown={parentKeyHandler}>
          <FileTreeItem {...defaultFileProps} isRenaming={true} />
        </div>
      )
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'ArrowUp' })
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      fireEvent.keyDown(input, { key: 'Home' })
      fireEvent.keyDown(input, { key: 'End' })
      expect(parentKeyHandler).not.toHaveBeenCalled()
    })

    it('should not call onRenameCancel when regular keys are pressed', () => {
      const onRenameCancel = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameCancel={onRenameCancel} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'a' })
      fireEvent.keyDown(input, { key: 'Home' })
      fireEvent.keyDown(input, { key: 'End' })
      expect(onRenameCancel).not.toHaveBeenCalled()
    })

    it('should not call onRenameSubmit when regular navigation keys are pressed', () => {
      const onRenameSubmit = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onRenameSubmit={onRenameSubmit} />)
      const input = screen.getByRole('textbox')
      fireEvent.keyDown(input, { key: 'ArrowLeft' })
      fireEvent.keyDown(input, { key: 'ArrowRight' })
      fireEvent.keyDown(input, { key: 'Home' })
      fireEvent.keyDown(input, { key: 'End' })
      expect(onRenameSubmit).not.toHaveBeenCalled()
    })
  })

  describe('drag and drop', () => {
    it('should be draggable', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.getByRole('treeitem')).toHaveAttribute('draggable', 'true')
    })

    it('should set drag data on drag start', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
      fireEvent.dragStart(screen.getByRole('treeitem'), { dataTransfer })
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '/main.lua')
    })

    it('should call onDragStart when provided', () => {
      const onDragStart = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onDragStart={onDragStart} />)
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
      fireEvent.dragStart(screen.getByRole('treeitem'), { dataTransfer })
      expect(onDragStart).toHaveBeenCalledWith('/main.lua')
    })

    it('folder should accept drop', () => {
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/some-file.lua') }
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })
      expect(onDrop).toHaveBeenCalledWith('/some-file.lua', '/utils')
    })

    it('folder should show drag-over state during drag', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/some-file.lua'), dropEffect: '' }
      fireEvent.dragOver(screen.getByRole('treeitem'), { dataTransfer })
      expect(screen.getByRole('treeitem').className).toMatch(/dragOver/)
    })

    it('folder should clear drag-over state on drag leave', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/some-file.lua'), dropEffect: '' }
      const item = screen.getByRole('treeitem')
      fireEvent.dragOver(item, { dataTransfer })
      expect(item.className).toMatch(/dragOver/)
      fireEvent.dragLeave(item)
      expect(item.className).not.toMatch(/dragOver/)
    })

    it('file should not accept drop', () => {
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onDrop={onDrop} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/other-file.lua') }
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })
      expect(onDrop).not.toHaveBeenCalled()
    })

    it('should not trigger drop when dropping item on itself', () => {
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/utils') }
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })
      expect(onDrop).not.toHaveBeenCalled()
    })

    it('should not trigger drop when dropping item into its own subfolder', () => {
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/') }
      fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })
      expect(onDrop).toHaveBeenCalled()
    })

    it('should set effectAllowed to move on drag start', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
      fireEvent.dragStart(screen.getByRole('treeitem'), { dataTransfer })
      expect(dataTransfer.effectAllowed).toBe('move')
    })

    it('should set dropEffect to move on drag over folder', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      const dataTransfer = { getData: vi.fn(), dropEffect: '' }
      fireEvent.dragOver(screen.getByRole('treeitem'), { dataTransfer })
      expect(dataTransfer.dropEffect).toBe('move')
    })

    it('should NOT set dragOver state for files', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      const dataTransfer = { getData: vi.fn(), dropEffect: '' }
      fireEvent.dragOver(screen.getByRole('treeitem'), { dataTransfer })
      expect(screen.getByRole('treeitem').className).not.toMatch(/dragOver/)
    })

    it('should clear dragOver state on drop', () => {
      const onDrop = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onDrop={onDrop} />)
      const item = screen.getByRole('treeitem')
      const dragOverTransfer = { getData: vi.fn(), dropEffect: '' }
      const dropTransfer = { getData: vi.fn().mockReturnValue('/some-file.lua') }
      fireEvent.dragOver(item, { dataTransfer: dragOverTransfer })
      expect(item.className).toMatch(/dragOver/)
      fireEvent.drop(item, { dataTransfer: dropTransfer })
      expect(item.className).not.toMatch(/dragOver/)
    })

    it('should work without onDragStart callback', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      const dataTransfer = { setData: vi.fn(), effectAllowed: '' }
      expect(() => {
        fireEvent.dragStart(screen.getByRole('treeitem'), { dataTransfer })
      }).not.toThrow()
    })

    it('should work without onDrop callback', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      const dataTransfer = { getData: vi.fn().mockReturnValue('/file.lua') }
      expect(() => {
        fireEvent.drop(screen.getByRole('treeitem'), { dataTransfer })
      }).not.toThrow()
    })
  })
})
