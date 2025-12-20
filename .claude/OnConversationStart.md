# Project Context

This file is automatically injected at the start of each Claude Code session.

## Project Overview

LuaInTheWeb is a web-based Lua learning and practice platform that allows users to learn and execute Lua code directly in their browsers.

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + wasmoon (WebAssembly Lua)

## Prerequisites

Before using Claude Code with this project, ensure you have:

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn
- Git
- **uv/uvx** (for Code-Index-MCP): Install from https://docs.astral.sh/uv/
  - Required for code indexing and search features
  - See [MCP Setup](docs/getting-started.md#mcp-model-context-protocol-setup) for configuration details

## Project Structure

```
lua-learning-website/
├── src/
│   ├── components/     # React components (LuaPlayground, LuaRepl, BashTerminal)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── __tests__/      # Test files
├── public/             # Static assets
└── package.json        # Dependencies
```

## Documentation

Reference these docs for detailed information (do not load entire files unless needed):

- **Developer Guide**: [docs/README.md](docs/README.md)
- **Getting Started**: [docs/getting-started.md](docs/getting-started.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)
- **Coding Standards**: [docs/coding-standards.md](docs/coding-standards.md)
- **Testing Guide**: [docs/testing.md](docs/testing.md)
- **Contributing**: [docs/contributing.md](docs/contributing.md)
- **Worktrees Guide**: [docs/worktrees.md](docs/worktrees.md)
- **Workflow**: [.claude/workflow.md](.claude/workflow.md) - **Single source of truth for project workflow**

## Workflow Summary

📋 **[GitHub Project Board](https://github.com/users/jcollard/projects/3)** - All work is tracked here.

**Run `/workflow` for full workflow documentation.**

### Unified Workflow

All work follows: **Plan → Approve → Implement → Review → Accept/Reject**

```
/status → /issue next → /issue <n> begin → [APPROVE] → [TDD Work] → /issue <n> review → /pr-review <n> → accept/reject
```

### Quick Commands

| Situation | Command |
|-----------|---------|
| Check project state | `/status` |
| Start next available issue | `/issue next` |
| Start a specific issue | `/issue <n> begin` (shows plan, waits for approval) |
| Evaluate unclear issue | `/issue <n> eval` |
| Create PR when done | `/issue <n> review` |
| Review a PR | `/pr-review <n>` |
| Accept and merge PR | `/pr-review <n> accept` |
| Reject PR with feedback | `/pr-review <n> reject "feedback"` |

### Workflow by Complexity

| Complexity | Tasks | Command | Flow |
|------------|-------|---------|------|
| Simple | 1-5 | `/issue <n> begin` | brief plan → approve → work |
| Medium | 6-10 | `/issue <n> begin` | detailed plan → approve → work |
| **Epic** | 10+ | `/epic <n> begin` | Has `## Sub-Issues` section |

> ⚠️ **Epic Detection:** If issue body contains `## Sub-Issues`, use `/epic` not `/issue`

### Worktrees

All work happens in isolated worktrees. `/issue <n> begin` auto-creates worktrees after plan approval.

| Command | Purpose |
|---------|---------|
| `/worktree list` | List active worktrees |
| `/worktree create <n>` | Create worktree for issue |
| `/worktree remove <n>` | Remove worktree |

**Note**: Worktrees are auto-removed by `/pr-review <n> accept` after merge.

## Development Practices

### Code Architecture

- **UI Components are PURE**: No business logic in UI components - only props, event wiring, and rendering
- **Logic in Hooks**: Extract all business logic into custom hooks for testability
- **CSS Modules**: Use CSS modules for style isolation; REUSE existing modules before creating new ones
- **Strict TypeScript**: No `any`, explicit types, prefer interfaces

See [docs/coding-standards.md](docs/coding-standards.md) for detailed guidelines.

### TDD is MANDATORY

**Red-Green-Refactor-Mutate** cycle:

1. **RED**: Write a failing test FIRST
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while tests pass
4. **MUTATE**: Run scoped mutation tests immediately

Use `/tdd` for detailed TDD guidelines, `/mutation-test` for mutation testing guidelines.

### Checkpoints

**After each item**: Scoped mutation tests (`npm run test:mutation:scope "path/**"`) >= 80%

**At MILESTONEs**: Run `/milestone` for E2E testing

**Before PR**: All tests, mutation, lint, build, E2E pass

## Commands

**CRITICAL: All npm commands MUST be run from the `lua-learning-website` directory, NOT the root `LuaInTheWeb` directory.**

```bash
cd lua-learning-website

npm run dev                  # Start development server
npm run test                 # Run tests
npm run test:watch           # Watch mode
npm run test:mutation        # Full mutation testing (end of plan)
npm run test:mutation:scope "path/**"  # Scoped mutation testing (per item)
npm run build                # Build for production
npm run lint                 # Run linter
npm run test:e2e             # Run E2E tests (Playwright)
```

## Special Commands

### Workflow & Status
- `/workflow` - **Inject full workflow documentation**
- `/status` - View project board status, git state, suggested next action

### Issue Management
- `/issue <n>` - View issue details and complexity
- `/issue <n> begin` - **Show plan, wait for approval**, then create worktree + branch
- `/issue <n> review` - Code review and create PR
- `/issue <n> eval` - Evaluate issue fields
- `/issue next` - Auto-select next issue
- `/tech-debt` - View tech debt items

### PR Management
- `/pr-review <n>` - Review PR against coding standards
- `/pr-review <n> accept` - **Merge, close issue, create tech debt, remove worktree**
- `/pr-review <n> reject "feedback"` - **Create rework tasks from feedback**

### Epic Management (Issues with `## Sub-Issues` section)
- `/epic <n>` - View epic overview and progress
- `/epic <n> begin` - Start epic: create worktree + tracking
- `/epic <n> next` - Start next sub-issue with context
- `/epic <n> status` - Show dependency graph
- `/epic <n> review` - Create PR when all sub-issues complete
- `/milestone` - E2E checkpoint

### Development Guidelines
- `/tdd` - TDD guidelines
- `/new-feature` - New feature guidelines
- `/e2e` - E2E testing guidelines
- `/mutation-test` - Mutation testing guidelines
- `/code-review` - Code review checklist

## Conventions

- **Branch Policy**: Never commit directly to main. All changes must go through branches and PRs.

- **Python**: Always use `python` (not `python3`) for scripts
- **Timestamps**: When updating dates in files, use `date` command to get current timestamp

## Utility Scripts

### JSON Filtering (`scripts/jq.js`)

A lightweight jq alternative for JSON filtering in shell pipelines (works on Windows):

```bash
# Get a field
gh project item-list 3 --owner jcollard --format json | node scripts/jq.js ".items[0].id"

# Filter with select
gh project item-list 3 --owner jcollard --format json | node scripts/jq.js ".items[] | select(.content.number == 34)"

# Supported: . .field .field.nested .array[0] .array[] select() pipes (|)
```

## Continuation Policy

- NEVER stop to ask "Do you want to continue?" or "Should I proceed?"
- Work through the ENTIRE task list until completion
- If context gets full, auto-compact and continue working
- Only stop for actual blockers (missing info, errors, ambiguity)
- Avoid using bash commands that are not present in @settings.local.json or @.claude/settings.json
- When you finish, create another comprehensive ToDo Task List with remaining items and continue until there is nothing left to complete.

## Windows-Specific Error Handling

### File Modification Error

If you encounter this error repeatedly:

```
Error: File has been unexpectedly modified. Read it again before attempting to write it.
```

**This is a known Windows-specific bug.** If this error occurs more than **2 times in a row** on the same file operation:

1. **STOP all current work immediately**
2. **Notify the user** with this message:
   > **Windows Terminal Bug Detected**
   >
   > The "File has been unexpectedly modified" error has occurred multiple times.
   > This is a known Windows-specific bug that requires a new terminal session.
   >
   > Please close this terminal and start a new Claude Code session.
3. **Wait for further instructions** - do NOT continue retrying the operation

**Important**: Do NOT keep retrying the same operation. This wastes context and time, as the issue will not resolve without a fresh terminal.
