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
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.getByText('main.lua')).toBeInTheDocument()
    })

    it('should render folder name', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      expect(screen.getByText('utils')).toBeInTheDocument()
    })

    it('should render folder with chevron', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      expect(screen.getByTestId('folder-chevron')).toBeInTheDocument()
    })

    it('should not render chevron for file', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.queryByTestId('folder-chevron')).not.toBeInTheDocument()
    })

    it('should render file icon for files', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
    })

    it('should render folder icon for folders', () => {
      render(<FileTreeItem {...defaultFolderProps} />)
      expect(screen.getByTestId('folder-icon')).toBeInTheDocument()
    })

    it('should render expanded chevron when folder is expanded', () => {
      render(<FileTreeItem {...defaultFolderProps} isExpanded={true} />)
      const chevron = screen.getByTestId('folder-chevron')
      expect(chevron.className).toMatch(/expanded/)
    })

    it('should render collapsed chevron when folder is collapsed', () => {
      render(<FileTreeItem {...defaultFolderProps} isExpanded={false} />)
      const chevron = screen.getByTestId('folder-chevron')
      expect(chevron.className).not.toMatch(/expanded/)
    })
  })

  describe('selection', () => {
    it('should highlight when selected', () => {
      render(<FileTreeItem {...defaultFileProps} isSelected={true} />)
      expect(screen.getByRole('treeitem').className).toMatch(/selected/)
    })

    it('should not highlight when not selected', () => {
      render(<FileTreeItem {...defaultFileProps} isSelected={false} />)
      expect(screen.getByRole('treeitem').className).not.toMatch(/selected/)
    })
  })

  describe('click handling', () => {
    it('should call onClick when clicked', () => {
      const onClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onClick={onClick} />)
      fireEvent.click(screen.getByRole('treeitem'))
      expect(onClick).toHaveBeenCalledWith('/main.lua')
    })

    it('should call onToggle when folder chevron clicked', () => {
      const onToggle = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onToggle={onToggle} />)
      fireEvent.click(screen.getByTestId('folder-chevron'))
      expect(onToggle).toHaveBeenCalledWith('/utils')
    })

    it('should not call onClick when chevron is clicked', () => {
      const onClick = vi.fn()
      const onToggle = vi.fn()
      render(<FileTreeItem {...defaultFolderProps} onClick={onClick} onToggle={onToggle} />)
      fireEvent.click(screen.getByTestId('folder-chevron'))
      expect(onToggle).toHaveBeenCalled()
      expect(onClick).not.toHaveBeenCalled()
    })
  })

  describe('context menu', () => {
    it('should call onContextMenu on right-click', () => {
      const onContextMenu = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onContextMenu={onContextMenu} />)
      fireEvent.contextMenu(screen.getByRole('treeitem'))
      expect(onContextMenu).toHaveBeenCalled()
      expect(onContextMenu.mock.calls[0][0]).toBe('/main.lua')
    })

    it('should pass mouse event to onContextMenu', () => {
      const onContextMenu = vi.fn()
      render(<FileTreeItem {...defaultFileProps} onContextMenu={onContextMenu} />)
      fireEvent.contextMenu(screen.getByRole('treeitem'))
      expect(onContextMenu.mock.calls[0][1]).toBeDefined()
    })
  })

  describe('accessibility', () => {
    it('should have role treeitem', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.getByRole('treeitem')).toBeInTheDocument()
    })

    it('should have aria-label with file name', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-label', 'main.lua')
    })

    it('should indicate expanded state for folders', () => {
      render(<FileTreeItem {...defaultFolderProps} isExpanded={true} />)
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'true')
    })

    it('should indicate collapsed state for folders', () => {
      render(<FileTreeItem {...defaultFolderProps} isExpanded={false} />)
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-expanded', 'false')
    })

    it('should not have aria-expanded for files', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(screen.getByRole('treeitem')).not.toHaveAttribute('aria-expanded')
    })

    it('should indicate selected state', () => {
      render(<FileTreeItem {...defaultFileProps} isSelected={true} />)
      expect(screen.getByRole('treeitem')).toHaveAttribute('aria-selected', 'true')
    })
  })

  describe('indentation', () => {
    it('should apply indentation based on depth', () => {
      render(<FileTreeItem {...defaultFileProps} depth={2} />)
      const item = screen.getByRole('treeitem')
      expect(item).toHaveStyle({ paddingLeft: '32px' })
    })

    it('should default to depth 0', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      const item = screen.getByRole('treeitem')
      expect(item).toHaveStyle({ paddingLeft: '0px' })
    })
  })

  describe('effect hooks', () => {
    it('should reset rename value when name prop changes', () => {
      const { rerender } = render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'changed-name.lua' } })
      expect(input).toHaveValue('changed-name.lua')

      rerender(<FileTreeItem {...defaultFileProps} name="new-name.lua" isRenaming={true} />)
      expect(screen.getByRole('textbox')).toHaveValue('new-name.lua')
    })

    it('should reset rename value when exiting rename mode', () => {
      const { rerender } = render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      const input = screen.getByRole('textbox')
      fireEvent.change(input, { target: { value: 'changed-name.lua' } })

      rerender(<FileTreeItem {...defaultFileProps} isRenaming={false} />)
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()

      rerender(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(screen.getByRole('textbox')).toHaveValue('main.lua')
    })
  })

  describe('click handling edge cases', () => {
    it('should stop click propagation when clicking rename input', () => {
      const onClick = vi.fn()
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} onClick={onClick} />)
      fireEvent.click(screen.getByRole('textbox'))
      expect(onClick).not.toHaveBeenCalled()
    })

    it('should work without onToggle callback for folders', () => {
      render(<FileTreeItem {...defaultFolderProps} onToggle={undefined} />)
      expect(() => {
        fireEvent.click(screen.getByTestId('folder-chevron'))
      }).not.toThrow()
    })

    it('should work without onContextMenu callback', () => {
      render(<FileTreeItem {...defaultFileProps} />)
      expect(() => {
        fireEvent.contextMenu(screen.getByRole('treeitem'))
      }).not.toThrow()
    })
  })

  describe('rename handlers edge cases', () => {
    it('should work without onRenameSubmit callback on Enter', () => {
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(() => {
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Enter' })
      }).not.toThrow()
    })

    it('should work without onRenameCancel callback on Escape', () => {
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(() => {
        fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' })
      }).not.toThrow()
    })

    it('should work without onRenameSubmit callback on blur', () => {
      render(<FileTreeItem {...defaultFileProps} isRenaming={true} />)
      expect(() => {
        fireEvent.blur(screen.getByRole('textbox'))
      }).not.toThrow()
    })
  })
})
