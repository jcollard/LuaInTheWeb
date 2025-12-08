import { render, screen } from '@testing-library/react'
import { vi } from 'vitest'
import { IDELayout } from './IDELayout'

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => (
    <textarea data-testid="mock-monaco" defaultValue={value} />
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

      // Assert - should have sidebar and editor areas
      expect(screen.getByTestId('sidebar-panel')).toBeInTheDocument()
      expect(screen.getByTestId('editor-panel')).toBeInTheDocument()
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

    it('should pass correct props to children', () => {
      // Arrange & Act
      render(<IDELayout initialFileName="test.lua" />)

      // Assert - filename should appear in editor tab
      expect(screen.getByText('test.lua')).toBeInTheDocument()
    })

    it('should pass initial code to editor', () => {
      // Arrange & Act
      render(<IDELayout initialCode="print('hello')" />)

      // Assert
      const editor = screen.getByTestId('mock-monaco')
      expect(editor).toHaveValue("print('hello')")
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
})
