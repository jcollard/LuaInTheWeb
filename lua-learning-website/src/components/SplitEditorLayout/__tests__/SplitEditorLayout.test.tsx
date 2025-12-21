import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SplitEditorLayout } from '../SplitEditorLayout'
import type { SplitLayout, EditorGroupInfo } from '../types'
import type { TabInfo } from '../../TabBar/types'

// Mock IDEPanelGroup, IDEPanel, and IDEResizeHandle
vi.mock('../../IDEPanelGroup', () => ({
  IDEPanelGroup: ({
    children,
    direction,
    persistId,
  }: {
    children: React.ReactNode
    direction: string
    persistId?: string
  }) => (
    <div
      data-testid="ide-panel-group"
      data-direction={direction}
      data-persist-id={persistId}
    >
      {children}
    </div>
  ),
}))

vi.mock('../../IDEPanel', () => ({
  IDEPanel: ({
    children,
    defaultSize,
    minSize,
  }: {
    children: React.ReactNode
    defaultSize?: number
    minSize?: number
  }) => (
    <div
      data-testid="ide-panel"
      data-default-size={defaultSize}
      data-min-size={minSize}
    >
      {children}
    </div>
  ),
}))

vi.mock('../../IDEResizeHandle', () => ({
  IDEResizeHandle: () => <div data-testid="ide-resize-handle" />,
}))

// Mock EditorGroup
vi.mock('../../EditorGroup', () => ({
  EditorGroup: ({
    groupId,
    tabs,
    activeTab,
    isActive,
    onFocus,
    onTabSelect,
    onTabClose,
    children,
  }: {
    groupId: string
    tabs: TabInfo[]
    activeTab: string | null
    isActive: boolean
    onFocus: () => void
    onTabSelect: (path: string) => void
    onTabClose: (path: string) => void
    children?: React.ReactNode
  }) => (
    <div
      data-testid="editor-group"
      data-group-id={groupId}
      data-is-active={isActive}
      data-active-tab={activeTab}
      data-tab-count={tabs.length}
      onClick={onFocus}
    >
      {children}
      <button onClick={() => onTabSelect('/test.lua')}>Select Tab</button>
      <button onClick={() => onTabClose('/test.lua')}>Close Tab</button>
    </div>
  ),
}))

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

// Helper to create mock groups
function createMockGroup(
  id: string,
  tabs: TabInfo[] = [],
  activeTab: string | null = null
): EditorGroupInfo {
  return {
    id,
    tabs,
    activeTab,
  }
}

// Helper to create mock layout
function createMockLayout(
  groups: EditorGroupInfo[],
  activeGroupId: string,
  direction: 'horizontal' | 'vertical' = 'horizontal'
): SplitLayout {
  return {
    groups,
    activeGroupId,
    direction,
  }
}

describe('SplitEditorLayout', () => {
  const defaultProps = {
    layout: createMockLayout([createMockGroup('group-1')], 'group-1'),
    onSetActiveGroup: vi.fn(),
    onTabSelect: vi.fn(),
    onTabClose: vi.fn(),
    onTabReorder: vi.fn(),
    onTabPin: vi.fn(),
    onTabUnpin: vi.fn(),
    onCloseToRight: vi.fn(),
    onCloseOthers: vi.fn(),
    children: () => <div data-testid="group-content">Content</div>,
  }

  describe('single group rendering', () => {
    it('should render the layout container with editor-panel testid', () => {
      render(<SplitEditorLayout {...defaultProps} />)

      expect(screen.getByTestId('editor-panel')).toBeInTheDocument()
    })

    it('should render a single EditorGroup without panel wrapper', () => {
      render(<SplitEditorLayout {...defaultProps} />)

      expect(screen.getByTestId('editor-group')).toBeInTheDocument()
      expect(screen.queryByTestId('ide-panel-group')).not.toBeInTheDocument()
    })

    it('should pass correct props to single EditorGroup', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1', [createMockTab('/file.lua')], '/file.lua')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      const group = screen.getByTestId('editor-group')
      expect(group).toHaveAttribute('data-group-id', 'group-1')
      expect(group).toHaveAttribute('data-is-active', 'true')
      expect(group).toHaveAttribute('data-active-tab', '/file.lua')
      expect(group).toHaveAttribute('data-tab-count', '1')
    })

    it('should render children for the single group', () => {
      render(<SplitEditorLayout {...defaultProps} />)

      expect(screen.getByTestId('group-content')).toBeInTheDocument()
    })

    it('should call onSetActiveGroup when group is focused', async () => {
      const user = userEvent.setup()
      const onSetActiveGroup = vi.fn()

      render(
        <SplitEditorLayout {...defaultProps} onSetActiveGroup={onSetActiveGroup} />
      )

      await user.click(screen.getByTestId('editor-group'))

      expect(onSetActiveGroup).toHaveBeenCalledWith('group-1')
    })
  })

  describe('multiple groups rendering', () => {
    it('should render IDEPanelGroup when multiple groups exist', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getByTestId('ide-panel-group')).toBeInTheDocument()
    })

    it('should render correct number of EditorGroups', () => {
      const layout = createMockLayout(
        [
          createMockGroup('group-1'),
          createMockGroup('group-2'),
          createMockGroup('group-3'),
        ],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getAllByTestId('editor-group')).toHaveLength(3)
    })

    it('should render resize handles between groups', () => {
      const layout = createMockLayout(
        [
          createMockGroup('group-1'),
          createMockGroup('group-2'),
          createMockGroup('group-3'),
        ],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      // 3 groups = 2 resize handles
      expect(screen.getAllByTestId('ide-resize-handle')).toHaveLength(2)
    })

    it('should apply horizontal direction to panel group', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1',
        'horizontal'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getByTestId('ide-panel-group')).toHaveAttribute(
        'data-direction',
        'horizontal'
      )
    })

    it('should apply vertical direction to panel group', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1',
        'vertical'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getByTestId('ide-panel-group')).toHaveAttribute(
        'data-direction',
        'vertical'
      )
    })

    it('should set persistId on panel group', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getByTestId('ide-panel-group')).toHaveAttribute(
        'data-persist-id',
        'split-editor-layout'
      )
    })

    it('should render IDEPanel for each group', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getAllByTestId('ide-panel')).toHaveLength(2)
    })

    it('should set equal default sizes for panels', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      const panels = screen.getAllByTestId('ide-panel')
      panels.forEach((panel) => {
        expect(panel).toHaveAttribute('data-default-size', '50')
      })
    })

    it('should set min size on panels', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      const panels = screen.getAllByTestId('ide-panel')
      panels.forEach((panel) => {
        expect(panel).toHaveAttribute('data-min-size', '20')
      })
    })
  })

  describe('active group state', () => {
    it('should mark active group with isActive=true', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      const groups = screen.getAllByTestId('editor-group')
      expect(groups[0]).toHaveAttribute('data-is-active', 'true')
      expect(groups[1]).toHaveAttribute('data-is-active', 'false')
    })

    it('should update active state based on activeGroupId', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-2'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      const groups = screen.getAllByTestId('editor-group')
      expect(groups[0]).toHaveAttribute('data-is-active', 'false')
      expect(groups[1]).toHaveAttribute('data-is-active', 'true')
    })

    it('should call onSetActiveGroup with correct groupId when group is clicked', async () => {
      const user = userEvent.setup()
      const onSetActiveGroup = vi.fn()
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-1'
      )

      render(
        <SplitEditorLayout
          {...defaultProps}
          layout={layout}
          onSetActiveGroup={onSetActiveGroup}
        />
      )

      const groups = screen.getAllByTestId('editor-group')
      await user.click(groups[1])

      expect(onSetActiveGroup).toHaveBeenCalledWith('group-2')
    })
  })

  describe('tab operations', () => {
    it('should call onTabSelect when tab is selected in any group', async () => {
      const user = userEvent.setup()
      const onTabSelect = vi.fn()

      render(<SplitEditorLayout {...defaultProps} onTabSelect={onTabSelect} />)

      await user.click(screen.getByText('Select Tab'))

      expect(onTabSelect).toHaveBeenCalledWith('/test.lua')
    })

    it('should call onTabClose when tab is closed in any group', async () => {
      const user = userEvent.setup()
      const onTabClose = vi.fn()

      render(<SplitEditorLayout {...defaultProps} onTabClose={onTabClose} />)

      await user.click(screen.getByText('Close Tab'))

      expect(onTabClose).toHaveBeenCalledWith('/test.lua')
    })
  })

  describe('children render prop', () => {
    it('should call children function with group and isActive', () => {
      const childrenFn = vi.fn(() => <div data-testid="rendered-content" />)
      const layout = createMockLayout(
        [createMockGroup('group-1', [createMockTab('/file.lua')], '/file.lua')],
        'group-1'
      )

      render(
        <SplitEditorLayout {...defaultProps} layout={layout}>
          {childrenFn}
        </SplitEditorLayout>
      )

      expect(childrenFn).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'group-1',
          tabs: expect.any(Array),
          activeTab: '/file.lua',
        }),
        true
      )
    })

    it('should call children with isActive=false for non-active groups', () => {
      const childrenFn = vi.fn(() => <div />)
      const layout = createMockLayout(
        [createMockGroup('group-1'), createMockGroup('group-2')],
        'group-2'
      )

      render(
        <SplitEditorLayout {...defaultProps} layout={layout}>
          {childrenFn}
        </SplitEditorLayout>
      )

      // First call should be for group-1 with isActive=false
      expect(childrenFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'group-1' }),
        false
      )
      // Second call should be for group-2 with isActive=true
      expect(childrenFn).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'group-2' }),
        true
      )
    })

    it('should render content returned by children function', () => {
      const layout = createMockLayout([createMockGroup('group-1')], 'group-1')

      render(
        <SplitEditorLayout {...defaultProps} layout={layout}>
          {(group, isActive) => (
            <div data-testid="custom-content" data-active={isActive}>
              Content for {group.id}
            </div>
          )}
        </SplitEditorLayout>
      )

      expect(screen.getByTestId('custom-content')).toHaveTextContent(
        'Content for group-1'
      )
    })
  })

  describe('edge cases', () => {
    it('should handle empty groups array gracefully', () => {
      const layout = createMockLayout([], 'group-1')

      // Should not crash, just render empty container
      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getByTestId('split-editor-layout')).toBeInTheDocument()
    })

    it('should handle group with empty tabs', () => {
      const layout = createMockLayout(
        [createMockGroup('group-1', [], null)],
        'group-1'
      )

      render(<SplitEditorLayout {...defaultProps} layout={layout} />)

      expect(screen.getByTestId('editor-group')).toHaveAttribute(
        'data-tab-count',
        '0'
      )
    })
  })
})
