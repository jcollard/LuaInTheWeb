# Phase 1: Embeddable Editor

**Status**: Completed
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Create an `EmbeddableEditor` component that can be used throughout the site for code examples, tutorials, and coding challenges. It wraps the CodeEditor with optional output display, run button, and reset functionality.

## Problem Statement

The full IDE experience is too heavy for inline code examples. We need a lightweight, self-contained editor component that can be dropped into any page with minimal configuration.

## Proposed Solution

Create `EmbeddableEditor` - a composition of `CodeEditor` + optional output panel that:
- Works standalone without the IDE shell
- Has sensible defaults for common use cases
- Supports read-only mode for examples
- Supports interactive mode for challenges

## Requirements

### Functional Requirements

- [x] Renders Monaco editor with Lua highlighting
- [x] Optional "Run" button executes code
- [x] Optional output panel shows results
- [x] Reset button restores initial code
- [x] Read-only mode for static examples
- [x] Configurable height
- [x] Works without any parent context/providers

### Non-Functional Requirements

- [x] Lazy loads Monaco (doesn't block page render)
- [x] Accessible (keyboard navigation, ARIA labels)
- [x] Mobile responsive (stacks vertically on small screens)
- [x] Consistent styling with site theme

## Technical Design

### Architecture

```
<EmbeddableEditor>
  ├── <div className="embeddable-editor">
  │   ├── <div className="editor-toolbar"> (optional)
  │   │   ├── <button>Run</button>
  │   │   └── <button>Reset</button>
  │   ├── <CodeEditor />
  │   └── <div className="output-panel"> (optional)
  │       └── <BashTerminal /> or <pre>
  └── </div>
</EmbeddableEditor>
```

### New Components

Following the [CodeEditor](../lua-learning-website/src/components/CodeEditor/) folder pattern:

```
src/components/EmbeddableEditor/
├── EmbeddableEditor.tsx        # Pure UI component (no business logic)
├── EmbeddableEditor.module.css # Scoped styles
├── EmbeddableEditor.test.tsx   # Component tests
├── useEmbeddableEditor.ts      # Hook with business logic
├── useEmbeddableEditor.test.ts # Hook tests
├── types.ts                    # Component-specific types
└── index.ts                    # Barrel exports
```

- [x] `EmbeddableEditor/types.ts` - Props interface and types
- [x] `EmbeddableEditor/useEmbeddableEditor.ts` - Business logic hook
- [x] `EmbeddableEditor/EmbeddableEditor.tsx` - Pure UI component
- [x] `EmbeddableEditor/EmbeddableEditor.module.css` - Scoped styles
- [x] `EmbeddableEditor/index.ts` - Barrel exports

### API Design

```typescript
interface EmbeddableEditorProps {
  /** Initial code to display */
  code: string

  /** Language for syntax highlighting (default: 'lua') */
  language?: string

  /** Height of the editor (default: '200px') */
  height?: string

  /** Show run button and allow execution (default: true) */
  runnable?: boolean

  /** Show output panel (default: true when runnable) */
  showOutput?: boolean

  /** Make editor read-only (default: false) */
  readOnly?: boolean

  /** Show reset button (default: true when not readOnly) */
  showReset?: boolean

  /** Show toolbar (default: true when runnable) */
  showToolbar?: boolean

  /** Output panel height (default: '150px') */
  outputHeight?: string

  /** Callback when code changes */
  onChange?: (code: string) => void

  /** Callback when code is executed */
  onRun?: (code: string, output: string) => void

  /** Custom className for styling */
  className?: string
}
```

### Usage Examples

```tsx
// Simple read-only example
<EmbeddableEditor
  code={`print("Hello, World!")`}
  readOnly
  runnable={false}
/>

// Interactive challenge
<EmbeddableEditor
  code={`-- Write a function that returns the sum of two numbers
function add(a, b)
  -- your code here
end

print(add(2, 3))  -- should print 5`}
  height="300px"
  onRun={(code, output) => {
    if (output.includes("5")) {
      showSuccess("Correct!")
    }
  }}
/>

// Minimal inline example
<EmbeddableEditor
  code={`local x = 10`}
  height="50px"
  showToolbar={false}
  showOutput={false}
/>
```

### Hook Design: useEmbeddableEditor

The UI component must be pure. All business logic lives in this hook:

```typescript
interface UseEmbeddableEditorOptions {
  initialCode: string
  onRun?: (code: string, output: string) => void
  onChange?: (code: string) => void
}

interface UseEmbeddableEditorReturn {
  // State
  code: string
  output: string[]
  isRunning: boolean
  error: string | null

  // Actions
  setCode: (code: string) => void
  run: () => Promise<void>
  reset: () => void
  clearOutput: () => void
}

function useEmbeddableEditor(options: UseEmbeddableEditorOptions): UseEmbeddableEditorReturn
```

The hook:
- Manages code state (current code, initial code for reset)
- Manages output state (output lines, error messages)
- Manages execution state (isRunning flag)
- Wraps `useLuaEngine` for Lua execution
- Provides `run()` to execute code and capture output
- Provides `reset()` to restore initial code
- Calls `onChange`/`onRun` callbacks as appropriate

## Implementation Plan

**TDD Workflow**: Each step follows Red-Green-Refactor. Write failing tests FIRST, then implement minimum code to pass.

### Step 1: Create Types and Hook Foundation

1. [x] **TEST**: Write tests for `useEmbeddableEditor` hook interface (returns code, output, isRunning, error)
2. [x] **IMPLEMENT**: Create `types.ts` with `EmbeddableEditorProps` interface
3. [x] **IMPLEMENT**: Create `useEmbeddableEditor.ts` skeleton that satisfies tests
4. [x] **REFACTOR**: Ensure clean separation of concerns

### Step 2: Implement Hook Logic

1. [x] **TEST**: Write tests for `setCode()` - updates code state, calls onChange
2. [x] **IMPLEMENT**: Add code state management
3. [x] **TEST**: Write tests for `reset()` - restores initial code
4. [x] **IMPLEMENT**: Add reset functionality
5. [x] **TEST**: Write tests for `run()` - executes Lua, captures output, calls onRun
6. [x] **IMPLEMENT**: Integrate `useLuaEngine` for execution
7. [x] **REFACTOR**: Clean up hook implementation

### Step 3: Create Pure UI Component

1. [x] **TEST**: Write tests for rendering with minimal props
2. [x] **IMPLEMENT**: Create `EmbeddableEditor.tsx` - pure component using hook
3. [x] **TEST**: Write tests for toolbar visibility based on props
4. [x] **IMPLEMENT**: Add toolbar with Run/Reset buttons (wiring only, no logic)
5. [x] **TEST**: Write tests for output panel visibility
6. [x] **IMPLEMENT**: Add output panel display
7. [x] **IMPLEMENT**: Create `EmbeddableEditor.module.css` styles
8. [x] **IMPLEMENT**: Create `index.ts` barrel exports

### Step 4: Polish & Accessibility

1. [x] **TEST**: Write tests for loading state behavior
2. [x] **IMPLEMENT**: Add loading state while Monaco loads
3. [x] **IMPLEMENT**: Add ARIA labels and keyboard shortcuts
4. [x] **MANUAL TEST**: Verify responsive layout on mobile
5. [x] **REFACTOR**: Final cleanup and code review

## Testing Strategy

### Unit Tests - Hook (`useEmbeddableEditor`)

- [x] Returns initial code from options
- [x] `setCode()` updates code state
- [x] `setCode()` calls onChange callback
- [x] `reset()` restores initial code
- [x] `run()` sets isRunning to true during execution
- [x] `run()` captures Lua output
- [x] `run()` calls onRun callback with code and output
- [x] `clearOutput()` clears output array

### Unit Tests - Component (`EmbeddableEditor`)

- [x] Renders with minimal props (just `code`)
- [x] Read-only mode prevents editing
- [x] Run button executes code
- [x] Reset button restores initial code
- [x] Output panel displays execution results
- [x] onChange callback fires on edit
- [x] onRun callback fires with code and output
- [x] Toolbar hidden when `showToolbar={false}`
- [x] Output hidden when `showOutput={false}`

### Edge Cases (REQUIRED)

- [x] Empty code string renders without error
- [x] Code with only whitespace executes successfully
- [x] Lua syntax error displays error message (not crash)
- [x] Lua runtime error (e.g., nil access) displays error message
- [ ] Very long code (1000+ lines) doesn't freeze UI (deferred - performance optimization)
- [x] Code with no print output shows empty output panel
- [ ] Rapid run button clicks don't cause race conditions (deferred - UX enhancement)
- [ ] Reset while running cancels execution gracefully (deferred - UX enhancement)
- [x] Monaco fails to load - shows fallback or error state

### Integration Tests

- [x] Multiple EmbeddableEditors on same page work independently
- [x] Lua engine cleanup works properly on unmount
- [x] Component works without any parent context/providers

### Manual Testing

- [ ] Works in tutorial page context
- [ ] Works in challenge page context
- [x] Mobile layout (stacked panels)
- [x] Keyboard navigation through controls

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Multiple editors = multiple Lua engines | Memory usage | Medium | Consider shared engine pool in future |
| Monaco not loading | Broken examples | Low | Show fallback textarea with warning |

## Dependencies

- Phase 0: Foundation (CodeEditor, useLuaEngine must exist)

## Success Metrics

- [x] Component can be used with just `<EmbeddableEditor code="..." />`
- [x] All props work as documented
- [x] >80% mutation test coverage (achieved: 80.60%)
- [x] Works on mobile devices

---

## Approval

- [ ] Technical Review
- [ ] Code Review Plan
- [ ] Testing Plan Review
