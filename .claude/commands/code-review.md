# Code Review Checklist

Use this checklist when reviewing code changes.

## Tech Debt Tracking

After completing the review, create GitHub issues for any non-blocking findings:

1. **Check for existing issues** before creating new ones:
   ```bash
   gh issue list --label "tech-debt" --search "<unique-identifier>" --json number
   ```

2. **Create issues** with deduplication IDs in the body:
   ```bash
   gh issue create --title "[Tech Debt] <file>: <brief description>" \
     --label "tech-debt" \
     --body "<!-- tech-debt-id: <unique-id> -->

   ## Description
   <what needs to be fixed>

   ## Location
   - [file.tsx:line](src/path/file.tsx#Lline)

   ## Suggested Fix
   <how to fix it>

   ## Priority
   High|Medium|Low - <reason>

   ## Found In
   Code review of \`<branch-name>\` branch"
   ```

3. **Unique ID format**: `<filename>-<issue-type>-<line-numbers>`
   - Example: `luarepl-any-types-26-93-101`
   - Example: `stryker-exclude-test-files`

4. **Priority levels**:
   - **High**: Violates coding standards, security issues
   - **Medium**: ESLint warnings, performance issues
   - **Low**: Nice-to-have improvements

## Architecture

- [ ] UI components contain NO business logic
- [ ] All logic is extracted into custom hooks
- [ ] Components are pure (props in, JSX out)
- [ ] Related files are co-located in component folders
- [ ] Proper separation of concerns

## TypeScript

- [ ] No `any` types used
- [ ] Explicit return types on public functions
- [ ] Props interfaces defined for all components
- [ ] Interfaces preferred over type aliases for objects
- [ ] Types exported from index.ts

## CSS & Styling

- [ ] CSS modules used (not inline styles or global CSS)
- [ ] Existing styles reused where possible
- [ ] CSS variables used for theming values
- [ ] No duplicate styles across modules

## Testing

- [ ] Tests written BEFORE implementation (TDD)
- [ ] AAA pattern used (Arrange-Act-Assert)
- [ ] Descriptive test names (behavior, not implementation)
- [ ] Edge cases covered
- [ ] Error cases covered
- [ ] Mutation score > 80%
- [ ] Tests colocated with components

## E2E Testing (for user-facing features)

- [ ] E2E tests cover core user flows
- [ ] Test page created at `/test/<feature>` (dev only)
- [ ] Tests wait for async operations (Lua engine, Monaco)
- [ ] Clear assertions on user-visible outcomes

## File Organization

- [ ] Component folder structure followed
- [ ] types.ts for component-specific types
- [ ] index.ts with barrel exports
- [ ] Hooks in separate files with tests
- [ ] No orphaned files

## Error Handling

- [ ] Errors handled explicitly
- [ ] Error states returned from hooks
- [ ] Error boundaries used where appropriate
- [ ] User-friendly error messages

## Performance

- [ ] useMemo/useCallback used appropriately (not overused)
- [ ] No unnecessary re-renders
- [ ] Large lists virtualized if needed
- [ ] Lazy loading for heavy components

## Accessibility

- [ ] Semantic HTML used
- [ ] Interactive elements keyboard accessible
- [ ] ARIA attributes added where needed
- [ ] Focus management handled

## Security

- [ ] No user input rendered as HTML without sanitization
- [ ] No secrets in code
- [ ] External URLs validated
- [ ] Input validation present

## Final Checks

- [ ] `npm run test` passes
- [ ] `npm run test:mutation` > 80%
- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] `npm run test:e2e` passes (for user-facing features)
- [ ] No console.log statements left in code
