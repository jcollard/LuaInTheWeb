# New Feature Development Guidelines

This content is injected when you use the `!new-feature` command.

## Approach

1. **Create a plan** in `roadmap/` using the template
2. **Review existing code** for similar patterns to reuse
3. **Design component structure** following architecture rules
4. **Write tests first** (TDD - red/green/refactor)
5. **Implement** following coding standards
6. **Run mutation tests** to verify test quality
7. **Update documentation** if needed

## Component Architecture Rules

### UI Components Must Be Pure

- NO business logic in UI components
- Only: props, event wiring, and JSX rendering
- All state and logic goes in custom hooks

```typescript
// ✅ Structure for new features
src/components/MyFeature/
├── MyFeature.tsx           # Pure UI - props in, JSX out
├── MyFeature.module.css    # Styles
├── MyFeature.test.tsx      # Component render tests
├── useMyFeature.ts         # Hook with all logic
├── useMyFeature.test.ts    # Hook tests (most logic tests here)
├── types.ts                # TypeScript interfaces
└── index.ts                # Public exports
```

### Logic in Hooks Pattern

```typescript
// useMyFeature.ts - ALL logic here
export function useMyFeature() {
  const [state, setState] = useState<State>(initial);

  const doAction = useCallback(async () => {
    // Business logic, API calls, etc.
  }, []);

  return { state, doAction };
}

// MyFeature.tsx - PURE UI
export function MyFeature() {
  const { state, doAction } = useMyFeature();

  return (
    <div className={styles.container}>
      <Button onClick={doAction} label="Do Action" />
      <Output data={state} />
    </div>
  );
}
```

## CSS Modules

### Before Creating New Styles

1. Check `src/styles/` for shared modules
2. Check existing component styles for similar patterns
3. Reuse CSS variables from `variables.css`
4. Only create new styles if truly unique

### Naming

```css
/* ✅ Use camelCase for class names */
.primaryButton { }
.errorMessage { }
.containerFluid { }

/* ❌ Avoid */
.primary-button { }
.PrimaryButton { }
```

## Implementation Checklist

### Planning
- [ ] Plan created in `roadmap/` directory
- [ ] Existing patterns reviewed for reuse
- [ ] Component structure designed

### Architecture
- [ ] UI components are pure (no logic)
- [ ] Logic extracted to custom hooks
- [ ] CSS modules used
- [ ] Existing styles reused where possible

### TypeScript
- [ ] No `any` types
- [ ] Props interfaces defined
- [ ] Return types explicit on public functions

### Testing (TDD)
- [ ] Tests written BEFORE implementation
- [ ] Hook logic thoroughly tested
- [ ] Component rendering tested
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Mutation score > 80%

### Quality
- [ ] All tests pass: `npm run test`
- [ ] Linting passes: `npm run lint`
- [ ] Accessible (keyboard nav, semantic HTML)
- [ ] Error boundaries in place

## File Naming

| Type | Pattern | Example |
|------|---------|---------|
| Component | PascalCase.tsx | `LuaEditor.tsx` |
| Hook | useCamelCase.ts | `useLuaEditor.ts` |
| Styles | PascalCase.module.css | `LuaEditor.module.css` |
| Tests | *.test.ts(x) | `LuaEditor.test.tsx` |
| Types | types.ts or PascalCase.types.ts | `types.ts` |

## Reference

Full coding standards: [docs/coding-standards.md](docs/coding-standards.md)
