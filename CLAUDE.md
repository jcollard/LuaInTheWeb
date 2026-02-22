# Project Rules

- NEVER use `cd` in Bash commands. Always use absolute paths. The working directory must remain at the repo root to keep hook paths working.

## Pre-PR Type Checking

`npm run build` fails locally due to pre-existing package resolution issues (`@lua-learning/*` workspace packages). **This does not mean you can skip type checking.**

Before committing, always run:

```bash
npx tsc -p lua-learning-website/tsconfig.app.json --noEmit 2>&1 | grep -v "@lua-learning/"
```

This filters out known pre-existing package errors. **Any remaining errors are real and must be fixed before pushing.**

## Interface Changes Require Mock Updates

When adding a property to a shared interface (e.g., `IDEContextValue`, `TabBarProps`), you MUST search for all test mocks of that interface and update them:

```bash
# Example: after adding a property to IDEContextValue
grep -rn "IDEContextValue" lua-learning-website/src --include="*.test.*"
```

TypeScript test mocks that construct the full interface will fail `tsc` if a required property is missing — but this only shows up in the build step, not in `vitest run` (which uses a different transpiler). Always run the tsc check above to catch these.
