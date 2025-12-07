# Phase 3: IDE Shell & /editor Route

**Status**: Draft
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

- [ ] `/editor` route loads IDE layout
- [ ] Activity bar on left (icons for Explorer, Search, etc.)
- [ ] Explorer panel (placeholder until Phase 4)
- [ ] Editor panel with tabs (single file for now)
- [ ] Terminal panel with BashTerminal
- [ ] REPL panel with LuaRepl
- [ ] Status bar showing line/column, language
- [ ] Run button in toolbar executes code in terminal

### Non-Functional Requirements

- [ ] Full viewport height (100vh - header)
- [ ] Shared Lua engine between editor and terminal
- [ ] Keyboard shortcuts (Ctrl+` for terminal, Ctrl+Enter for run)
- [ ] Responsive: hides activity bar on mobile

## Technical Design

### Architecture

```tsx
<Route path="/editor" element={<IDELayout />} />

<IDELayout>
  ├── <IDEContextProvider>  // Shared state
  │   ├── <div className="ide-container">
  │   │   ├── <ActivityBar />           // Left icon bar
  │   │   ├── <IDEPanelGroup>           // Main content
  │   │   │   ├── <SidebarPanel />      // Explorer (placeholder)
  │   │   │   ├── <EditorPanel />       // Code editor with tabs
  │   │   │   └── <BottomPanelGroup />  // Terminal + REPL
  │   │   └── <StatusBar />             // Bottom status
  │   └── </div>
  └── </IDEContextProvider>
</IDELayout>
```

### New Components

- [ ] `src/components/ide/IDELayout.tsx` - Main shell component
- [ ] `src/components/ide/IDEContext.tsx` - Shared state context
- [ ] `src/components/ide/ActivityBar.tsx` - Left icon sidebar
- [ ] `src/components/ide/StatusBar.tsx` - Bottom status bar
- [ ] `src/components/ide/EditorPanel.tsx` - Editor with toolbar
- [ ] `src/components/ide/BottomPanel.tsx` - Terminal/REPL container
- [ ] `src/components/ide/SidebarPanel.tsx` - Placeholder for Explorer
- [ ] `src/components/ide/ide.css` - IDE-specific styles

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

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Header (existing site header)                       │
├────┬────────────────────────────────────────────────┤
│    │                                                 │
│ A  │  Explorer  │        Editor Panel               │
│ c  │  (Phase 4) │        ┌─────────────────────┐    │
│ t  │            │        │ untitled.lua    [x] │    │
│ i  │  Files     │        ├─────────────────────┤    │
│ v  │  └─ ...    │        │                     │    │
│ i  │            │        │  (Monaco Editor)    │    │
│ t  │            │        │                     │    │
│ y  │            │        │                     │    │
│    │            │        └─────────────────────┘    │
│ B  ├────────────┴────────────────────────────────────┤
│ a  │  Terminal          │  REPL                      │
│ r  │  > output here     │  > interactive lua         │
│    │                    │                            │
├────┴─────────────────────────────────────────────────┤
│  Status: Ln 1, Col 1  │  Lua  │  UTF-8  │  Spaces: 2 │
└─────────────────────────────────────────────────────┘
```

### Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Enter` | Run code |
| `Ctrl+`` ` | Toggle terminal |
| `Ctrl+B` | Toggle sidebar |
| `Ctrl+S` | Save (future) |
| `Ctrl+Shift+P` | Command palette (future) |

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

## Implementation Plan

### Step 1: Create IDE Context

1. [ ] Create `IDEContext.tsx` with shared state
2. [ ] Integrate `useLuaEngine` hook
3. [ ] Add code state management
4. [ ] Add UI state (terminal visibility, active panel)

### Step 2: Create Shell Components

1. [ ] Create `IDELayout.tsx` basic structure
2. [ ] Create `ActivityBar.tsx` with icons
3. [ ] Create `StatusBar.tsx` with editor info
4. [ ] Add to `/editor` route

### Step 3: Create Editor Panel

1. [ ] Create `EditorPanel.tsx` with toolbar
2. [ ] Add tab bar (single tab for now)
3. [ ] Integrate `CodeEditor` component
4. [ ] Wire up run button

### Step 4: Create Bottom Panel

1. [ ] Create `BottomPanel.tsx` with tabs
2. [ ] Integrate `BashTerminal`
3. [ ] Integrate `LuaRepl`
4. [ ] Add panel switching (Terminal/REPL tabs)

### Step 5: Wire Everything Together

1. [ ] Connect editor to terminal output
2. [ ] Implement keyboard shortcuts
3. [ ] Add toggle terminal functionality
4. [ ] Test full flow

### Step 6: Polish

1. [ ] Style to match VS Code dark theme
2. [ ] Add loading states
3. [ ] Handle errors gracefully
4. [ ] Test responsive layout

## Testing Strategy

### Unit Tests

- [ ] IDEContext provides correct values
- [ ] ActivityBar renders icons
- [ ] StatusBar shows line/column
- [ ] EditorPanel calls runCode
- [ ] BottomPanel switches between Terminal/REPL
- [ ] Keyboard shortcuts trigger actions

### Integration Tests

- [ ] Full IDE flow: type code → run → see output
- [ ] Terminal receives print output
- [ ] REPL executes independently
- [ ] Layout resize persists

### Manual Testing

- [ ] `/editor` loads correctly
- [ ] All keyboard shortcuts work
- [ ] Mobile layout usable
- [ ] No memory leaks on navigation

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Complex state management | Bugs | Medium | Keep context focused, test thoroughly |
| Keyboard conflicts | Poor UX | Medium | Document shortcuts, allow customization later |
| Performance with multiple components | Slow | Low | Lazy load panels, memoize |

## Dependencies

- Phase 0: Foundation (CodeEditor, useLuaEngine, React Router)
- Phase 1: Embeddable Editor (CodeEditor patterns)
- Phase 2: Panel Layout System (IDEPanelGroup, IDEPanel)

## Success Metrics

- [ ] `/editor` loads in < 3 seconds
- [ ] All panels resize correctly
- [ ] Keyboard shortcuts work
- [ ] Code runs and output displays
- [ ] Works on tablet (landscape)

---

## Approval

- [ ] Technical Review
- [ ] Code Review Plan
- [ ] Testing Plan Review
