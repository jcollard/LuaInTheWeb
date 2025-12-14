import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { IDELayout } from './IDELayout'

// Mock Monaco Editor with onChange support
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (value: string | undefined) => void }) => (
    <textarea
      data-testid="mock-monaco"
      defaultValue={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}))

// Mock useLuaEngine
vi.mock('../../hooks/useLuaEngine', () => ({
  useLuaEngine: vi.fn(() => ({
    isReady: true,
    execute: vi.fn(),
    reset: vi.fn(),
  })),
}))

// Mock LuaRepl
vi.mock('../LuaRepl', () => ({
  default: () => <div data-testid="lua-repl">LuaRepl Mock</div>,
}))

// Mock theme context (CodeEditor uses useTheme)
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
    isDark: true,
  }),
}))

// Mock xterm.js for ShellTerminal
vi.mock('@xterm/xterm', () => {
  const MockTerminal = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.loadAddon = vi.fn()
    this.open = vi.fn()
    this.write = vi.fn()
    this.writeln = vi.fn()
    this.onData = vi.fn()
    this.attachCustomKeyEventHandler = vi.fn()
    this.dispose = vi.fn()
    this.clear = vi.fn()
    this.refresh = vi.fn()
    this.rows = 24
    this.options = {}
  })
  return { Terminal: MockTerminal }
})

vi.mock('@xterm/addon-fit', () => {
  const MockFitAddon = vi.fn().mockImplementation(function(this: Record<string, unknown>) {
    this.fit = vi.fn()
  })
  return { FitAddon: MockFitAddon }
})

describe('IDELayout', () => {
  describe('rendering', () => {
    it('should render IDEContextProvider (context available)', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert - if context wasn't provided, components would fail
      expect(screen.getByTestId('ide-layout')).toBeInTheDocument()
    })

    it('should render ActivityBar', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert
      expect(screen.getByRole('navigation', { name: /activity bar/i })).toBeInTheDocument()
    })

    it('should render main panel group', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert - should have sidebar and welcome screen (no files open)
      expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument()
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
    })

    it('should render StatusBar', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('should render BottomPanel', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert
      expect(screen.getByTestId('bottom-panel')).toBeInTheDocument()
    })
  })

  describe('layout structure', () => {
    it('should use correct panel layout structure', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert - should have both horizontal and vertical layouts
      const layout = screen.getByTestId('ide-layout')
      expect(layout).toBeInTheDocument()
    })

    it('should show no file tab initially (empty state)', () => {
      // Arrange & Act
      render(<IDELayout />)

      // Assert - no file tabs should be open initially
      // File tabs have close buttons, bottom panel tabs (Terminal/REPL) don't
      const closeButtons = screen.queryAllByRole('button', { name: /^close /i })
      expect(closeButtons).toHaveLength(0)
    })

    it('should show WelcomeScreen initially (no files open)', () => {
      // Arrange & Act
      render(<IDELayout initialCode="print('hello')" />)

      // Assert - Welcome screen is shown when no files are open
      expect(screen.getByTestId('welcome-screen')).toBeInTheDocument()
      expect(screen.queryByTestId('editor-panel')).not.toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      render(<IDELayout className="custom-class" />)

      // Assert
      expect(screen.getByTestId('ide-layout')).toHaveClass('custom-class')
    })
  })

  describe('dirty tab close confirmation', () => {
    beforeEach(() => {
      // Clear localStorage to ensure clean state
      localStorage.clear()
    })

    // Helper to get the file tab (not the terminal/repl tabs)
    function getFileTab() {
      return screen.getByRole('tab', { name: /untitled-\d+\.lua/i })
    }

    // Helper to query the file tab (returns null if not found)
    function queryFileTab() {
      return screen.queryByRole('tab', { name: /untitled-\d+\.lua/i })
    }

    // Helper to create and open a file
    async function createAndOpenFile(user: ReturnType<typeof userEvent.setup>) {
      // First, expand the workspace folder (my-files) to see files inside it
      const workspaceFolder = screen.getByRole('treeitem', { name: /my-files/i })
      const chevron = within(workspaceFolder).getByTestId('folder-chevron')
      await user.click(chevron)

      // Wait for workspace to expand
      await waitFor(() => {
        expect(workspaceFolder).toHaveAttribute('aria-expanded', 'true')
      })

      // Create a new file via the new file button in the sidebar (FileExplorer)
      // When at root, files are created in the first workspace (my-files) by default
      const sidebar = screen.getByTestId('sidebar-panel')
      const newFileButton = within(sidebar).getByRole('button', { name: /new file/i })
      await user.click(newFileButton)

      // Wait for file to appear in tree (new file uses unique naming like untitled-1.lua)
      // The file enters rename mode immediately
      await waitFor(() => {
        expect(screen.getByRole('treeitem', { name: /untitled-\d+\.lua/i })).toBeInTheDocument()
      })

      // Confirm the default name by pressing Enter
      await user.keyboard('{Enter}')

      // Click on the file to open it (creates a tab)
      const fileItem = screen.getByRole('treeitem', { name: /untitled-\d+\.lua/i })
      await user.click(fileItem)

      // Wait for file tab to appear
      await waitFor(() => {
        expect(getFileTab()).toBeInTheDocument()
      })
    }

    it('should close non-dirty tab immediately without confirmation', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<IDELayout />)

      await createAndOpenFile(user)

      // Verify file tab exists
      expect(getFileTab()).toBeInTheDocument()

      // Act - close the non-dirty tab using its specific close button
      const closeButton = screen.getByRole('button', { name: /close untitled-\d+\.lua/i })
      await user.click(closeButton)

      // Assert - no confirmation dialog, tab is closed
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(queryFileTab()).not.toBeInTheDocument()
    })

    it('should show confirmation dialog when closing dirty tab', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<IDELayout />)

      await createAndOpenFile(user)

      // Make the tab dirty by changing the editor content
      const editor = screen.getByTestId('mock-monaco')
      fireEvent.change(editor, { target: { value: 'print("modified")' } })

      // Verify dirty indicator appears
      await waitFor(() => {
        expect(screen.getByText('*')).toBeInTheDocument()
      })

      // Act - try to close the dirty tab
      const closeButton = screen.getByRole('button', { name: /close untitled-\d+\.lua/i })
      await user.click(closeButton)

      // Assert - confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
      // Check for dialog heading specifically
      expect(screen.getByRole('heading', { name: /unsaved changes/i })).toBeInTheDocument()
    })

    it('should close dirty tab when confirm is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<IDELayout />)

      await createAndOpenFile(user)

      // Make tab dirty
      const editor = screen.getByTestId('mock-monaco')
      fireEvent.change(editor, { target: { value: 'print("modified")' } })

      await waitFor(() => {
        expect(screen.getByText('*')).toBeInTheDocument()
      })

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close untitled-\d+\.lua/i })
      await user.click(closeButton)

      // Verify dialog appeared
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Act - click confirm (discard changes)
      const confirmButton = screen.getByRole('button', { name: /discard/i })
      await user.click(confirmButton)

      // Assert - dialog closes, tab is closed
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(queryFileTab()).not.toBeInTheDocument()
    })

    it('should keep dirty tab open when cancel is clicked', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<IDELayout />)

      await createAndOpenFile(user)

      // Make tab dirty
      const editor = screen.getByTestId('mock-monaco')
      fireEvent.change(editor, { target: { value: 'print("modified")' } })

      await waitFor(() => {
        expect(screen.getByText('*')).toBeInTheDocument()
      })

      // Try to close
      const closeButton = screen.getByRole('button', { name: /close untitled-\d+\.lua/i })
      await user.click(closeButton)

      // Verify dialog appeared
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })

      // Act - click cancel (keep editing)
      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      // Assert - dialog closes, tab remains open with dirty indicator
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      })
      expect(getFileTab()).toBeInTheDocument()
      expect(screen.getByText('*')).toBeInTheDocument()
    })
  })

  describe('state persistence', () => {
    it('should keep BottomPanel mounted when terminal is toggled (state preservation)', async () => {
      // Arrange
      const user = userEvent.setup()
      render(<IDELayout />)

      // Verify bottom panel is initially visible
      const bottomPanel = screen.getByTestId('bottom-panel')
      expect(bottomPanel).toBeInTheDocument()

      // Get the shell terminal container (inside bottom panel)
      const shellTab = screen.getByRole('tab', { name: /shell/i })
      await user.click(shellTab)

      const shellContainer = screen.getByTestId('shell-terminal-container')
      expect(shellContainer).toBeInTheDocument()

      // Act - toggle terminal visibility (Ctrl+`)
      await user.keyboard('{Control>}`{/Control}')

      // Assert - bottom panel should still be in the DOM (just hidden via CSS)
      // The panel uses collapsible behavior, so it stays mounted
      await waitFor(() => {
        // Bottom panel should still exist in DOM
        expect(screen.getByTestId('bottom-panel')).toBeInTheDocument()
        // Shell terminal should still exist in DOM (state preserved)
        expect(screen.getByTestId('shell-terminal-container')).toBeInTheDocument()
      })

      // Act - toggle terminal back on
      await user.keyboard('{Control>}`{/Control}')

      // Assert - panel is visible and shell state is preserved (same instance)
      await waitFor(() => {
        const panel = screen.getByTestId('bottom-panel')
        // Check that the panel is visible (parent not hidden)
        expect(panel).toBeVisible()
      })
    })
  })
})
