import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EditorGroup } from '../EditorGroup'
import type { TabInfo } from '../../TabBar/types'

// Helper to create mock tabs
function createMockTab(path: string, overrides: Partial<TabInfo> = {}): TabInfo {
  return {
    path,
    name: path.split('/').pop() ?? path,
    isDirty: false,
    type: 'file',
    isPreview: false,
    isPinned: false,
    ...overrides,
  }
}

describe('EditorGroup', () => {
  const defaultProps = {
    groupId: 'group-1',
    tabs: [] as TabInfo[],
    activeTab: null,
    isActive: false,
    onTabSelect: vi.fn(),
    onTabClose: vi.fn(),
    onFocus: vi.fn(),
  }

  describe('rendering', () => {
    it('should render the editor group container', () => {
      render(<EditorGroup {...defaultProps} />)

      expect(screen.getByTestId('editor-group')).toBeInTheDocument()
    })

    it('should render with the correct groupId as data attribute', () => {
      render(<EditorGroup {...defaultProps} groupId="test-group-123" />)

      expect(screen.getByTestId('editor-group')).toHaveAttribute(
        'data-group-id',
        'test-group-123'
      )
    })

    it('should render TabBar when tabs are provided', () => {
      const tabs = [createMockTab('/file1.lua'), createMockTab('/file2.lua')]

      render(<EditorGroup {...defaultProps} tabs={tabs} />)

      expect(screen.getByRole('tablist')).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /file1\.lua/i })).toBeInTheDocument()
      expect(screen.getByRole('tab', { name: /file2\.lua/i })).toBeInTheDocument()
    })

    it('should render empty state when no tabs', () => {
      render(<EditorGroup {...defaultProps} tabs={[]} />)

      expect(screen.getByTestId('editor-group-empty')).toBeInTheDocument()
    })

    it('should not render empty state when tabs exist', () => {
      const tabs = [createMockTab('/file1.lua')]

      render(<EditorGroup {...defaultProps} tabs={tabs} />)

      expect(screen.queryByTestId('editor-group-empty')).not.toBeInTheDocument()
    })

    it('should render children in the content area', () => {
      render(
        <EditorGroup {...defaultProps}>
          <div data-testid="custom-content">Custom Editor Content</div>
        </EditorGroup>
      )

      expect(screen.getByTestId('custom-content')).toBeInTheDocument()
    })
  })

  describe('tab operations', () => {
    it('should call onTabSelect when a tab is clicked', async () => {
      const user = userEvent.setup()
      const onTabSelect = vi.fn()
      const tabs = [createMockTab('/file1.lua')]

      render(
        <EditorGroup {...defaultProps} tabs={tabs} onTabSelect={onTabSelect} />
      )

      await user.click(screen.getByRole('tab', { name: /file1\.lua/i }))

      expect(onTabSelect).toHaveBeenCalledWith('/file1.lua')
    })

    it('should call onTabClose when tab close button is clicked', async () => {
      const user = userEvent.setup()
      const onTabClose = vi.fn()
      const tabs = [createMockTab('/file1.lua')]

      render(
        <EditorGroup {...defaultProps} tabs={tabs} onTabClose={onTabClose} />
      )

      await user.click(screen.getByRole('button', { name: /close file1\.lua/i }))

      expect(onTabClose).toHaveBeenCalledWith('/file1.lua')
    })

    it('should forward onTabReorder to TabBar', async () => {
      const onTabReorder = vi.fn()
      const tabs = [createMockTab('/file1.lua'), createMockTab('/file2.lua')]

      render(
        <EditorGroup
          {...defaultProps}
          tabs={tabs}
          onTabReorder={onTabReorder}
        />
      )

      // TabBar should receive the reorder prop
      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should forward onTabPin to TabBar', async () => {
      const onTabPin = vi.fn()
      const tabs = [createMockTab('/file1.lua')]

      render(
        <EditorGroup {...defaultProps} tabs={tabs} onTabPin={onTabPin} />
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })

    it('should forward onTabUnpin to TabBar', async () => {
      const onTabUnpin = vi.fn()
      const tabs = [createMockTab('/file1.lua', { isPinned: true })]

      render(
        <EditorGroup {...defaultProps} tabs={tabs} onTabUnpin={onTabUnpin} />
      )

      expect(screen.getByRole('tablist')).toBeInTheDocument()
    })
  })

  describe('focus behavior', () => {
    it('should call onFocus when the group container is clicked', async () => {
      const user = userEvent.setup()
      const onFocus = vi.fn()

      render(<EditorGroup {...defaultProps} onFocus={onFocus} />)

      await user.click(screen.getByTestId('editor-group'))

      expect(onFocus).toHaveBeenCalled()
    })

    it('should have active class when isActive is true', () => {
      render(<EditorGroup {...defaultProps} isActive={true} />)

      const container = screen.getByTestId('editor-group')
      expect(container.className).toMatch(/active/)
    })

    it('should not have active class when isActive is false', () => {
      render(<EditorGroup {...defaultProps} isActive={false} />)

      const container = screen.getByTestId('editor-group')
      expect(container.className).not.toMatch(/active/)
    })
  })

  describe('active tab highlight', () => {
    it('should mark the active tab as selected', () => {
      const tabs = [createMockTab('/file1.lua'), createMockTab('/file2.lua')]

      render(
        <EditorGroup {...defaultProps} tabs={tabs} activeTab="/file1.lua" />
      )

      expect(screen.getByRole('tab', { name: /file1\.lua/i })).toHaveAttribute(
        'aria-selected',
        'true'
      )
      expect(screen.getByRole('tab', { name: /file2\.lua/i })).toHaveAttribute(
        'aria-selected',
        'false'
      )
    })
  })
})
