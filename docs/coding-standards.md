# Coding Standards

This document defines the coding standards and best practices for LuaInTheWeb.

## Component Architecture

### UI Components Must Be Pure

UI components should contain NO business logic. They are purely presentational:

```typescript
// ✅ GOOD - Pure UI component
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

function Button({ label, onClick, disabled, variant = 'primary' }: ButtonProps) {
  return (
    <button
      className={styles[variant]}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}
```

```typescript
// ❌ BAD - Logic in UI component
function Button({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    await api.deleteUser(userId);  // ❌ Business logic!
    setLoading(false);
  };

  return <button onClick={handleClick}>Delete</button>;
}
```

### Extract Logic into Custom Hooks

All business logic, state management, and side effects go in custom hooks:

```typescript
// ✅ GOOD - Logic in hook
function useCodeExecution() {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (code: string) => {
    setIsRunning(true);
    setError(null);
    try {
      const result = await luaEngine.run(code);
      setOutput(result.output);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { output, isRunning, error, execute };
}

// UI component just wires things up
function CodeRunner() {
  const { output, isRunning, error, execute } = useCodeExecution();
  const [code, setCode] = useState('');

  return (
    <div>
      <CodeEditor value={code} onChange={setCode} />
      <Button onClick={() => execute(code)} disabled={isRunning} label="Run" />
      <Output lines={output} error={error} />
    </div>
  );
}
```

### Benefits of This Pattern

1. **Testable**: Hooks can be tested independently with `@testing-library/react-hooks`
2. **Reusable**: Logic can be shared across components
3. **Readable**: Clear separation of concerns
4. **Maintainable**: Changes to logic don't affect UI and vice versa

## CSS Modules

### Use CSS Modules for Isolation

All component styles should use CSS modules:

```typescript
import styles from './Button.module.css';

function Button({ label }: ButtonProps) {
  return <button className={styles.button}>{label}</button>;
}
```

### REUSE Before Creating New Styles

Before creating new CSS:

1. Check existing modules for similar styles
2. Look in `src/styles/` for shared modules
3. Extend existing classes rather than duplicating

```css
/* ✅ GOOD - Shared module for common patterns */
/* src/styles/shared.module.css */
.flexCenter {
  display: flex;
  align-items: center;
  justify-content: center;
}

.card {
  border-radius: 8px;
  padding: 16px;
  background: var(--bg-secondary);
}
```

```typescript
// Reuse shared styles
import shared from '../styles/shared.module.css';
import styles from './MyComponent.module.css';

function MyComponent() {
  return (
    <div className={`${shared.card} ${styles.myComponent}`}>
      ...
    </div>
  );
}
```

### CSS Variables for Theming

Use CSS variables for colors, spacing, and other design tokens:

```css
/* src/styles/variables.css */
:root {
  --color-primary: #3b82f6;
  --color-secondary: #64748b;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --radius-sm: 4px;
  --radius-md: 8px;
}
```

## TypeScript Standards

### Strict Typing

- **Never use `any`** - use `unknown` if type is truly unknown
- **Explicit return types** for public functions
- **Prefer interfaces** over type aliases for object shapes

```typescript
// ✅ GOOD
interface User {
  id: string;
  name: string;
  email: string;
}

function getUser(id: string): Promise<User> {
  return api.fetch(`/users/${id}`);
}

// ❌ BAD
function getUser(id: any): any {
  return api.fetch(`/users/${id}`);
}
```

### Unused Parameters Convention

Use underscore prefix (`_`) for intentionally unused parameters. This is common when implementing interfaces that require parameters you don't need:

```typescript
// ✅ GOOD - Underscore indicates intentionally unused
interface IProcess {
  handleKey(key: string, modifiers?: KeyModifiers): void;
}

class MyProcess implements IProcess {
  handleKey(key: string, _modifiers?: KeyModifiers): void {
    // Only using key, modifiers reserved for future use
    if (key === 'ArrowUp') this.navigateHistory();
  }
}

// ✅ GOOD - Callback with unused parameters
array.forEach((_item, index) => console.log(index));
```

ESLint is configured with `argsIgnorePattern: '^_'` to recognize this convention. Parameters without the underscore prefix will still trigger unused variable warnings.

### Props Interfaces

Always define explicit props interfaces:

```typescript
// ✅ GOOD
interface TerminalProps {
  lines: string[];
  onInput: (input: string) => void;
  prompt?: string;
  className?: string;
}

function Terminal({ lines, onInput, prompt = '>', className }: TerminalProps) {
  // ...
}
```

### Type Exports

Co-locate types with their related code, export from index:

```
src/
├── components/
│   └── Terminal/
│       ├── Terminal.tsx
│       ├── Terminal.module.css
│       ├── Terminal.test.tsx
│       ├── types.ts          # Terminal-specific types
│       └── index.ts          # Re-exports component and types
```

## File Organization

### Co-location

Keep related files together:

```
src/
├── components/
│   └── LuaPlayground/
│       ├── LuaPlayground.tsx        # Component
│       ├── LuaPlayground.module.css # Styles
│       ├── LuaPlayground.test.tsx   # Tests
│       ├── useLuaPlayground.ts      # Hook with logic
│       ├── useLuaPlayground.test.ts # Hook tests
│       └── index.ts                 # Public exports
├── hooks/                           # Shared hooks
├── utils/                           # Pure utility functions
├── types/                           # Shared type definitions
└── styles/                          # Shared CSS modules
```

### Index Files for Clean Imports

```typescript
// src/components/LuaPlayground/index.ts
export { LuaPlayground } from './LuaPlayground';
export { useLuaPlayground } from './useLuaPlayground';
export type { LuaPlaygroundProps } from './types';

// Usage
import { LuaPlayground } from '@/components/LuaPlayground';
```

## Error Handling

### Use Error Boundaries

Wrap component trees with error boundaries:

```typescript
import { ErrorBoundary } from '@/components/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <LuaPlayground />
    </ErrorBoundary>
  );
}
```

### Explicit Error States

Handle errors explicitly in hooks:

```typescript
interface UseAsyncResult<T> {
  data: T | null;
  error: Error | null;
  isLoading: boolean;
}

function useLuaExecution(): UseAsyncResult<string[]> {
  // Always return explicit error state
}
```

## Performance

### When to Memoize

Use memoization sparingly and intentionally:

```typescript
// ✅ Memoize expensive computations
const sortedItems = useMemo(() =>
  items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// ✅ Memoize callbacks passed to memoized children
const handleClick = useCallback(() => {
  onSelect(item.id);
}, [item.id, onSelect]);

// ✅ Memoize components that receive stable props
const MemoizedList = React.memo(ItemList);

// ❌ Don't memoize everything - adds overhead
const simpleValue = useMemo(() => a + b, [a, b]); // Unnecessary
```

## Accessibility

### Semantic HTML

Use proper HTML elements:

```typescript
// ✅ GOOD
<button onClick={handleClick}>Submit</button>
<nav><ul><li><a href="/home">Home</a></li></ul></nav>

// ❌ BAD
<div onClick={handleClick}>Submit</div>
<div><div><span onClick={...}>Home</span></div></div>
```

### ARIA When Needed

Add ARIA attributes for custom interactive elements:

```typescript
<div
  role="button"
  tabIndex={0}
  aria-pressed={isActive}
  onClick={handleClick}
  onKeyDown={handleKeyDown}
>
  Toggle
</div>
```

### Keyboard Navigation

Ensure all interactive elements are keyboard accessible:

```typescript
function handleKeyDown(e: React.KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    handleClick();
  }
}
```

## Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `LuaPlayground` |
| Hooks | camelCase, `use` prefix | `useLuaExecution` |
| Utils | camelCase | `formatError` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_HISTORY_SIZE` |
| CSS Modules | camelCase | `styles.primaryButton` |
| Types/Interfaces | PascalCase | `TerminalProps` |
| Files | Match export name | `LuaPlayground.tsx` |

## File Size Limits

ESLint enforces maximum line limits to maintain code quality and encourage good file decomposition:

| File Type | Max Lines | Enforcement |
|-----------|-----------|-------------|
| Source files (`*.ts`, `*.tsx`) | 400 | Warning |
| Test files (`*.test.ts`, `*.test.tsx`) | 500 | Error |

Line counts exclude blank lines and comments (`skipBlankLines: true`, `skipComments: true`).

### When a File Exceeds Limits

If a file grows beyond the limit:

1. **Extract logical groupings** into separate modules/hooks
2. **Move types** to a dedicated `types.ts` file
3. **Move utilities** to a dedicated `utils.ts` file
4. **Split large hooks** into focused, single-responsibility hooks
5. **Split large components** into smaller sub-components

### Example Extraction

```typescript
// Before: Large hook with 500+ lines
// src/hooks/useFileSystem.ts

// After: Split into focused modules
// src/hooks/fileSystemTypes.ts     - Type definitions
// src/hooks/fileSystemUtils.ts     - Helper functions
// src/hooks/useFileSystem.ts       - Main hook (imports from above)
```

## Code Complexity

ESLint enforces complexity rules across all 6 packages to keep functions understandable and maintainable.

### Thresholds

| Rule | Threshold | Level | Description |
|------|-----------|-------|-------------|
| `complexity` (cyclomatic) | 15 | Warning | Number of independent paths through a function |
| `sonarjs/cognitive-complexity` | 15 | Warning | How difficult a function is to understand |
| `max-lines-per-function` | 200 | Warning | Lines per function (excluding blanks/comments) |
| `max-params` | 5 | Warning | Parameters per function |
| `max-depth` | 4 | Warning | Nesting depth |

### March 2026 Baseline

244 existing warnings across all packages. These are tracked as tech debt — **do not increase them**.

Worst hotspots:
- `CanvasRenderer.executeCommand` — cognitive complexity 60
- `LuaCanvasRuntime` setup — 1360 lines
- 20 cognitive complexity violations, 15 cyclomatic complexity violations

### Policy for New Code

- New functions **MUST NOT** introduce complexity warnings
- Reviewers check for new warnings in changed files during PR review
- Existing warnings are advisory — fix them opportunistically when touching those files

### How to Check

```bash
# Check a specific package
npm run lint --prefix packages/shell-core

# Check all packages
npm run lint

# Grep for complexity warnings in lint output
npm run lint 2>&1 | grep -E "complexity|max-lines|max-params|max-depth"
```

## Code Duplication

Cross-package duplication is detected by [jscpd](https://github.com/kucherenko/jscpd), configured in `.jscpd.json`.

### March 2026 Baseline

| Metric | Value |
|--------|-------|
| Clones | 26 |
| Duplicated lines | 602 |
| Duplication rate | 1.67% |

Biggest hotspot: 8 audio engine clones (~500 lines) between `canvas-runtime` and `lua-runtime`.

### Intentional Exclusions

Some duplication is intentional and excluded from scanning:

| Exclusion | Reason |
|-----------|--------|
| `export/src/runtime/**` | Paired with `canvas-runtime` — different thread models |
| `AnsiGraphicsEditor/textLayerGrid.ts` | Shared ANSI subsystem — tracked separately |
| `AnsiGraphicsEditor/types.ts` | Shared ANSI subsystem types |
| `AnsiGraphicsEditor/serialization.ts` | Shared ANSI subsystem serialization |
| `AnsiGraphicsEditor/terminalBuffer.ts` | Shared ANSI subsystem buffer |
| `AnsiGraphicsEditor/layerUtils.ts` | Shared ANSI subsystem utilities |

### Policy

- **Duplication ceiling: 3%** — CI and local CI fail above this threshold
- Current rate is 1.67%, providing headroom for growth
- Reduce duplication by extracting shared code into packages (e.g., `@lua-learning/shell-core`)

### How to Check

```bash
# Run duplication detection
npm run duplicates

# Reports are generated in reports/jscpd/
```

## Canvas Editor / Export Consistency

The canvas system runs in two environments: the **editor** (`packages/canvas-runtime`) and **export** (`packages/export/src/runtime`). These must stay in sync.

### Rules

1. **Any canvas change must be applied to both editor and export.** If you add a drawing operation, input handler, or behavior change, it must work in both environments.
2. **Use shared libraries where possible.** Extract common logic into shared types, utilities, or packages rather than implementing the same thing twice.
3. **When sharing isn't possible** (e.g., different thread models), implement in both places and add a comment linking the paired implementation:
   ```typescript
   // Paired with: packages/export/src/runtime/canvas-bridge-core.ts:setupInputListeners
   ```
4. **Test both paths.** A feature working in the editor does not guarantee it works in exported games.

## Checklist

Before submitting code:

- [ ] UI components contain no business logic
- [ ] Logic is extracted into custom hooks
- [ ] CSS modules used, existing styles reused where possible
- [ ] No `any` types
- [ ] Props interfaces defined
- [ ] Related files co-located
- [ ] Error states handled
- [ ] Keyboard accessible
- [ ] Tests written for hooks (logic)
- [ ] Tests written for components (rendering)
- [ ] Source files under 400 lines (excluding blanks/comments)
- [ ] Test files under 500 lines (excluding blanks/comments)
- [ ] No new complexity warnings in changed files
- [ ] No new duplication introduced (`npm run duplicates` < 3%)
- [ ] Canvas changes applied to both editor and export runtimes
