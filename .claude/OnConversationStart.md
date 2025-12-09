# Project Context

This file is automatically injected at the start of each Claude Code session.

## Project Overview

LuaInTheWeb is a web-based Lua learning and practice platform that allows users to learn and execute Lua code directly in their browsers.

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + wasmoon (WebAssembly Lua)

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

## GitHub Project Board

📋 **[View Project Board](https://github.com/users/jcollard/projects/3)**

All work is tracked in GitHub Projects with the following fields:
- **Priority**: P0-Critical, P1-High, P2-Medium, P3-Low
- **Effort**: XS, S, M, L, XL (t-shirt sizing)
- **Type**: Feature, Bug, Tech Debt, Docs
- **Status**: Concept → Todo → In Progress → Done
- **Plan**: Link to roadmap implementation plan (for complex features)

### Status Definitions

| Status | Meaning |
|--------|---------|
| **Concept** | Idea needs research/definition before it's actionable |
| **Todo** | Well-defined, ready to be worked on |
| **In Progress** | Actively being worked on |
| **Done** | Completed and merged |

### Workflow Decision Tree

```
New work item identified
    │
    ├─► Is it well-defined? (clear scope, actionable)
    │       │
    │       ├─► YES: Is it simple? (1-3 tasks, < 1 day)
    │       │       │
    │       │       ├─► YES: Create issue → /issue <n> begin → /issue <n> review
    │       │       │
    │       │       └─► NO (complex): Create issue → Create roadmap plan → /prepare-plan → /begin
    │       │
    │       └─► NO: Create issue in "Concept" status → Research → Move to "Todo" when defined
    │
    └─► For existing issues: /status → /issue next (or pick specific issue)
```

### Two Workflows

| Workflow | When to Use | Commands |
|----------|-------------|----------|
| **Issue-based** | Simple bugs, small features, tech debt | `/issue <n> begin` → work → `/issue <n> review` |
| **Roadmap-based** | Complex features needing planning | Create plan → `/prepare-plan` → `/review-plan` → `/begin` |

## Parallel Development with Worktrees

This project supports **git worktrees** for running multiple Claude Code agents on separate issues simultaneously.

### Worktree Structure

```
C:\Users\User\git\jcollard\
├── LuaInTheWeb/                    # Main worktree (main branch)
├── LuaInTheWeb-issue-42/           # Worktree for issue #42
└── LuaInTheWeb-issue-15/           # Worktree for issue #15
```

### Quick Worktree Commands

| Command | Description |
|---------|-------------|
| `/worktree list` | List all active worktrees |
| `/worktree create <n>` | Create worktree for issue #n (includes npm install) |
| `/worktree remove <n>` | Remove worktree for issue #n |
| `/worktree status` | Show status of all worktrees |

### Parallel Workflow

1. **Create a worktree** for an issue: `/worktree create 42`
2. **Open new Claude Code session** in the worktree directory
3. **Work on the issue**: `/issue 42 begin`
4. **When done**: `/issue 42 review` to create PR
5. **Clean up**: `/worktree remove 42` (from main worktree)

See [docs/worktrees.md](docs/worktrees.md) for detailed documentation.

### Quick Commands
- `/status` - View project board status and suggested next action
- `/issue <n>` - View issue details and complexity assessment
- `/issue <n> begin` - Start working on an issue (creates branch, updates project status)
- `/issue <n> review` - Create PR when done
- `/issue <n> eval` - Evaluate issue: estimate priority/effort/type, make concrete
- `/issue next` - Auto-select next issue (highest priority Todo)
- `/issue next <type>` - Auto-select next issue of type (tech-debt, bug, enhancement, roadmap)
- `/tech-debt` - View and manage tech debt items

## Roadmap (Implementation Plans)

- **Current Plans**: [roadmap/README.md](roadmap/README.md)
- **Plan Template**: [roadmap/_template.md](roadmap/_template.md)

For complex features, create a detailed plan in the roadmap directory linked to a GitHub issue.

## Development Practices

### Conventions

- **Python**: Always use `python` (not `python3`) for scripts
- **Timestamps**: When updating dates in files, use `date` command to get current timestamp

### Code Architecture

- **UI Components are PURE**: No business logic in UI components - only props, event wiring, and rendering
- **Logic in Hooks**: Extract all business logic into custom hooks for testability
- **CSS Modules**: Use CSS modules for style isolation; REUSE existing modules before creating new ones
- **Strict TypeScript**: No `any`, explicit types, prefer interfaces

See [docs/coding-standards.md](docs/coding-standards.md) for detailed guidelines.

### TDD is MANDATORY

This project follows strict Test-Driven Development with the **Red-Green-Refactor-Mutate** cycle:

1. **RED**: Write a failing test FIRST
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while tests pass
4. **MUTATE**: Run scoped mutation tests immediately

Use `/tdd` command for detailed TDD guidelines.

### Mutation Testing (Per Item)

Tests must be verified with mutation testing **immediately after each implementation item** - do NOT batch until the end.

```bash
# Run scoped mutation tests on new files
npm run test:mutation:scope "src/components/NewFeature/**"
```

Use `/mutation-test` command for mutation testing guidelines.

### E2E Testing (At Milestones)

E2E tests are written at **MILESTONE** checkpoints when user flows are complete, not after every item.

Use `/milestone` command when a user-visible flow is ready for E2E testing.

### Before Completing Each Implementation Item

- [ ] Tests written BEFORE implementation (RED)
- [ ] Minimum code to pass (GREEN)
- [ ] Code refactored (REFACTOR)
- [ ] **Scoped mutation tests pass: `npm run test:mutation:scope "path/to/files/**"`**
- [ ] **Mutation score >= 80% on new files**

### At Each MILESTONE Checkpoint

- [ ] E2E test page created (if needed)
- [ ] E2E tests written for completed user flow
- [ ] E2E tests pass: `npm run test:e2e`

### Before Completing Any Plan

- [ ] All tests pass: `npm run test`
- [ ] Full mutation score > 80%: `npm run test:mutation`
- [ ] Linting passes: `npm run lint`
- [ ] All E2E tests pass: `npm run test:e2e`

## Commands

**CRITICAL: All npm commands MUST be run from the `lua-learning-website` directory, NOT the root `LuaInTheWeb` directory.**

```bash
# ALWAYS change to the correct directory first
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

The project has this structure:
```
LuaInTheWeb/              # Git repository root (DO NOT run npm commands here)
└── lua-learning-website/ # Application directory (RUN npm commands here)
    ├── package.json
    ├── src/
    └── ...
```

## Special Commands

### Project & Issue Management
- `/status` - View project board status, git state, worktrees, and suggested next action
- `/issue <n>` - View issue details and complexity assessment
- `/issue <n> begin` - Start working on an issue (creates branch, updates project)
- `/issue <n> review` - Run code review and create PR
- `/issue <n> eval` - Evaluate issue: estimate priority/effort/type, make concrete, ask questions if needed
- `/issue next` - Auto-select next issue (highest priority Todo)
- `/issue next <type>` - Auto-select by type (tech-debt, bug, enhancement, roadmap)
- `/tech-debt` - View and manage tech debt items with priority/effort

### Worktree Management (Parallel Development)
- `/worktree list` - List all active worktrees
- `/worktree create <n>` - Create worktree for issue #n (includes npm install)
- `/worktree remove <n>` - Remove worktree for issue #n
- `/worktree status` - Show status of all worktrees with git state

### Roadmap Workflow (Complex Features)
- `/prepare-plan` - Prepare next draft plan for implementation (applies TDD, structure, E2E milestones)
- `/review-plan` - Review current plan for compliance before starting
- `/begin` - Create task list and begin implementation (includes mutation + E2E checkpoints)
- `/milestone` - E2E checkpoint when a user flow is complete

### Development Guidelines
- `/tdd` - Inject TDD guidelines (Red-Green-Refactor-Mutate cycle)
- `/new-feature` - Inject new feature development guidelines
- `/e2e` - Inject E2E testing guidelines
- `/mutation-test` - Inject mutation testing guidelines (scoped + full)
- `/code-review` - Inject code review checklist

## Continuation Policy
- NEVER stop to ask "Do you want to continue?" or "Should I proceed?"
- Work through the ENTIRE task list until completion
- If context gets full, auto-compact and continue working
- Only stop for actual blockers (missing info, errors, ambiguity)
- Avoid using bash commands that are not present in @settings.local.json or @.claude/settings.json 
- When you finish. Create another comprehensive ToDo Task List with remaining items and continue until there is nothing left to complete.