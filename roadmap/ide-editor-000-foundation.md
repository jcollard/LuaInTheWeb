# Phase 0: Foundation Refactoring

**Status**: Draft
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Refactor the existing codebase to establish a solid foundation for the IDE editor. This includes extracting business logic into custom hooks, adding React Router for proper routing, and replacing CodeMirror with Monaco Editor.

## Problem Statement

The current LuaPlayground component has tightly coupled business logic (~60 lines of Lua engine initialization inline). There's no routing library (just useState), and the editor (CodeMirror) doesn't match our goal of teaching VS Code workflows.

## Proposed Solution

1. Extract Lua engine logic into a `useLuaEngine` hook
2. Add React Router with proper route structure
3. Replace CodeMirror with Monaco Editor
4. Create a `CodeEditor` component wrapping Monaco

## Requirements

### Functional Requirements

- [ ] `useLuaEngine` hook provides: `{ engine, isReady, execute, reset }`
- [ ] React Router handles `/`, `/tutorials`, `/examples`, `/playground`, `/editor`
- [ ] Monaco Editor with Lua syntax highlighting
- [ ] VS Code keybindings work out of the box
- [ ] Existing Playground functionality unchanged

### Non-Functional Requirements

- [ ] Monaco lazy-loaded to avoid blocking initial page load
- [ ] Hook is fully testable in isolation
- [ ] TypeScript strict mode compliance

## Technical Design

### Architecture

```
Before:
  LuaPlayground (contains everything)
    └── CodeMirror (inline)
    └── Lua init (inline useEffect)
    └── BashTerminal

After:
  App
    └── BrowserRouter
        └── Routes
            └── LuaPlayground
                └── CodeEditor (Monaco wrapper)
                └── useLuaEngine() hook
                └── BashTerminal
```

### Components Affected

- [ ] `App.tsx` - Replace state-based routing with React Router
- [ ] `LuaPlayground.tsx` - Extract hook, replace CodeMirror with CodeEditor

### New Components

- [ ] `src/components/CodeEditor.tsx` - Monaco wrapper component
- [ ] `src/hooks/useLuaEngine.ts` - Lua engine initialization and execution

### API Changes

```typescript
// New Hook API
interface UseLuaEngineOptions {
  onOutput?: (text: string) => void
  onError?: (error: string) => void
  onReadInput?: () => Promise<string>
}

interface UseLuaEngineReturn {
  isReady: boolean
  execute: (code: string) => Promise<void>
  reset: () => Promise<void>
}

function useLuaEngine(options: UseLuaEngineOptions): UseLuaEngineReturn

// New CodeEditor Props
interface CodeEditorProps {
  value: string
  onChange: (value: string) => void
  language?: string  // default: 'lua'
  height?: string    // default: '400px'
  readOnly?: boolean
  onRun?: () => void // Ctrl+Enter handler
}
```

### Data Model Changes

No data model changes - this is a refactoring phase.

## Implementation Plan

### Step 1: Add React Router

1. [ ] Install `react-router-dom`
2. [ ] Create route structure in `App.tsx`
3. [ ] Update navigation links to use `<Link>`
4. [ ] Verify all existing navigation works

### Step 2: Create useLuaEngine Hook

1. [ ] Create `src/hooks/useLuaEngine.ts`
2. [ ] Move Lua initialization logic from LuaPlayground
3. [ ] Move print/io.read/io.write overrides
4. [ ] Add proper cleanup on unmount
5. [ ] Write tests for the hook

### Step 3: Setup Monaco Editor

1. [ ] Install `@monaco-editor/react`
2. [ ] Create `src/components/CodeEditor.tsx`
3. [ ] Register Lua language (basic tokenizer)
4. [ ] Configure VS Code keybindings
5. [ ] Add Ctrl+Enter to run code

### Step 4: Integrate into LuaPlayground

1. [ ] Replace CodeMirror with CodeEditor
2. [ ] Replace inline Lua logic with useLuaEngine hook
3. [ ] Remove old CodeMirror dependencies
4. [ ] Verify all functionality works

## Testing Strategy

### Unit Tests

- [ ] `useLuaEngine` - initializes engine correctly
- [ ] `useLuaEngine` - execute runs Lua code
- [ ] `useLuaEngine` - captures print output
- [ ] `useLuaEngine` - handles io.read
- [ ] `useLuaEngine` - reset clears state
- [ ] `useLuaEngine` - cleanup on unmount
- [ ] `CodeEditor` - renders Monaco
- [ ] `CodeEditor` - calls onChange
- [ ] `CodeEditor` - Ctrl+Enter triggers onRun

### Integration Tests

- [ ] LuaPlayground works with new CodeEditor
- [ ] Navigation between routes works
- [ ] Code execution produces correct output

### Manual Testing

- [ ] VS Code shortcuts work (Ctrl+D, Alt+Up, Ctrl+/, etc.)
- [ ] Lua syntax highlighting displays correctly
- [ ] Mobile layout still responsive

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Monaco bundle size slows load | Medium | High | Lazy load Monaco, show loading state |
| Lua tokenizer is basic | Low | High | Acceptable for learning; can enhance later |
| Breaking existing functionality | High | Medium | Comprehensive tests before refactor |

## Dependencies

- None (this is the foundation phase)

## Packages to Add

```json
{
  "react-router-dom": "^7.x",
  "@monaco-editor/react": "^4.x"
}
```

## Packages to Remove

```json
{
  "@uiw/react-codemirror": "remove",
  "@codemirror/language": "remove",
  "@codemirror/legacy-modes": "remove"
}
```

## Success Metrics

- [ ] All existing tests pass
- [ ] New hook has >80% mutation test coverage
- [ ] VS Code shortcuts work correctly
- [ ] Page load time < 3 seconds (with lazy loading)

---

## Approval

- [ ] Technical Review
- [ ] Code Review Plan
- [ ] Testing Plan Review
