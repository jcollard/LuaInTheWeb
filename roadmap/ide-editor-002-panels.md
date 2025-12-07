# Phase 2: Panel Layout System

**Status**: Draft
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Implement a VS Code-style resizable panel system that allows users to resize and reorganize the IDE layout. Panels should persist their sizes across sessions.

## Problem Statement

The current layout uses fixed CSS Grid (50/50 split). A real IDE experience requires:
- Resizable panels (drag to resize)
- Collapsible panels (hide explorer, maximize editor)
- Persistent layout (remembers user preferences)
- Nested splits (horizontal and vertical)

## Proposed Solution

Use a panel library (react-resizable-panels or allotment) to create a flexible layout system. Wrap it in custom components that handle persistence and provide a clean API.

## Requirements

### Functional Requirements

- [ ] Panels can be resized by dragging handles
- [ ] Panels can be collapsed/expanded
- [ ] Double-click handle resets to default size
- [ ] Layout persists to localStorage
- [ ] Supports horizontal and vertical splits
- [ ] Minimum panel sizes prevent unusable states

### Non-Functional Requirements

- [ ] Smooth resize performance (60fps)
- [ ] Accessible (keyboard resize support)
- [ ] Mobile: panels stack vertically, no drag resize
- [ ] Clean API for composing layouts

## Technical Design

### Library Evaluation

| Library | Size | Features | Maintenance |
|---------|------|----------|-------------|
| react-resizable-panels | 10KB | VS Code-like, persist, nested | Active, Vercel team |
| allotment | 15KB | VS Code-like, good a11y | Active |
| react-split-pane | 8KB | Basic, dated API | Less active |

**Recommendation**: `react-resizable-panels` - lightweight, well-maintained, built-in persistence

### Architecture

```tsx
<PanelGroup direction="horizontal" autoSaveId="ide-layout">
  <Panel defaultSize={20} minSize={10} collapsible>
    <Explorer />
  </Panel>

  <PanelResizeHandle />

  <Panel defaultSize={50} minSize={20}>
    <CodeEditor />
  </Panel>

  <PanelResizeHandle />

  <Panel defaultSize={30} minSize={15}>
    <PanelGroup direction="vertical" autoSaveId="ide-right">
      <Panel defaultSize={60}>
        <Terminal />
      </Panel>
      <PanelResizeHandle />
      <Panel defaultSize={40}>
        <Repl />
      </Panel>
    </PanelGroup>
  </Panel>
</PanelGroup>
```

### New Components

- [ ] `src/components/layout/IDEPanelGroup.tsx` - Wrapper with defaults
- [ ] `src/components/layout/IDEPanel.tsx` - Panel with collapse button
- [ ] `src/components/layout/IDEResizeHandle.tsx` - Styled resize handle
- [ ] `src/components/layout/layout.css` - Panel styles

### API Design

```typescript
// IDEPanelGroup - wrapper around PanelGroup
interface IDEPanelGroupProps {
  direction: 'horizontal' | 'vertical'
  persistId?: string  // localStorage key for persistence
  children: React.ReactNode
}

// IDEPanel - wrapper around Panel
interface IDEPanelProps {
  defaultSize?: number      // percentage
  minSize?: number          // percentage
  maxSize?: number          // percentage
  collapsible?: boolean
  header?: React.ReactNode  // optional header with title/collapse
  children: React.ReactNode
}

// IDEResizeHandle - styled handle
interface IDEResizeHandleProps {
  direction?: 'horizontal' | 'vertical'  // inferred from parent
}
```

### Styling

```css
/* Resize handle */
.ide-resize-handle {
  background: var(--border-color);
  transition: background 0.2s;
}

.ide-resize-handle:hover,
.ide-resize-handle[data-resize-handle-active] {
  background: var(--accent-color);
}

.ide-resize-handle[data-direction="horizontal"] {
  width: 4px;
  cursor: col-resize;
}

.ide-resize-handle[data-direction="vertical"] {
  height: 4px;
  cursor: row-resize;
}

/* Collapsed panel */
.ide-panel[data-collapsed="true"] {
  /* Show only header/icon */
}
```

## Implementation Plan

### Step 1: Install and Configure

1. [ ] Install `react-resizable-panels`
2. [ ] Create base wrapper components
3. [ ] Add CSS for handles and panels
4. [ ] Test basic resize functionality

### Step 2: Add Persistence

1. [ ] Configure `autoSaveId` for layout groups
2. [ ] Test layout persists across page refresh
3. [ ] Add reset layout button/function

### Step 3: Add Collapse Functionality

1. [ ] Implement collapsible panels
2. [ ] Add collapse/expand buttons to panel headers
3. [ ] Handle keyboard shortcuts (Ctrl+B for explorer)
4. [ ] Animate collapse/expand

### Step 4: Mobile Responsiveness

1. [ ] Detect mobile/tablet viewport
2. [ ] Switch to stacked layout on mobile
3. [ ] Hide resize handles on touch devices
4. [ ] Test touch interactions

### Step 5: Accessibility

1. [ ] Add keyboard resize (arrow keys when handle focused)
2. [ ] Add ARIA labels to handles
3. [ ] Test with screen reader
4. [ ] Document keyboard shortcuts

## Testing Strategy

### Unit Tests

- [ ] IDEPanelGroup renders children
- [ ] IDEPanel respects minSize/maxSize
- [ ] IDEResizeHandle has correct cursor
- [ ] Collapse button toggles panel
- [ ] Persistence saves to localStorage
- [ ] Reset restores default layout

### Integration Tests

- [ ] Nested panel groups work correctly
- [ ] Layout survives page refresh
- [ ] Mobile layout switches correctly

### Manual Testing

- [ ] Drag resize is smooth
- [ ] Double-click resets size
- [ ] Keyboard resize works
- [ ] Touch devices work properly

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Performance on resize | Poor UX | Low | Library handles this well |
| Complex nested state | Bugs | Medium | Keep nesting shallow (max 2 levels) |
| Mobile touch issues | Broken mobile | Medium | Test early, fallback to fixed layout |

## Dependencies

- Phase 0: Foundation (React Router must be in place)

## Packages to Add

```json
{
  "react-resizable-panels": "^2.x"
}
```

## Success Metrics

- [ ] Panels resize smoothly at 60fps
- [ ] Layout persists across sessions
- [ ] Keyboard accessible
- [ ] Works on mobile (stacked layout)

---

## Approval

- [ ] Technical Review
- [ ] Code Review Plan
- [ ] Testing Plan Review
