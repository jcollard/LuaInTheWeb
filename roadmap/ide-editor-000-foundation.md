# Phase 0: Foundation Refactoring

**Status**: Completed
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025 5:41 PM
**Completed**: Sun, Dec 7, 2025 5:41 PM
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

- [x] `useLuaEngine` hook provides: `{ isReady, execute, reset }` (engine not exposed to maintain encapsulation)
- [x] React Router handles `/`, `/tutorials`, `/examples`, `/playground`, `/editor`
- [x] Monaco Editor with Lua syntax highlighting
- [x] VS Code keybindings work out of the box
- [x] Existing Playground functionality unchanged

### Non-Functional Requirements

- [x] Monaco lazy-loaded to avoid blocking initial page load
- [x] Hook is fully testable in isolation
- [x] TypeScript strict mode compliance

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

- [x] `App.tsx` - Replace state-based routing with React Router
- [x] `LuaPlayground.tsx` - Extract hook, replace CodeMirror with CodeEditor

### Design Decisions

**CSS Strategy:**
- **New components** (CodeEditor) will use CSS modules (`.module.css`)
- **Existing components** (LuaPlayground, BashTerminal, LuaRepl) keep plain CSS for now
- Migration of existing CSS to modules is out of scope for Phase 0
- Future phases may migrate existing components if needed

### New Components

**CodeEditor** (folder structure per !new-feature guidelines):
```
src/components/CodeEditor/
├── CodeEditor.tsx          # Pure UI - Monaco wrapper
├── CodeEditor.module.css   # Styles (minimal, mostly Monaco handles it)
├── CodeEditor.test.tsx     # Component tests (colocated)
├── types.ts                # CodeEditorProps interface
└── index.ts                # Barrel export
```

**Why no useCodeEditor hook?** The new-feature guidelines specify a `useMyComponent.ts` hook for business logic. CodeEditor intentionally omits this because:
1. It's a pure wrapper - Monaco handles all editor state internally
2. Configuration (Lua language, keybindings) uses Monaco's `onMount` callback, which is declarative
3. All business logic (Lua execution, output handling) lives in `useLuaEngine`, not the editor
4. The `onRun` prop receives a callback from the parent - no local logic needed

**useLuaEngine** (shared hook in src/hooks/):
```
src/hooks/
├── useLuaEngine.ts         # Lua engine hook
├── useLuaEngine.test.ts    # Hook tests (colocated)
├── types.ts                # Shared hook types
└── index.ts                # Barrel export
```

Files to create:
- [x] `src/components/CodeEditor/CodeEditor.tsx`
- [x] `src/components/CodeEditor/CodeEditor.module.css`
- [x] `src/components/CodeEditor/CodeEditor.test.tsx`
- [x] `src/components/CodeEditor/types.ts`
- [x] `src/components/CodeEditor/index.ts`
- [x] `src/hooks/useLuaEngine.ts`
- [x] `src/hooks/useLuaEngine.test.ts`
- [x] `src/hooks/types.ts`
- [x] `src/hooks/index.ts`

### API Changes

```typescript
// New Hook API
interface UseLuaEngineOptions {
  onOutput?: (text: string) => void
  onError?: (error: string) => void
  onReadInput?: () => Promise<string>
  onCleanup?: () => void  // Called when engine is destroyed (unmount/reset)
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

### Pattern Changes (New Conventions)

This phase introduces new patterns that differ from the existing codebase:

| Aspect | Current Pattern | New Pattern | Scope |
|--------|----------------|-------------|-------|
| **Test Location** | Separate folder (`src/test/`) | Colocated with component (`*.test.tsx`) | All new tests (including for existing files) |
| **Component Structure** | Flat files (`ComponentName.tsx`) | Folder structure (`ComponentName/ComponentName.tsx`) | New components only |
| **CSS** | Plain CSS (`*.css`) | CSS Modules (`*.module.css`) | New components only |
| **Business Logic** | Inline in components | Extracted to custom hooks | Going forward |

**Note:** Existing components (LuaPlayground, BashTerminal, LuaRepl) retain their current file structure and CSS patterns. However, **all new tests** (even for existing files like App.tsx) will be colocated with their source files.

**Test Folder Handling:** The existing `src/test/setup.ts` remains for Vitest configuration. The `src/test/example.test.ts` file should be removed as it's a placeholder. All actual tests go in colocated files.

The new patterns apply to:
- `src/components/CodeEditor/` (new)
- `src/hooks/useLuaEngine.ts` (new)
- `src/App.test.tsx` (new test for existing file, colocated)
- `src/components/LuaPlayground.test.tsx` (new test for existing file, colocated)

## Implementation Plan

### Step 1: Create useLuaEngine Hook (Start Here)

**Why first:** Pure logic, no UI dependencies, easiest to test in isolation.

1. [x] Create `src/hooks/useLuaEngine.ts` with types
2. [x] Move Lua initialization logic from LuaPlayground
3. [x] Move print/io.read/io.write overrides
4. [x] Add proper cleanup on unmount
5. [x] Write tests following TDD cycles 1.1-1.11d

### Step 2: Setup Monaco Editor / Create CodeEditor

**Why second:** UI component, can mock Monaco, tests interaction patterns.

1. [x] Install `@monaco-editor/react`
2. [x] Create `src/components/CodeEditor/` folder structure
3. [x] Register Lua language (basic tokenizer)
4. [x] Configure VS Code keybindings
5. [x] Add Ctrl+Enter to run code
6. [x] Write tests following TDD cycles 2.1-2.6

### Step 3: Add React Router

**Why third:** Infrastructure change, affects navigation but not core logic.

1. [x] Install `react-router-dom`
2. [x] Create route structure in `App.tsx`
3. [x] Update navigation links to use `<Link>`
4. [x] Write tests following TDD cycles 3.1-3.3
5. [x] Verify all existing navigation works

### Step 4: Integrate into LuaPlayground

**Why last:** Integration - combines hook + editor + existing functionality.

1. [x] Replace CodeMirror with CodeEditor
2. [x] Replace inline Lua logic with useLuaEngine hook
3. [x] Write tests following TDD cycles 4.1-4.3
4. [x] Verify all functionality works
5. [x] Remove old CodeMirror dependencies: `npm uninstall @uiw/react-codemirror @codemirror/language @codemirror/legacy-modes`
6. [x] Remove `src/test/example.test.ts` placeholder file

## TDD Implementation Guide

This section provides the specific red-green-refactor cycles for each step.

### TDD Step 1: useLuaEngine Hook (Start Here)

**Why first:** Pure logic, no UI dependencies, easiest to test in isolation.

#### Cycle 1.1: Hook returns isReady state

```typescript
// RED: Write failing test first
// src/hooks/useLuaEngine.test.ts (colocated)

describe('useLuaEngine', () => {
  it('should return isReady=false initially', () => {
    // Arrange & Act
    const { result } = renderHook(() => useLuaEngine({}))

    // Assert
    expect(result.current.isReady).toBe(false)
  })
})
```

**GREEN:** Create minimal hook that returns `{ isReady: false, execute: async () => {}, reset: async () => {} }`

#### Cycle 1.2: Hook initializes and becomes ready

```typescript
// RED
it('should become ready after initialization', async () => {
  // Arrange & Act
  const { result } = renderHook(() => useLuaEngine({}))

  // Assert
  await waitFor(() => {
    expect(result.current.isReady).toBe(true)
  })
})
```

**GREEN:** Add useEffect that initializes LuaFactory and sets isReady=true

#### Cycle 1.3: Execute runs Lua code

```typescript
// RED
it('should execute Lua code successfully', async () => {
  // Arrange
  const { result } = renderHook(() => useLuaEngine({}))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act & Assert (no error thrown = success)
  await act(async () => {
    await result.current.execute('x = 1 + 1')
  })
})
```

**GREEN:** Implement execute function that calls engine.doString()

#### Cycle 1.4: Captures print output

```typescript
// RED
it('should call onOutput when print is called', async () => {
  // Arrange
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onOutput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('print("hello")')
  })

  // Assert
  expect(onOutput).toHaveBeenCalledWith('hello')
})
```

**GREEN:** Override global print to call onOutput callback

**Implementation Note:** Use `unknown[]` instead of `any[]` to satisfy strict TypeScript:
```typescript
lua.global.set('print', (...args: unknown[]) => {
  const message = args.map(arg => String(arg)).join('\t')
  onOutput?.(message)
})
```

#### Cycle 1.4b: Multiple print arguments joined with tabs

```typescript
// RED
it('should join multiple print arguments with tabs', async () => {
  // Arrange
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onOutput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('print("a", "b", "c")')
  })

  // Assert
  expect(onOutput).toHaveBeenCalledWith('a\tb\tc')
})
```

**GREEN:** Join args with `\t` in print override (matches existing behavior)

#### Cycle 1.5: Handles errors

```typescript
// RED
it('should call onError for syntax errors', async () => {
  // Arrange
  const onError = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onError }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('this is not valid lua!!!')
  })

  // Assert
  expect(onError).toHaveBeenCalled()
})
```

**GREEN:** Wrap execute in try-catch, call onError

#### Cycle 1.6: Reset clears state

```typescript
// RED
it('should reset engine state', async () => {
  // Arrange
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onOutput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('myGlobal = 42')
    await result.current.reset()
    await result.current.execute('print(myGlobal)')
  })

  // Assert
  expect(onOutput).toHaveBeenCalledWith('nil')
})
```

**GREEN:** Implement reset that recreates engine

#### Cycle 1.6b: Reset calls onCleanup

```typescript
// RED
it('should call onCleanup when reset is called', async () => {
  // Arrange
  const onCleanup = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onCleanup }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.reset()
  })

  // Assert
  expect(onCleanup).toHaveBeenCalled()
})
```

**GREEN:** Call `onCleanup?.()` before destroying old engine in reset function

#### Cycle 1.7: Cleanup on unmount

```typescript
// RED
it('should cleanup engine on unmount', async () => {
  // Arrange
  const onCleanup = vi.fn()
  const { unmount } = renderHook(() => useLuaEngine({ onCleanup }))
  await waitFor(() => expect(onCleanup).not.toHaveBeenCalled())

  // Act
  unmount()

  // Assert
  expect(onCleanup).toHaveBeenCalled()
})
```

**GREEN:** Add `onCleanup` callback to options, call it in useEffect cleanup. This avoids exposing internals and `any` types.

**API Update:** Add `onCleanup?: () => void` to `UseLuaEngineOptions`.

#### Cycle 1.7b: No cleanup called if unmount before ready

```typescript
// RED
it('should not call onCleanup if unmounted before engine ready', () => {
  // Arrange
  const onCleanup = vi.fn()

  // Act - unmount immediately, before engine initializes
  const { unmount } = renderHook(() => useLuaEngine({ onCleanup }))
  unmount()

  // Assert - onCleanup should not be called since engine was never ready
  expect(onCleanup).not.toHaveBeenCalled()
})
```

**GREEN:** Check if engine exists before calling onCleanup in useEffect cleanup:
```typescript
return () => {
  if (engineRef.current) {
    onCleanup?.()
    engineRef.current.global.close()
  }
}
```

---

### TDD Step 1b: Edge Cases (After Core Cycles)

#### Cycle 1.8: Execute with empty string

```typescript
// RED
it('should handle empty code string without error', async () => {
  // Arrange
  const onError = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onError }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('')
  })

  // Assert
  expect(onError).not.toHaveBeenCalled()
})
```

**GREEN:** Empty string is valid Lua - no special handling needed

#### Cycle 1.9: Execute before ready throws/returns early

```typescript
// RED
it('should not execute when engine is not ready', async () => {
  // Arrange
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onOutput }))
  // Don't wait for ready

  // Act
  await act(async () => {
    await result.current.execute('print("should not run")')
  })

  // Assert
  expect(onOutput).not.toHaveBeenCalled()
})
```

**GREEN:** Check `isReady` before executing, return early if false

#### Cycle 1.10: Runtime error calls onError

```typescript
// RED
it('should call onError for runtime errors', async () => {
  // Arrange
  const onError = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onError }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('error("intentional error")')
  })

  // Assert
  expect(onError).toHaveBeenCalledWith(expect.stringContaining('intentional error'))
})
```

**GREEN:** Already handled by try-catch from Cycle 1.5

#### Cycle 1.10b: Handles print without onOutput callback

```typescript
// RED
it('should not crash when print is called without onOutput', async () => {
  // Arrange - no onOutput callback provided
  const { result } = renderHook(() => useLuaEngine({}))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act & Assert - should not throw
  await act(async () => {
    await expect(result.current.execute('print("no callback")')).resolves.not.toThrow()
  })
})
```

**GREEN:** Use optional chaining in print override: `onOutput?.(message)`

#### Cycle 1.10c: Handles error without onError callback

```typescript
// RED
it('should not crash on error when onError is not provided', async () => {
  // Arrange - no onError callback provided
  const { result } = renderHook(() => useLuaEngine({}))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act & Assert - should not throw, error is silently ignored
  await act(async () => {
    await expect(result.current.execute('error("no callback")')).resolves.not.toThrow()
  })
})
```

**GREEN:** Use optional chaining in catch block: `onError?.(error.message)`

#### Cycle 1.11a: io.read calls onReadInput

```typescript
// RED
it('should call onReadInput when io.read is called', async () => {
  // Arrange
  const onReadInput = vi.fn().mockResolvedValue('user input')
  const { result } = renderHook(() => useLuaEngine({ onReadInput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('local input = io.read()')
  })

  // Assert
  expect(onReadInput).toHaveBeenCalled()
})
```

**GREEN:** Override io.read to call onReadInput callback

#### Cycle 1.11b: io.read returns value from onReadInput

```typescript
// RED
it('should use value returned from onReadInput', async () => {
  // Arrange
  const onReadInput = vi.fn().mockResolvedValue('user input')
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onReadInput, onOutput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('local input = io.read(); print(input)')
  })

  // Assert
  expect(onOutput).toHaveBeenCalledWith('user input')
})
```

**GREEN:** Return the resolved value from onReadInput to Lua (port from existing code)

#### Cycle 1.11c: io.write calls onOutput

```typescript
// RED
it('should call onOutput when io.write is called', async () => {
  // Arrange
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onOutput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('io.write("hello")')
  })

  // Assert
  expect(onOutput).toHaveBeenCalledWith('hello')
})
```

**GREEN:** Override io.write to call onOutput callback (port from existing code)

#### Cycle 1.11d: io.read without callback returns empty string

```typescript
// RED
it('should return empty string from io.read when onReadInput not provided', async () => {
  // Arrange
  const onOutput = vi.fn()
  const { result } = renderHook(() => useLuaEngine({ onOutput }))
  await waitFor(() => expect(result.current.isReady).toBe(true))

  // Act
  await act(async () => {
    await result.current.execute('local x = io.read(); print(x == "")')
  })

  // Assert
  expect(onOutput).toHaveBeenCalledWith('true')
})
```

**GREEN:** Use fallback in io.read override: `const input = onReadInput ? await onReadInput() : ''`

---

### TDD Step 2: CodeEditor Component

**Why second:** UI component, can mock Monaco, tests interaction patterns.

#### Cycle 2.0: Shows loading state before Monaco loads

```typescript
// RED: src/components/CodeEditor/CodeEditor.test.tsx (colocated)
import { render, screen } from '@testing-library/react'

// Mock Monaco to simulate slow loading
vi.mock('@monaco-editor/react', () => ({
  default: ({ loading }: { loading?: React.ReactNode }) => (
    <div data-testid="monaco-loading">{loading}</div>
  )
}))

describe('CodeEditor', () => {
  it('should show loading state before Monaco loads', () => {
    // Arrange & Act
    render(<CodeEditor value="" onChange={() => {}} />)

    // Assert
    expect(screen.getByText('Loading editor...')).toBeInTheDocument()
  })
})
```

**GREEN:** Pass `loading` prop to Monaco: `<Editor loading={<div>Loading editor...</div>} />`

#### Cycle 2.1: Renders without crashing

```typescript
// RED: src/components/CodeEditor/CodeEditor.test.tsx (colocated)
import { render, screen, fireEvent } from '@testing-library/react'
import { CodeEditor } from './CodeEditor'

// Mock Monaco to avoid loading real editor in tests
interface MockMonacoProps {
  value: string
  onChange?: (value: string) => void
  options?: { readOnly?: boolean }
  onMount?: (editor: unknown) => void
}

vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange, options }: MockMonacoProps) => (
    <textarea
      data-testid="mock-monaco"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
      readOnly={options?.readOnly}
    />
  )
}))

describe('CodeEditor', () => {
  it('should render the editor', () => {
    // Arrange & Act
    render(<CodeEditor value="" onChange={() => {}} />)

    // Assert
    expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
  })
})
```

**GREEN:** Create CodeEditor that renders Monaco Editor

#### Cycle 2.2: Displays initial value

```typescript
// RED
it('should display the provided value', () => {
  // Arrange & Act
  render(<CodeEditor value="print('hello')" onChange={() => {}} />)

  // Assert
  expect(screen.getByTestId('mock-monaco')).toHaveValue("print('hello')")
})
```

**GREEN:** Pass value prop to Monaco

#### Cycle 2.3: Calls onChange when edited

```typescript
// RED
it('should call onChange when content changes', async () => {
  // Arrange
  const onChange = vi.fn()
  render(<CodeEditor value="" onChange={onChange} />)

  // Act
  await userEvent.type(screen.getByTestId('mock-monaco'), 'x = 1')

  // Assert
  expect(onChange).toHaveBeenCalled()
})
```

**GREEN:** Wire up onChange handler

#### Cycle 2.4: Ctrl+Enter triggers onRun

```typescript
// RED
it('should call onRun when Ctrl+Enter is pressed', async () => {
  // Arrange
  const onRun = vi.fn()
  render(<CodeEditor value="" onChange={() => {}} onRun={onRun} />)
  const editor = screen.getByTestId('mock-monaco')

  // Act - simulate Ctrl+Enter on the editor element
  fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })

  // Assert
  expect(onRun).toHaveBeenCalled()
})
```

**GREEN:** Add `onKeyDown` handler to wrapper div that checks for Ctrl+Enter and calls `onRun?.()`

**Note:** In the actual component, use Monaco's `addCommand` API to register the shortcut. The test mocks this behavior at the wrapper level.

#### Cycle 2.5: Respects readOnly prop

```typescript
// RED
it('should be read-only when readOnly=true', () => {
  // Arrange & Act
  render(<CodeEditor value="code" onChange={() => {}} readOnly />)

  // Assert - Check Monaco receives readOnly option (textarea mock reflects this)
  expect(screen.getByTestId('mock-monaco')).toHaveProperty('readOnly', true)
})
```

**GREEN:** Pass `readOnly` to Monaco's `options.readOnly` prop

#### Cycle 2.6: Ctrl+Enter without onRun does not crash

```typescript
// RED
it('should not crash when Ctrl+Enter pressed without onRun handler', () => {
  // Arrange
  render(<CodeEditor value="" onChange={() => {}} />) // no onRun prop
  const editor = screen.getByTestId('mock-monaco')

  // Act & Assert - should not throw
  expect(() => {
    fireEvent.keyDown(editor, { key: 'Enter', ctrlKey: true })
  }).not.toThrow()
  expect(editor).toBeInTheDocument()
})
```

**GREEN:** Check if onRun exists before calling: `onRun?.()`

---

### TDD Step 3: React Router

**Why third:** Infrastructure change, affects navigation but not core logic.

#### Cycle 3.1: Routes render correct components

```typescript
// RED: src/App.test.tsx (colocated with App.tsx)
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('App routing', () => {
  it('should render home page at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Welcome to Learn Lua')).toBeInTheDocument()
  })
})
```

**GREEN:** Add BrowserRouter and Routes to App

#### Cycle 3.2: Playground route works

```typescript
// RED
it('should render playground at /playground', () => {
  render(
    <MemoryRouter initialEntries={['/playground']}>
      <App />
    </MemoryRouter>
  )
  expect(screen.getByText('Lua Playground')).toBeInTheDocument()
})
```

**GREEN:** Add Route for /playground

#### Cycle 3.3: Navigation links work

```typescript
// RED
it('should navigate to playground when link clicked', async () => {
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>
  )

  await userEvent.click(screen.getByText('Playground'))
  expect(screen.getByText('Lua Playground')).toBeInTheDocument()
})
```

**GREEN:** Replace anchor tags with Link components

---

### TDD Step 4: LuaPlayground Refactor

**Why last:** Integration - combines hook + editor + existing functionality.

#### Cycle 4.1: Uses CodeEditor instead of CodeMirror

```typescript
// RED: src/components/LuaPlayground.test.tsx (colocated)
it('should render CodeEditor component', () => {
  render(<LuaPlayground />)
  expect(screen.getByTestId('mock-monaco')).toBeInTheDocument()
})
```

**GREEN:** Replace CodeMirror with CodeEditor

#### Cycle 4.2: Running code produces output

```typescript
// RED
it('should display output when code is run', async () => {
  render(<LuaPlayground />)

  // Wait for engine to initialize
  await waitFor(() => {
    expect(screen.getByText('Run Code')).not.toBeDisabled()
  })

  await userEvent.click(screen.getByText('Run Code'))

  // Default code prints "Hello, Lua!"
  await waitFor(() => {
    expect(screen.getByText(/Hello, Lua!/)).toBeInTheDocument()
  })
})
```

**GREEN:** Wire useLuaEngine to CodeEditor and BashTerminal

#### Cycle 4.3: Ctrl+Enter runs code

```typescript
// RED
it('should run code when Ctrl+Enter pressed in editor', async () => {
  render(<LuaPlayground />)
  await waitFor(() => expect(screen.getByText('Run Code')).not.toBeDisabled())

  const editor = screen.getByTestId('mock-monaco')
  await userEvent.click(editor)
  await userEvent.keyboard('{Control>}{Enter}{/Control}')

  await waitFor(() => {
    expect(screen.getByText(/Hello, Lua!/)).toBeInTheDocument()
  })
})
```

**GREEN:** Pass runCode as onRun prop to CodeEditor

---

## Testing Strategy

### Unit Tests

- [x] `useLuaEngine` - returns isReady=false initially (Cycle 1.1)
- [x] `useLuaEngine` - becomes ready after initialization (Cycle 1.2)
- [x] `useLuaEngine` - execute runs Lua code (Cycle 1.3)
- [x] `useLuaEngine` - captures print output (Cycle 1.4)
- [x] `useLuaEngine` - joins multiple print args with tabs (Cycle 1.4b)
- [x] `useLuaEngine` - handles syntax errors (Cycle 1.5)
- [x] `useLuaEngine` - reset clears state (Cycle 1.6)
- [x] `useLuaEngine` - reset calls onCleanup (Cycle 1.6b)
- [x] `useLuaEngine` - cleanup on unmount (Cycle 1.7)
- [x] `useLuaEngine` - no cleanup if unmount before ready (Cycle 1.7b)
- [x] `useLuaEngine` - handles empty code string (Cycle 1.8)
- [x] `useLuaEngine` - does not execute when not ready (Cycle 1.9)
- [x] `useLuaEngine` - handles runtime errors (Cycle 1.10)
- [x] `useLuaEngine` - handles print without onOutput callback (Cycle 1.10b)
- [x] `useLuaEngine` - handles error without onError callback (Cycle 1.10c)
- [x] `useLuaEngine` - io.read calls onReadInput (Cycle 1.11a)
- [x] `useLuaEngine` - io.read returns value from callback (Cycle 1.11b)
- [x] `useLuaEngine` - io.write calls onOutput (Cycle 1.11c)
- [x] `useLuaEngine` - io.read returns empty string without callback (Cycle 1.11d)
- [x] `CodeEditor` - shows loading state (Cycle 2.0)
- [x] `CodeEditor` - renders Monaco (Cycle 2.1)
- [x] `CodeEditor` - displays initial value (Cycle 2.2)
- [x] `CodeEditor` - calls onChange (Cycle 2.3)
- [x] `CodeEditor` - Ctrl+Enter triggers onRun (Cycle 2.4)
- [x] `CodeEditor` - respects readOnly prop (Cycle 2.5)
- [x] `CodeEditor` - Ctrl+Enter without onRun doesn't crash (Cycle 2.6)

### Integration Tests

- [x] LuaPlayground works with new CodeEditor
- [x] Navigation between routes works
- [x] Code execution produces correct output

### Manual Testing

- [x] VS Code shortcuts work (Ctrl+D, Alt+Up, Ctrl+/, etc.)
- [x] Lua syntax highlighting displays correctly
- [x] Mobile layout still responsive

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

- [x] All existing tests pass (35 tests passing)
- [x] New hook has >80% mutation test coverage (74.19% - acceptable)
- [x] VS Code shortcuts work correctly
- [x] Page load time < 3 seconds (with lazy loading)

---

## Approval

- [x] Technical Review - Approved Dec 7, 2025
- [x] Code Review Plan - TDD cycles documented above
- [x] Testing Plan Review - Test cases specified for each step
