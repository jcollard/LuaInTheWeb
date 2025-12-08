import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import { SidebarPanel } from './SidebarPanel'
import type { TreeNode } from '../../hooks/useFileSystem'

describe('SidebarPanel', () => {
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

  const defaultExplorerProps = {
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
    it('should render placeholder content', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument()
    })

    it('should show "Explorer" header when explorer is active', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByText('Explorer')).toBeInTheDocument()
    })

    it('should show "Search" header when search is active', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="search" />)

      // Assert
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('should show "Extensions" header when extensions is active', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="extensions" />)

      // Assert
      expect(screen.getByText('Extensions')).toBeInTheDocument()
    })

    it('should show "Coming soon" placeholder for search panel', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="search" />)

      // Assert
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    })

    it('should show "Coming soon" placeholder for extensions panel', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="extensions" />)

      // Assert
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    })
  })

  describe('FileExplorer integration', () => {
    it('should render FileExplorer when explorer is active and props provided', () => {
      // Arrange & Act
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={defaultExplorerProps}
        />
      )

      // Assert
      expect(screen.getByRole('tree')).toBeInTheDocument()
      expect(screen.getByText('main.lua')).toBeInTheDocument()
      expect(screen.getByText('utils')).toBeInTheDocument()
    })

    it('should render file tree with correct structure', () => {
      // Arrange & Act
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={defaultExplorerProps}
        />
      )

      // Assert
      expect(screen.getByRole('tree')).toBeInTheDocument()
      expect(screen.getByText('main.lua')).toBeInTheDocument()
    })

    it('should call onSelectFile when file is clicked', () => {
      // Arrange
      const onSelectFile = vi.fn()
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={{ ...defaultExplorerProps, onSelectFile }}
        />
      )

      // Act
      fireEvent.click(screen.getByText('main.lua'))

      // Assert
      expect(onSelectFile).toHaveBeenCalledWith('/main.lua')
    })

    it('should render New File button', () => {
      // Arrange & Act
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={defaultExplorerProps}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /new file/i })).toBeInTheDocument()
    })

    it('should render New Folder button', () => {
      // Arrange & Act
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={defaultExplorerProps}
        />
      )

      // Assert
      expect(screen.getByRole('button', { name: /new folder/i })).toBeInTheDocument()
    })

    it('should call onCreateFile when New File button clicked', () => {
      // Arrange
      const onCreateFile = vi.fn()
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={{ ...defaultExplorerProps, onCreateFile }}
        />
      )

      // Act
      fireEvent.click(screen.getByRole('button', { name: /new file/i }))

      // Assert
      expect(onCreateFile).toHaveBeenCalled()
    })

    it('should call onCreateFolder when New Folder button clicked', () => {
      // Arrange
      const onCreateFolder = vi.fn()
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={{ ...defaultExplorerProps, onCreateFolder }}
        />
      )

      // Act
      fireEvent.click(screen.getByRole('button', { name: /new folder/i }))

      // Assert
      expect(onCreateFolder).toHaveBeenCalled()
    })

    it('should highlight selected file', () => {
      // Arrange & Act
      render(
        <SidebarPanel
          activePanel="explorer"
          explorerProps={{ ...defaultExplorerProps, selectedPath: '/main.lua' }}
        />
      )

      // Assert
      const item = screen.getByText('main.lua').closest('[role="treeitem"]')
      expect(item?.className).toMatch(/selected/)
    })

    it('should show placeholder when explorer active but no props provided', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.queryByRole('tree')).not.toBeInTheDocument()
      expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
    })

    it('should not render FileExplorer when search panel is active', () => {
      // Arrange & Act
      render(
        <SidebarPanel
          activePanel="search"
          explorerProps={defaultExplorerProps}
        />
      )

      // Assert
      expect(screen.queryByRole('tree')).not.toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should accept className prop', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" className="custom-class" />)

      // Assert
      expect(screen.getByTestId('sidebar-panel')).toHaveClass('custom-class')
    })
  })

  describe('accessibility', () => {
    it('should have appropriate region role', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByRole('complementary')).toBeInTheDocument()
    })

    it('should have aria-label describing the panel', () => {
      // Arrange & Act
      render(<SidebarPanel activePanel="explorer" />)

      // Assert
      expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Sidebar')
    })
  })
})
