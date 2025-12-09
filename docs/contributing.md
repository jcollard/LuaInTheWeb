# Contributing Guide

Thank you for contributing to LuaInTheWeb! This guide explains our development process.

## Development Process

### 1. Check the Roadmap

Before starting work, check [roadmap/](../roadmap/) for:
- Existing plans that might overlap with your idea
- Current priorities
- Features that need implementation

### 2. Create or Review a Plan

For significant changes:
1. Copy `roadmap/_template.md` to a new plan file
2. Fill out the template completely
3. Get plan approved before implementation

For small changes (bug fixes, minor improvements):
- Create an issue describing the change
- Reference the issue in your PR

### 3. Follow TDD

We practice Test-Driven Development:

1. **Write a failing test** that describes the desired behavior
2. **Run the test** and verify it fails for the right reason
3. **Write minimal code** to make the test pass
4. **Refactor** while keeping tests green
5. **Run mutation tests** to verify test quality

See [Testing Guide](./testing.md) for details.

### 4. Create a Pull Request

**Option A: Single Branch (Traditional)**
1. Create a feature branch: `git checkout -b feature/your-feature`
2. Make your changes following TDD
3. Ensure all tests pass: `npm run test`
4. Ensure mutation score is acceptable: `npm run test:mutation`
5. Ensure linting passes: `npm run lint`
6. Push and create a PR

**Option B: Worktree (Parallel Development)**
1. Create a worktree for your issue: `git worktree add ../LuaInTheWeb-issue-<n> -b <n>-feature-name`
2. Work in the worktree directory
3. Follow TDD and complete your changes
4. Push and create PR from the worktree
5. Clean up when done: `git worktree remove ../LuaInTheWeb-issue-<n>`

See [Worktrees Guide](./worktrees.md) for detailed documentation on parallel development.

### PR Checklist

- [ ] Tests written before implementation (TDD)
- [ ] All tests pass
- [ ] Mutation score > 80%
- [ ] No lint errors
- [ ] Documentation updated (if applicable)
- [ ] Roadmap plan linked (for features)

## Code Standards

### TypeScript

- Use strict TypeScript (project is configured for this)
- Define interfaces for complex objects
- Avoid `any` type - use `unknown` if type is truly unknown
- Use meaningful variable and function names

### React

- Functional components with hooks
- Keep components focused and small
- Extract reusable logic into custom hooks
- Use TypeScript for props definitions

### Formatting

- Use Prettier defaults
- 2-space indentation
- Single quotes for strings
- Trailing commas

## Commit Messages

Use conventional commits:

```
feat: add syntax highlighting for Lua
fix: prevent crash on empty input
docs: update testing guide
test: add mutation tests for parser
refactor: extract terminal utilities
```

## Getting Help

- Check existing documentation in `docs/`
- Review similar code in the codebase
- Ask questions in issues or discussions
