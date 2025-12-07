# Phase 1: Embeddable Editor

**Status**: Draft
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

- [ ] Renders Monaco editor with Lua highlighting
- [ ] Optional "Run" button executes code
- [ ] Optional output panel shows results
- [ ] Reset button restores initial code
- [ ] Read-only mode for static examples
- [ ] Configurable height
- [ ] Works without any parent context/providers

### Non-Functional Requirements

- [ ] Lazy loads Monaco (doesn't block page render)
- [ ] Accessible (keyboard navigation, ARIA labels)
- [ ] Mobile responsive (stacks vertically on small screens)
- [ ] Consistent styling with site theme

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

- [ ] `src/components/EmbeddableEditor.tsx` - Main embeddable component
- [ ] `src/components/EmbeddableEditor.css` - Styles

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

## Implementation Plan

### Step 1: Create Base Component

1. [ ] Create `EmbeddableEditor.tsx` with props interface
2. [ ] Integrate `CodeEditor` component
3. [ ] Integrate `useLuaEngine` hook
4. [ ] Add basic layout structure

### Step 2: Add Toolbar

1. [ ] Create toolbar with Run button
2. [ ] Create Reset button (restores initial code)
3. [ ] Add conditional rendering based on props
4. [ ] Style toolbar to match site theme

### Step 3: Add Output Panel

1. [ ] Create output display area
2. [ ] Connect to Lua engine output
3. [ ] Add clear output on re-run
4. [ ] Style output panel (dark theme like terminal)

### Step 4: Polish & Accessibility

1. [ ] Add loading state while Monaco loads
2. [ ] Add ARIA labels and keyboard shortcuts
3. [ ] Test responsive layout
4. [ ] Add CSS module styles

## Testing Strategy

### Unit Tests

- [ ] Renders with minimal props (just `code`)
- [ ] Read-only mode prevents editing
- [ ] Run button executes code
- [ ] Reset button restores initial code
- [ ] Output panel displays execution results
- [ ] onChange callback fires on edit
- [ ] onRun callback fires with code and output
- [ ] Toolbar hidden when `showToolbar={false}`
- [ ] Output hidden when `showOutput={false}`

### Integration Tests

- [ ] Multiple EmbeddableEditors on same page work independently
- [ ] Lua engine cleanup works properly on unmount

### Manual Testing

- [ ] Works in tutorial page context
- [ ] Works in challenge page context
- [ ] Mobile layout (stacked panels)
- [ ] Keyboard navigation through controls

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Multiple editors = multiple Lua engines | Memory usage | Medium | Consider shared engine pool in future |
| Monaco not loading | Broken examples | Low | Show fallback textarea with warning |

## Dependencies

- Phase 0: Foundation (CodeEditor, useLuaEngine must exist)

## Success Metrics

- [ ] Component can be used with just `<EmbeddableEditor code="..." />`
- [ ] All props work as documented
- [ ] >80% mutation test coverage
- [ ] Works on mobile devices

---

## Approval

- [ ] Technical Review
- [ ] Code Review Plan
- [ ] Testing Plan Review
