# Code Review Guidelines

This content is injected when you use the `!code-review` command.

## Architecture Review

### Component Structure

- [ ] UI components are PURE - no business logic
- [ ] All logic is in custom hooks
- [ ] Components only handle: props, event wiring, JSX
- [ ] Related files co-located (component, styles, tests, hook)

### CSS Review

- [ ] CSS modules used for styling
- [ ] Existing shared styles reused where applicable
- [ ] CSS variables used for colors/spacing (not hardcoded values)
- [ ] No duplicate styles that exist elsewhere

## Code Quality

### TypeScript

- [ ] No `any` types - use `unknown` if truly unknown
- [ ] Props interfaces defined for all components
- [ ] Return types explicit on public functions
- [ ] No type assertions without justification

### Component Quality

- [ ] Single responsibility - component does one thing
- [ ] Props are minimal and well-named
- [ ] Default props handled appropriately
- [ ] No prop drilling (use context or composition)

### Hook Quality

- [ ] Dependencies arrays correct in useEffect/useCallback/useMemo
- [ ] No missing dependencies
- [ ] Side effects properly cleaned up
- [ ] Loading/error states handled

## Testing Review

### TDD Compliance

- [ ] Tests exist for all new functionality
- [ ] Tests written BEFORE implementation (check commit order)
- [ ] Mutation score > 80%

### Test Quality

- [ ] Hook logic thoroughly tested
- [ ] Component rendering tested
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Tests are descriptive and readable
- [ ] No implementation details tested (test behavior, not internals)

## Functionality

- [ ] Code implements requirements correctly
- [ ] Edge cases handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs or logical errors

## Security

- [ ] Input validation present where needed
- [ ] No XSS vulnerabilities (dangerouslySetInnerHTML)
- [ ] Sensitive data not logged
- [ ] No secrets in code

## Performance

- [ ] No unnecessary re-renders
- [ ] Memoization used appropriately (not everywhere)
- [ ] No memory leaks (cleanup in useEffect)
- [ ] Large lists virtualized if needed

## Accessibility

- [ ] Semantic HTML used
- [ ] Keyboard navigation works
- [ ] ARIA attributes where needed
- [ ] Focus management correct
- [ ] Color contrast sufficient

## Common Issues to Watch For

### Architecture Violations

```typescript
// ❌ Logic in UI component
function MyComponent() {
  const handleClick = async () => {
    await api.save(data);  // Business logic!
  };
}

// ✅ Logic in hook
function useMyComponent() {
  const save = useCallback(async () => {
    await api.save(data);
  }, [data]);
  return { save };
}
```

### CSS Violations

```typescript
// ❌ Inline styles
<div style={{ color: 'red' }}>

// ❌ Hardcoded colors
.button { color: #3b82f6; }

// ✅ CSS module with variables
.button { color: var(--color-primary); }
```

### TypeScript Violations

```typescript
// ❌ Any type
function process(data: any) { }

// ❌ Missing interface
function Button(props) { }

// ✅ Explicit types
interface ButtonProps {
  label: string;
  onClick: () => void;
}
function Button({ label, onClick }: ButtonProps) { }
```

## Review Process

1. **Architecture first**: Check component/hook structure
2. **Types second**: Verify TypeScript correctness
3. **Tests third**: Verify TDD compliance and quality
4. **Details last**: Style, naming, edge cases

## Reference

Full coding standards: [docs/coding-standards.md](docs/coding-standards.md)
