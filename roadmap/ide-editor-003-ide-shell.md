# Phase 3: IDE Shell & /editor Route

**Status**: Implemented
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Create the main IDE shell component that composes Explorer, Editor, Terminal, and REPL panels into a cohesive VS Code-like experience at the `/editor` route.

## Problem Statement

We have individual components (CodeEditor, BashTerminal, LuaRepl) and a panel system, but no unified IDE experience. We need a shell that:
- Combines all components in a familiar layout
- Manages shared state (current file, Lua engine)
- Provides IDE chrome (status bar, activity bar)
- Lives at a dedicated `/editor` route

## Proposed Solution

Create `IDELayout` component that:
1. Uses the panel system from Phase 2
2. Manages shared Lua engine context
3. Provides VS Code-like chrome (activity bar, status bar)
4. Coordinates between editor, terminal, and REPL

## Requirements

### Functional Requirements

- [x] `/editor` route loads IDE layout
- [x] Activity bar on left (icons for Explorer, Search, etc.)
- [x] Explorer panel (placeholder until Phase 4)
- [x] Editor panel with tabs (single file for now)
- [x] Terminal panel with BashTerminal
- [x] REPL panel with LuaRepl
- [x] Status bar showing line/column, language
- [x] Run button in toolbar executes code in terminal
- [x] io.read() support with interactive terminal input

### Non-Functional Requirements

- [x] Full viewport height (100vh - header)
- [x] Shared Lua engine between editor and terminal
- [x] Keyboard shortcuts (Ctrl+` for terminal, Ctrl+Enter for run, Ctrl+B for sidebar)
- [x] Responsive: hides activity bar on mobile

## Technical Design

### Architecture

```tsx
<Route path="/editor" element={<IDELayout />} />

<IDELayout>
  |- <IDEContextProvider>  // Shared state
  |   |- <div className="ide-container">
  |   |   |- <ActivityBar />           // Left icon bar
  |   |   |- <IDEPanelGroup>           // Main content
  |   |   |   |- <SidebarPanel />      // Explorer (placeholder)
  |   |   |   |- <EditorPanel />       // Code editor with tabs
  |   |   |   +- <BottomPanelGroup />  // Terminal + REPL
  |   |   +- <StatusBar />             // Bottom status
  |   +- </div>
  +- </IDEContextProvider>
</IDELayout>
```

### Layout Structure

```
+-----------------------------------------------------+
|  Header (existing site header)                       |
+----+------------------------------------------------+
|    |                                                 |
| A  |  Explorer  |        Editor Panel               |
| c  |  (Phase 4) |        +---------------------+    |
| t  |            |        | untitled.lua    [x] |    |
| i  |  Files     |        +---------------------+    |
| v  |  +- ...    |        |                     |    |
| i  |            |        |  (Monaco Editor)    |    |
| t  |            |        |                     |    |
| y  |            |        |                     |    |
|    |            |        +---------------------+    |
| B  +------------+--------------------------------------+
| a  |  Terminal          |  REPL                      |
| r  |  > output here     |  > interactive lua         |
|    |                    |                            |
+----+-----------------------------------------------------+
|  Status: Ln 1, Col 1  |  Lua  |  UTF-8  |  Spaces: 2 |
+-----------------------------------------------------+
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run code |
| `Ctrl+`` ` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+S` | Save (future) |

### State Management

```typescript
// IDEContext provides shared state
interface IDEContextValue {
  // Lua engine (shared)
  engine: UseLuaEngineReturn

  // Current editor state
  code: string
  setCode: (code: string) => void
  fileName: string
  isDirty: boolean

  // UI state
  activePanel: 'explorer' | 'search' | 'extensions'
  terminalVisible: boolean
  toggleTerminal: () => void

  // Actions
  runCode: () => Promise<void>
  clearTerminal: () => void
}

const IDEContext = createContext<IDEContextValue | null>(null)
const useIDE = () => useContext(IDEContext)
```

### API Design

```typescript
// IDELayout is the main component
interface IDELayoutProps {
  initialCode?: string
  initialFileName?: string
}

// ActivityBar icons
interface ActivityBarProps {
  activeItem: 'explorer' | 'search' | 'extensions'
  onItemClick: (item: string) => void
}

// StatusBar shows editor state
interface StatusBarProps {
  line: number
  column: number
  language: string
  encoding: string
  indentation: string
}
```

## New Components

### IDELayout

```
src/components/IDELayout/
|- IDELayout.tsx           # Pure UI - main shell component
|- IDELayout.module.css    # Scoped styles
|- IDELayout.test.tsx      # Component tests
|- types.ts                # IDELayoutProps interface
+- index.ts                # Barrel exports
```

### IDEContext

```
src/components/IDEContext/
|- IDEContext.tsx          # Context provider component
|- IDEContext.test.tsx     # Context tests
|- useIDE.ts               # Hook to consume context
|- useIDE.test.ts          # Hook tests
|- types.ts                # IDEContextValue interface
+- index.ts                # Barrel exports
```

### ActivityBar

```
src/components/ActivityBar/
|- ActivityBar.tsx         # Pure UI - icon sidebar
|- ActivityBar.module.css  # Scoped styles
|- ActivityBar.test.tsx    # Component tests
|- types.ts                # ActivityBarProps interface
+- index.ts                # Barrel exports
```

### StatusBar

```
src/components/StatusBar/
|- StatusBar.tsx           # Pure UI - bottom status bar
|- StatusBar.module.css    # Scoped styles
|- StatusBar.test.tsx      # Component tests
|- types.ts                # StatusBarProps interface
+- index.ts                # Barrel exports
```

### EditorPanel

```
src/components/EditorPanel/
|- EditorPanel.tsx         # Pure UI - editor with toolbar/tabs
|- EditorPanel.module.css  # Scoped styles
|- EditorPanel.test.tsx    # Component tests
|- useEditorPanel.ts       # Hook for toolbar actions
|- useEditorPanel.test.ts  # Hook tests
|- types.ts                # EditorPanelProps interface
+- index.ts                # Barrel exports
```

### BottomPanel

```
src/components/BottomPanel/
|- BottomPanel.tsx         # Pure UI - Terminal/REPL container
|- BottomPanel.module.css  # Scoped styles
|- BottomPanel.test.tsx    # Component tests
|- useBottomPanel.ts       # Hook for tab switching
|- useBottomPanel.test.ts  # Hook tests
|- types.ts                # BottomPanelProps interface
+- index.ts                # Barrel exports
```

### SidebarPanel

```
src/components/SidebarPanel/
|- SidebarPanel.tsx        # Pure UI - placeholder for Explorer
|- SidebarPanel.module.css # Scoped styles
|- SidebarPanel.test.tsx   # Component tests
|- types.ts                # SidebarPanelProps interface
+- index.ts                # Barrel exports
```

## Edge Cases to Handle

- [ ] **Empty code**: Handle running empty code gracefully
- [ ] **Lua engine errors**: Display runtime errors in terminal
- [ ] **Long output**: Terminal should scroll to show latest output
- [ ] **Rapid execution**: Debounce run button to prevent spam
- [ ] **Context unmounting**: Clean up Lua engine on route change
- [ ] **SSR/hydration**: Ensure no hydration mismatch with editor state
- [ ] **Mobile keyboard**: Virtual keyboard doesn't overlap editor
- [ ] **Monaco loading**: Show loading state while Monaco initializes
- [ ] **Focus management**: Tab key works correctly in editor vs UI

## Implementation Plan

### Step 1: Create IDEContext Provider

**Tests First:**
1. [ ] **TEST**: IDEContextProvider renders children
2. [ ] **TEST**: useIDE hook returns context value
3. [ ] **TEST**: useIDE throws error when used outside provider
4. [ ] **TEST**: Context provides Lua engine from useLuaEngine
5. [ ] **TEST**: Context provides code state (code, setCode)
6. [ ] **TEST**: runCode executes code in Lua engine
7. [ ] **TEST**: runCode appends output to terminal history
8. [ ] **TEST**: clearTerminal resets terminal output

**Implementation:**
9. [ ] Create IDEContext folder structure
10. [ ] Implement types.ts with IDEContextValue interface
11. [ ] Implement IDEContext.tsx provider component
12. [ ] Implement useIDE.ts hook
13. [ ] Create index.ts barrel exports

**Verification:**
14. [ ] All tests pass
15. [ ] Lint passes

### Step 2: Create StatusBar Component

**Tests First:**
1. [ ] **TEST**: StatusBar renders line and column numbers
2. [ ] **TEST**: StatusBar renders language name
3. [ ] **TEST**: StatusBar renders encoding
4. [ ] **TEST**: StatusBar renders indentation info
5. [ ] **TEST**: StatusBar has correct accessibility labels

**Implementation:**
6. [ ] Create StatusBar folder structure
7. [ ] Implement types.ts with StatusBarProps interface
8. [ ] Implement StatusBar.tsx as pure component
9. [ ] Add StatusBar.module.css with VS Code-like styling
10. [ ] Create index.ts barrel exports

**Verification:**
11. [ ] All tests pass
12. [ ] Lint passes

### Step 3: Create ActivityBar Component

**Tests First:**
1. [ ] **TEST**: ActivityBar renders icon buttons
2. [ ] **TEST**: ActivityBar highlights active item
3. [ ] **TEST**: ActivityBar calls onItemClick when icon clicked
4. [ ] **TEST**: ActivityBar icons have aria-labels
5. [ ] **TEST**: ActivityBar is keyboard navigable

**Implementation:**
6. [ ] Create ActivityBar folder structure
7. [ ] Implement types.ts with ActivityBarProps interface
8. [ ] Implement ActivityBar.tsx as pure component
9. [ ] Add ActivityBar.module.css with VS Code-like styling
10. [ ] Create index.ts barrel exports

**Verification:**
11. [ ] All tests pass
12. [ ] Lint passes

### Step 4: Create SidebarPanel Component (Placeholder)

**Tests First:**
1. [ ] **TEST**: SidebarPanel renders placeholder content
2. [ ] **TEST**: SidebarPanel shows "Explorer coming soon" message
3. [ ] **TEST**: SidebarPanel accepts className prop

**Implementation:**
4. [ ] Create SidebarPanel folder structure
5. [ ] Implement types.ts with SidebarPanelProps interface
6. [ ] Implement SidebarPanel.tsx as placeholder
7. [ ] Add SidebarPanel.module.css
8. [ ] Create index.ts barrel exports

**Verification:**
9. [ ] All tests pass
10. [ ] Lint passes

### Step 5: Create EditorPanel Component

**Tests First:**
1. [ ] **TEST**: EditorPanel renders CodeEditor
2. [ ] **TEST**: EditorPanel renders tab with filename
3. [ ] **TEST**: EditorPanel shows dirty indicator (*) when isDirty
4. [ ] **TEST**: EditorPanel renders run button in toolbar
5. [ ] **TEST**: EditorPanel run button calls onRun callback
6. [ ] **TEST**: useEditorPanel hook tracks cursor position
7. [ ] **TEST**: useEditorPanel hook provides runCode action

**Implementation:**
8. [ ] Create EditorPanel folder structure
9. [ ] Implement types.ts with EditorPanelProps interface
10. [ ] Implement useEditorPanel.ts hook for toolbar logic
11. [ ] Implement EditorPanel.tsx as pure component
12. [ ] Add EditorPanel.module.css with tab/toolbar styles
13. [ ] Create index.ts barrel exports

**Verification:**
14. [ ] All tests pass
15. [ ] Lint passes

### Step 6: Create BottomPanel Component

**Tests First:**
1. [ ] **TEST**: BottomPanel renders tab bar with Terminal/REPL tabs
2. [ ] **TEST**: BottomPanel shows Terminal content by default
3. [ ] **TEST**: BottomPanel switches to REPL when tab clicked
4. [ ] **TEST**: useBottomPanel hook manages active tab state
5. [ ] **TEST**: BottomPanel renders BashTerminal in Terminal tab
6. [ ] **TEST**: BottomPanel renders LuaRepl in REPL tab

**Implementation:**
7. [ ] Create BottomPanel folder structure
8. [ ] Implement types.ts with BottomPanelProps interface
9. [ ] Implement useBottomPanel.ts hook for tab switching
10. [ ] Implement BottomPanel.tsx as pure component
11. [ ] Add BottomPanel.module.css with tab bar styles
12. [ ] Create index.ts barrel exports

**Verification:**
13. [ ] All tests pass
14. [ ] Lint passes

### Step 7: Create IDELayout Shell

**Tests First:**
1. [ ] **TEST**: IDELayout renders IDEContextProvider
2. [ ] **TEST**: IDELayout renders ActivityBar
3. [ ] **TEST**: IDELayout renders main panel group
4. [ ] **TEST**: IDELayout renders StatusBar
5. [ ] **TEST**: IDELayout uses correct panel layout (horizontal then vertical)
6. [ ] **TEST**: IDELayout passes correct props to children

**Implementation:**
7. [ ] Create IDELayout folder structure
8. [ ] Implement types.ts with IDELayoutProps interface
9. [ ] Implement IDELayout.tsx composing all components
10. [ ] Add IDELayout.module.css with IDE container styles
11. [ ] Create index.ts barrel exports

**Verification:**
12. [ ] All tests pass
13. [ ] Lint passes

### Step 8: Add /editor Route

**Tests First:**
1. [ ] **TEST**: /editor route renders IDELayout
2. [ ] **TEST**: Navigation to /editor loads IDE
3. [ ] **TEST**: /editor route passes URL params to IDELayout (if any)

**Implementation:**
4. [ ] Update App.tsx with /editor route
5. [ ] Add navigation link in site header (optional)
6. [ ] Ensure route is lazy-loaded for performance

**Verification:**
7. [ ] All tests pass
8. [ ] Lint passes
9. [ ] /editor loads in browser

### Step 9: Implement Keyboard Shortcuts

**Tests First:**
1. [ ] **TEST**: useKeyboardShortcuts hook registers shortcuts
2. [ ] **TEST**: Ctrl+Enter triggers runCode
3. [ ] **TEST**: Ctrl+` toggles terminal visibility
4. [ ] **TEST**: Ctrl+B toggles sidebar visibility
5. [ ] **TEST**: Shortcuts only fire when not typing in editor

**Implementation:**
6. [ ] Create useKeyboardShortcuts hook
7. [ ] Integrate with IDEContext for actions
8. [ ] Add to IDELayout
9. [ ] Document shortcuts in UI (tooltip or help)

**Verification:**
10. [ ] All tests pass
11. [ ] Keyboard shortcuts work in browser

### Step 10: Wire Run Code Flow

**Tests First:**
1. [ ] **TEST**: Clicking run button executes code from editor
2. [ ] **TEST**: Code output appears in terminal
3. [ ] **TEST**: Errors are displayed in terminal with red styling
4. [ ] **TEST**: Run button is disabled while code is executing

**Implementation:**
5. [ ] Connect EditorPanel run button to IDEContext.runCode
6. [ ] Format output for terminal display
7. [ ] Add error formatting with colors
8. [ ] Add loading state to run button

**Verification:**
9. [ ] All tests pass
10. [ ] Full flow works: type code -> run -> see output

### Step 11: Responsive Layout

**Tests First:**
1. [ ] **TEST**: Activity bar hidden on mobile viewport
2. [ ] **TEST**: Panels stack vertically on mobile
3. [ ] **TEST**: StatusBar remains visible on mobile

**Implementation:**
4. [ ] Add responsive CSS media queries
5. [ ] Use useIsMobile hook from Phase 2
6. [ ] Adjust panel group direction on mobile

**Verification:**
7. [ ] All tests pass
8. [ ] Manual test on mobile viewport

## E2E Testing

### Test Page

- **Route**: `/editor` (main feature route - no separate test page needed)
- **E2E tests validate the actual feature**

### E2E Test Cases

Location: `e2e/ide-editor.spec.ts`

- [ ] **E2E**: /editor route loads IDE layout
- [ ] **E2E**: Activity bar displays icons
- [ ] **E2E**: Clicking activity bar icon changes sidebar content
- [ ] **E2E**: Editor panel shows Monaco editor
- [ ] **E2E**: Typing in editor updates code
- [ ] **E2E**: Run button executes code and shows output in terminal
- [ ] **E2E**: Terminal displays print() output correctly
- [ ] **E2E**: REPL tab shows LuaRepl component
- [ ] **E2E**: Status bar shows line/column numbers
- [ ] **E2E**: Panel resize handles work correctly
- [ ] **E2E**: Keyboard shortcut Ctrl+Enter runs code
- [ ] **E2E**: Layout persists across page refresh

## Testing Strategy

### Unit Tests (per component)

| Component | Tests |
|-----------|-------|
| IDEContext | provider renders, useIDE returns value, throws outside provider, runCode works |
| StatusBar | renders all sections, correct accessibility |
| ActivityBar | renders icons, highlights active, click handler, keyboard nav |
| SidebarPanel | renders placeholder |
| EditorPanel | renders editor, tab, dirty indicator, run button, cursor tracking |
| BottomPanel | renders tabs, switches content, Terminal/REPL integration |
| IDELayout | composes all components, correct structure |
| useKeyboardShortcuts | registers shortcuts, triggers actions |

### Integration Tests

- [ ] Full IDE flow: type code -> run -> see output
- [ ] Terminal receives print output from Lua engine
- [ ] REPL executes independently of editor
- [ ] Layout resize persists (from Phase 2)
- [ ] Context cleanup on unmount

### Manual Testing Checklist

- [ ] `/editor` loads without errors
- [ ] All panels are visible and sized correctly
- [ ] Resize handles work smoothly
- [ ] Keyboard shortcuts respond correctly
- [ ] Mobile layout is usable
- [ ] No memory leaks on repeated navigation

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complex state management | Bugs | Medium | Keep context focused, test thoroughly |
| Keyboard conflicts | Poor UX | Medium | Document shortcuts, allow customization later |
| Performance with multiple components | Slow | Low | Lazy load panels, memoize |
| Monaco editor integration issues | Blocked | Low | Already proven in CodeEditor component |

## Dependencies

- Phase 0: Foundation (CodeEditor, useLuaEngine, React Router)
- Phase 1: Embeddable Editor (CodeEditor patterns)
- Phase 2: Panel Layout System (IDEPanelGroup, IDEPanel, IDEResizeHandle)

## Success Metrics

- [ ] `/editor` loads in < 3 seconds
- [ ] All panels resize correctly
- [ ] Keyboard shortcuts work
- [ ] Code runs and output displays
- [ ] All unit tests pass
- [ ] All E2E tests pass
- [ ] Mutation score > 80%
- [ ] Works on tablet (landscape)

---

## Approval

- [x] Technical Review
- [x] TDD Compliance Review
- [x] Component Structure Review
