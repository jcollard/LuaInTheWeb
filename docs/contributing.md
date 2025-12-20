# Contributing Guide

Thank you for contributing to LuaInTheWeb! This guide explains our development process.

## Prerequisites

Before contributing, you'll need:

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn
- Git
- **uv/uvx** for Code-Index-MCP (required for Claude Code workflow)
  - Install from https://docs.astral.sh/uv/
  - See [MCP Setup in Getting Started](./getting-started.md#mcp-model-context-protocol-setup)

## Branch Policy

> **Never commit directly to main.** All changes must go through branches and pull requests.

This ensures code review, issue tracking, and CI validation for every change. See [workflow.md](../.claude/workflow.md) for details.

## Workflow

> **See [.claude/workflow.md](../.claude/workflow.md) for the complete workflow documentation.**
>
> Run `/workflow` in Claude Code to inject the full workflow reference.

### Quick Reference

| I want to... | Action |
|--------------|--------|
| See project status | `/status` |
| Start next available issue | `/issue next` |
| Start a specific issue | `/issue <n> begin` |
| Create PR when done | `/issue <n> review` |
| Work on complex feature | Create plan → `/prepare-plan` → `/review-plan` → `/begin` |

### Two Workflows

| Workflow | When to Use | Commands |
|----------|-------------|----------|
| **Issue-based** | Simple bugs, small features, tech debt (1-5 tasks) | `/issue <n> begin` → work → `/issue <n> review` |
| **Roadmap-based** | Complex features needing planning (6+ tasks) | Create plan → `/prepare-plan` → `/review-plan` → `/begin` |

## Development Process

### 1. Check the Project Board

Before starting work, check the [GitHub Project Board](https://github.com/users/jcollard/projects/3) for:
- Current priorities (P0-P3)
- Items in "Todo" status ready to work
- Roadmap plans in [roadmap/](../roadmap/)

### 2. Choose Your Workflow

**For simple work (1-5 tasks)**:
- Run `/issue next` to auto-select, or pick a specific issue
- Run `/issue <n> begin` to create worktree and start

**For complex features (6+ tasks)**:
1. Copy `roadmap/_template.md` to a new plan file
2. Fill out the template completely
3. Run `/prepare-plan` to apply TDD structure
4. Run `/review-plan` to verify
5. Run `/begin` to start implementation

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
