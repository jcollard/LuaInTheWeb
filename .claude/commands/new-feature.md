# New Feature Development Guidelines

Follow these guidelines when implementing new features.

## File Structure

Every new component should follow this folder structure:

```
src/components/
└── MyComponent/
    ├── MyComponent.tsx        # Pure UI component
    ├── MyComponent.module.css # Scoped styles
    ├── MyComponent.test.tsx   # Component tests
    ├── useMyComponent.ts      # Hook with business logic
    ├── useMyComponent.test.ts # Hook tests
    ├── types.ts               # Component-specific types
    └── index.ts               # Barrel exports
```

## Component Architecture

### UI Components Must Be PURE

No business logic in UI components - only props, event wiring, and rendering:

```typescript
// GOOD - Pure UI component
interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

function Button({ label, onClick, disabled }: ButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}
```

### Extract Logic into Custom Hooks

All state management, side effects, and business logic go in hooks:

```typescript
// GOOD - Logic in hook
function useCodeExecution() {
  const [output, setOutput] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (code: string) => {
    setIsRunning(true);
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
```

## CSS Modules

### Always Use CSS Modules

```typescript
import styles from './Button.module.css';

function Button({ label }: ButtonProps) {
  return <button className={styles.button}>{label}</button>;
}
```

### REUSE Existing Styles

Before creating new CSS:
1. Check existing modules for similar styles
2. Look in `src/styles/` for shared modules
3. Extend existing classes rather than duplicating

## TypeScript Requirements

### Strict Typing

- **Never use `any`** - use `unknown` if type is truly unknown
- **Explicit return types** for public functions
- **Prefer interfaces** over type aliases for object shapes

### Props Interfaces

Always define explicit props interfaces:

```typescript
interface TerminalProps {
  lines: string[];
  onInput: (input: string) => void;
  prompt?: string;
  className?: string;
}
```

## Index File (Barrel Exports)

```typescript
// src/components/MyComponent/index.ts
export { MyComponent } from './MyComponent';
export { useMyComponent } from './useMyComponent';
export type { MyComponentProps } from './types';
```

## Checklist

Before the feature is complete:

- [ ] Folder structure follows guidelines
- [ ] UI component is pure (no business logic)
- [ ] Logic extracted into custom hook
- [ ] CSS modules used (existing styles reused)
- [ ] types.ts file for component types
- [ ] index.ts with barrel exports
- [ ] Tests colocated with component
- [ ] No `any` types
- [ ] Props interfaces defined
- [ ] TDD workflow followed (see `/tdd`)
