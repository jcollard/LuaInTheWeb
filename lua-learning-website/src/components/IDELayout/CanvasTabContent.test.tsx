/**
 * Tests for CanvasTabContent component.
 * Renders the canvas game panel with a simple tab bar for switching between tabs.
 */
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasTabContent } from './CanvasTabContent'
import type { TabInfo } from '../TabBar'

// Mock the CanvasGamePanel component
vi.mock('../CanvasGamePanel', () => ({
  CanvasGamePanel: vi.fn(({ isActive }: { isActive?: boolean }) => (
    <div data-testid="canvas-game-panel" data-is-active={isActive}>
      Mock Canvas
    </div>
  )),
}))

// Mock the useCanvasScaling hook
vi.mock('../../hooks/useCanvasScaling', () => ({
  useCanvasScaling: vi.fn(() => ({
    scalingMode: 'fit',
    setScalingMode: vi.fn(),
  })),
}))

const createMockTabs = (): TabInfo[] => [
  { path: 'canvas://canvas-1', name: 'Canvas 1', isDirty: false, type: 'canvas', isPreview: false, isPinned: false },
  { path: 'canvas://canvas-2', name: 'Canvas 2', isDirty: false, type: 'canvas', isPreview: false, isPinned: false },
]

describe('CanvasTabContent', () => {
  describe('rendering', () => {
    it('renders canvas tabs', () => {
      const tabs = createMockTabs()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
          onExit={vi.fn()}
        />
      )

      expect(screen.getByText('Canvas 1')).toBeInTheDocument()
      expect(screen.getByText('Canvas 2')).toBeInTheDocument()
    })

    it('renders CanvasGamePanel', () => {
      const tabs = createMockTabs()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
          onExit={vi.fn()}
        />
      )

      expect(screen.getByTestId('canvas-game-panel')).toBeInTheDocument()
    })
  })

  describe('tab interactions', () => {
    it('calls onSelectTab when a tab is clicked', () => {
      const tabs = createMockTabs()
      const onSelectTab = vi.fn()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={onSelectTab}
          onCloseTab={vi.fn()}
          onExit={vi.fn()}
        />
      )

      fireEvent.click(screen.getByText('Canvas 2'))
      expect(onSelectTab).toHaveBeenCalledWith('canvas://canvas-2')
    })

    it('calls onCloseTab when close button is clicked', () => {
      const tabs = createMockTabs()
      const onCloseTab = vi.fn()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={vi.fn()}
          onCloseTab={onCloseTab}
          onExit={vi.fn()}
        />
      )

      // Find the close button for Canvas 1
      const closeButtons = screen.getAllByText('×')
      fireEvent.click(closeButtons[0])
      expect(onCloseTab).toHaveBeenCalledWith('canvas://canvas-1')
    })
  })

  describe('isActive prop passthrough', () => {
    it('passes isActive=true to CanvasGamePanel when activeTab is a canvas tab', () => {
      const tabs = createMockTabs()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
          onExit={vi.fn()}
          isActive
        />
      )

      const panel = screen.getByTestId('canvas-game-panel')
      expect(panel).toHaveAttribute('data-is-active', 'true')
    })

    it('passes isActive=false to CanvasGamePanel when isActive prop is false', () => {
      const tabs = createMockTabs()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
          onExit={vi.fn()}
          isActive={false}
        />
      )

      const panel = screen.getByTestId('canvas-game-panel')
      expect(panel).toHaveAttribute('data-is-active', 'false')
    })

    it('defaults isActive to undefined when not provided', () => {
      const tabs = createMockTabs()
      render(
        <CanvasTabContent
          tabs={tabs}
          activeTab="canvas://canvas-1"
          canvasCode="print('hello')"
          onSelectTab={vi.fn()}
          onCloseTab={vi.fn()}
          onExit={vi.fn()}
        />
      )

      const panel = screen.getByTestId('canvas-game-panel')
      // When isActive is undefined, data-is-active should not have a value set
      expect(panel.getAttribute('data-is-active')).toBe(null)
    })
  })
})
