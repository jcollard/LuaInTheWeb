# Phase 2: Panel Layout System

**Status**: ✅ Completed
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Completed**: Sun, Dec 7, 2025
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

Use `react-resizable-panels` library to create a flexible layout system. Wrap it in custom components that handle persistence and provide a clean API. Each component follows the project's folder structure with pure UI components and logic extracted into hooks.

## Requirements

### Functional Requirements

- [x] Panels can be resized by dragging handles
- [x] Panels can be collapsed/expanded
- [x] Double-click handle resets to default size
- [x] Layout persists to localStorage
- [x] Supports horizontal and vertical splits
- [x] Minimum panel sizes prevent unusable states

### Non-Functional Requirements

- [x] Smooth resize performance (60fps)
- [x] Accessible (keyboard resize support)
- [x] Mobile: panels stack vertically, no drag resize
- [x] Clean API for composing layouts

## Technical Design

### Library Choice

**`react-resizable-panels`** - lightweight (10KB), well-maintained by Vercel team, built-in persistence

### Component Architecture

```tsx
<IDEPanelGroup direction="horizontal" persistId="ide-layout">
  <IDEPanel defaultSize={20} minSize={10} collapsible>
    <Explorer />
  </IDEPanel>

  <IDEResizeHandle />

  <IDEPanel defaultSize={50} minSize={20}>
    <CodeEditor />
  </IDEPanel>

  <IDEResizeHandle />

  <IDEPanel defaultSize={30} minSize={15}>
    <IDEPanelGroup direction="vertical" persistId="ide-right">
      <IDEPanel defaultSize={60}>
        <Terminal />
      </IDEPanel>
      <IDEResizeHandle />
      <IDEPanel defaultSize={40}>
        <Repl />
      </IDEPanel>
    </IDEPanelGroup>
  </IDEPanel>
</IDEPanelGroup>
```

## New Components

### IDEPanelGroup

```
src/components/IDEPanelGroup/
├── IDEPanelGroup.tsx           # Pure UI - renders PanelGroup with styling
├── IDEPanelGroup.module.css    # Scoped styles
├── IDEPanelGroup.test.tsx      # Component tests
├── types.ts                    # IDEPanelGroupProps interface
└── index.ts                    # Barrel exports
```

### IDEPanel

```
src/components/IDEPanel/
├── IDEPanel.tsx                # Pure UI - renders Panel with header
├── IDEPanel.module.css         # Scoped styles
├── IDEPanel.test.tsx           # Component tests
├── useIDEPanel.ts              # Hook for collapse state management
├── useIDEPanel.test.ts         # Hook tests
├── types.ts                    # IDEPanelProps interface
└── index.ts                    # Barrel exports
```

### IDEResizeHandle

```
src/components/IDEResizeHandle/
├── IDEResizeHandle.tsx         # Pure UI - styled resize handle
├── IDEResizeHandle.module.css  # Scoped styles
├── IDEResizeHandle.test.tsx    # Component tests
├── types.ts                    # IDEResizeHandleProps interface
└── index.ts                    # Barrel exports
```

## API Design

```typescript
// types.ts - IDEPanelGroup
export interface IDEPanelGroupProps {
  direction: 'horizontal' | 'vertical'
  persistId?: string  // localStorage key for persistence
  children: React.ReactNode
  className?: string
}

// types.ts - IDEPanel
export interface IDEPanelProps {
  defaultSize?: number      // percentage (0-100)
  minSize?: number          // percentage
  maxSize?: number          // percentage
  collapsible?: boolean
  collapsed?: boolean       // controlled mode
  onCollapse?: (collapsed: boolean) => void
  header?: React.ReactNode  // optional header with title
  children: React.ReactNode
  className?: string
}

// types.ts - IDEResizeHandle
export interface IDEResizeHandleProps {
  className?: string
}
```

## Edge Cases to Handle

- [x] **Corrupted localStorage**: Gracefully fallback to defaults if persisted layout is invalid
- [x] **Rapid resize**: Debounce persistence saves to avoid localStorage spam
- [x] **Zero-size panels**: Prevent panels from being resized to 0%
- [x] **Missing children**: Handle empty panel groups gracefully
- [x] **SSR/hydration**: Ensure no hydration mismatch with localStorage
- [x] **Nested collapse**: When parent collapses, nested panels handle correctly

## Implementation Plan

### Step 1: Install Library and Create IDEPanelGroup

**Tests First:**
1. [x] **TEST**: IDEPanelGroup renders children correctly
2. [x] **TEST**: IDEPanelGroup applies direction prop (horizontal/vertical)
3. [x] **TEST**: IDEPanelGroup persists layout when persistId provided
4. [x] **TEST**: IDEPanelGroup handles corrupted localStorage gracefully

**Implementation:**
5. [x] Install `react-resizable-panels`
6. [x] Create IDEPanelGroup folder structure
7. [x] Implement IDEPanelGroup.tsx as pure wrapper
8. [x] Add IDEPanelGroup.module.css styles
9. [x] Create types.ts and index.ts

**Verification:**
10. [x] All tests pass
11. [x] Lint passes

### Step 2: Create IDEResizeHandle

**Tests First:**
1. [x] **TEST**: IDEResizeHandle renders with correct cursor style
2. [x] **TEST**: IDEResizeHandle shows hover state
3. [x] **TEST**: IDEResizeHandle shows active state when dragging
4. [x] **TEST**: IDEResizeHandle is keyboard focusable

**Implementation:**
5. [x] Create IDEResizeHandle folder structure
6. [x] Implement IDEResizeHandle.tsx
7. [x] Add IDEResizeHandle.module.css with hover/active states
8. [x] Create types.ts and index.ts

**Verification:**
9. [x] All tests pass
10. [x] Lint passes

### Step 3: Create IDEPanel with Collapse

**Tests First:**
1. [x] **TEST**: IDEPanel renders children
2. [x] **TEST**: IDEPanel respects minSize constraint
3. [x] **TEST**: IDEPanel respects maxSize constraint
4. [x] **TEST**: IDEPanel header renders when provided
5. [x] **TEST**: useIDEPanel hook toggles collapsed state
6. [x] **TEST**: useIDEPanel hook calls onCollapse callback
7. [x] **TEST**: Collapsed panel shows only header

**Implementation:**
8. [x] Create IDEPanel folder structure
9. [x] Implement useIDEPanel hook for collapse logic
10. [x] Implement IDEPanel.tsx as pure component
11. [x] Add IDEPanel.module.css with collapsed styles
12. [x] Create types.ts and index.ts

**Verification:**
13. [x] All tests pass
14. [x] Lint passes

### Step 4: Add Persistence Hook

**Tests First:**
1. [x] **TEST**: usePanelPersistence saves layout to localStorage
2. [x] **TEST**: usePanelPersistence debounces saves (100ms)
3. [x] **TEST**: usePanelPersistence loads saved layout on mount
4. [x] **TEST**: usePanelPersistence returns defaults for corrupted data
5. [x] **TEST**: usePanelPersistence reset() clears saved layout

**Implementation:**
6. [x] Create usePanelPersistence hook in IDEPanelGroup folder
7. [x] Implement debounced save logic
8. [x] Add error handling for invalid localStorage data
9. [x] Integrate with IDEPanelGroup

**Verification:**
10. [x] All tests pass
11. [x] Layout persists across page refresh

### Step 5: Mobile Responsiveness

**Tests First:**
1. [x] **TEST**: useIsMobile hook detects mobile viewport
2. [x] **TEST**: IDEPanelGroup renders stacked on mobile
3. [x] **TEST**: IDEResizeHandle hidden on mobile

**Implementation:**
4. [x] Create useIsMobile hook (or reuse existing)
5. [x] Update IDEPanelGroup to switch direction on mobile
6. [x] Hide resize handles on touch devices
7. [x] Add responsive CSS

**Verification:**
8. [x] All tests pass
9. [x] Manual test on mobile viewport

### Step 6: Accessibility

**Tests First:**
1. [x] **TEST**: Resize handle has aria-label
2. [x] **TEST**: Resize handle is keyboard navigable
3. [x] **TEST**: Arrow keys resize panel when handle focused

**Implementation:**
4. [x] Add ARIA labels to handles
5. [x] Implement keyboard resize (arrow keys)
6. [x] Test with screen reader

**Verification:**
7. [x] All tests pass
8. [x] Keyboard navigation works

## E2E Testing

### Test Page

- **Route**: `/test/panel-layout`
- **Location**: `src/pages/test/PanelLayoutTest.tsx`

```tsx
// src/pages/test/PanelLayoutTest.tsx
export function PanelLayoutTest() {
  return (
    <div style={{ height: '100vh' }}>
      <h1>Panel Layout Test Page</h1>
      <IDEPanelGroup direction="horizontal" persistId="test-layout">
        <IDEPanel defaultSize={30} minSize={10} collapsible header="Left Panel">
          <div>Left Content</div>
        </IDEPanel>
        <IDEResizeHandle />
        <IDEPanel defaultSize={70} minSize={20}>
          <div>Right Content</div>
        </IDEPanel>
      </IDEPanelGroup>
    </div>
  )
}
```

### E2E Test Cases

Location: `e2e/panel-layout.spec.ts`

- [x] **E2E**: Panels render with correct initial sizes
- [x] **E2E**: Dragging resize handle changes panel sizes
- [x] **E2E**: Double-click handle resets to default size
- [x] **E2E**: Layout persists after page refresh
- [x] **E2E**: Collapse button hides panel content
- [x] **E2E**: Keyboard arrow keys resize when handle focused

## Testing Strategy

### Unit Tests (per component)

| Component | Tests |
|-----------|-------|
| IDEPanelGroup | renders, direction, persistence, corrupted data |
| IDEPanel | renders, minSize, maxSize, header, collapse |
| IDEResizeHandle | cursor, hover, active, keyboard focus |
| useIDEPanel | toggle, callback, controlled mode |
| usePanelPersistence | save, load, debounce, reset, error handling |

### Integration Tests

- [x] Nested panel groups work correctly
- [x] Layout survives page refresh
- [x] Mobile layout switches correctly

## Packages to Add

```json
{
  "react-resizable-panels": "^2.x"
}
```

## Success Metrics

- [x] All unit tests pass (167 tests)
- [x] All E2E tests pass (7 tests)
- [x] Panels resize smoothly at 60fps
- [x] Layout persists across sessions
- [x] Keyboard accessible
- [x] Works on mobile (stacked layout)

## Completion Notes

### Test Coverage

| Component | Mutation Score | Notes |
|-----------|---------------|-------|
| IDEPanelGroup.tsx | 100% | Fully tested |
| IDEPanel.tsx | 85% (100% covered) | NoCoverage for library callbacks |
| useIDEPanel.ts | 80.65% | Dependency array mutations (false positives) |
| IDEResizeHandle.tsx | 80% | Dependency array mutations (false positives) |
| usePanelPersistence.ts | 66.67% | Cleanup/dependency array mutations |
| useIsMobile.ts | 50% | SSR check untestable in jsdom |

### Files Created

```
src/components/IDEPanelGroup/
├── IDEPanelGroup.tsx
├── IDEPanelGroup.module.css
├── IDEPanelGroup.test.tsx
├── usePanelPersistence.ts
├── usePanelPersistence.test.ts
├── types.ts
└── index.ts

src/components/IDEPanel/
├── IDEPanel.tsx
├── IDEPanel.module.css
├── IDEPanel.test.tsx
├── useIDEPanel.ts
├── useIDEPanel.test.ts
├── types.ts
└── index.ts

src/components/IDEResizeHandle/
├── IDEResizeHandle.tsx
├── IDEResizeHandle.module.css
├── IDEResizeHandle.test.tsx
├── types.ts
└── index.ts

src/hooks/
├── useIsMobile.ts
└── useIsMobile.test.ts

src/pages/test/
└── PanelLayoutTest.tsx

e2e/
└── panel-layout.spec.ts
```

## Dependencies

- Phase 1.5: E2E Testing Foundation (completed)

---

## Approval

- [x] Technical Review
- [x] TDD Compliance Review
- [x] Component Structure Review
