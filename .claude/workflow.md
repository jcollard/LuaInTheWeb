# Project Workflow

> **Canonical Source**: This is the single source of truth for the project workflow.
> Run `/workflow` to inject this content into any session.

## Overview

All work is tracked in the [GitHub Project Board](https://github.com/users/jcollard/projects/3).

### Status Definitions

| Status | Meaning |
|--------|---------|
| **Concept** | Idea needs research/definition before it's actionable |
| **Todo** | Well-defined, ready to be worked on |
| **In Progress** | Actively being worked on |
| **Done** | Completed and merged |

### Project Fields

| Field | Values |
|-------|--------|
| **Priority** | P0-Critical, P1-High, P2-Medium, P3-Low |
| **Effort** | XS, S, M, L, XL (t-shirt sizing) |
| **Type** | Feature, Bug, Tech Debt, Docs |
| **Plan** | Link to roadmap plan (for epics only) |

---

## Unified Workflow

All work follows the same flow, with complexity determining depth:

```
┌─────────────────────────────────────────────────────────────────────┐
│                        UNIFIED WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  /status                    ← Check project state                    │
│       │                                                              │
│       ▼                                                              │
│  /issue next                ← Auto-select or pick specific issue     │
│  /issue <n>                                                          │
│       │                                                              │
│       ▼                                                              │
│  /issue <n> eval            ← (If unclear) Define and clarify issue  │
│       │                                                              │
│       ▼                                                              │
│  /issue <n> begin           ← Shows plan, waits for APPROVAL         │
│       │                                                              │
│       ▼                                                              │
│  [APPROVE]                  ← Human approves plan                    │
│       │                                                              │
│       │                     Creates worktree, starts TDD work        │
│       ▼                                                              │
│  [TDD Work]                 ← Red-Green-Refactor-Mutate cycle        │
│       │                                                              │
│       ▼                                                              │
│  /issue <n> review          ← Code review + create PR                │
│       │                     (Tech debt identified, not created yet)  │
│       ▼                                                              │
│  /pr-review <n>             ← Human reviews PR                       │
│       │                                                              │
│       ├──────────────────────────────┐                               │
│       ▼                              ▼                               │
│  /pr-review <n> accept      /pr-review <n> reject "feedback"         │
│       │                              │                               │
│       │ • Merge PR                   │ Creates rework task list      │
│       │ • Close issue                │ from feedback                 │
│       │ • Create tech debt issues    │                               │
│       │ • Remove worktree            ▼                               │
│       │                         [Rework] ──► /issue <n> review       │
│       ▼                                                              │
│     DONE                                                             │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Workflow Phases

### Phase 1: Select Work

| Command | Purpose |
|---------|---------|
| `/status` | View project state, git status, suggested next action |
| `/issue next` | Auto-select highest priority Todo issue |
| `/issue next <type>` | Auto-select by type (tech-debt, bug, enhancement) |
| `/issue <n>` | View specific issue details and complexity |

### Phase 2: Define (If Needed)

For unclear issues in "Concept" status:

| Command | Purpose |
|---------|---------|
| `/issue <n> eval` | Evaluate issue: estimate fields, clarify scope, make actionable |

After eval, the issue should be moved to "Todo" status.

### Phase 3: Plan & Approve

| Command | Purpose |
|---------|---------|
| `/issue <n> begin` | Generate implementation plan and wait for approval |

The `begin` command:
1. Analyzes the issue complexity
2. Generates an implementation plan (scope based on complexity)
3. **Waits for human approval** before proceeding
4. On approval: creates worktree, branch, starts work

**Plan Depth by Complexity:**

| Complexity | Tasks | Plan Depth |
|------------|-------|------------|
| Simple | 1-5 | Brief inline plan |
| Medium | 6-10 | Detailed plan with edge cases |
| Complex | 10+ | Recommend splitting into sub-issues (epic) |

### Phase 4: Implement

Work happens in an isolated worktree following TDD:

1. **RED**: Write failing test
2. **GREEN**: Minimum code to pass
3. **REFACTOR**: Improve while green
4. **MUTATE**: Scoped mutation tests (>= 80%)

At **MILESTONE** checkpoints (user flows complete): Run `/milestone` for E2E tests.

### Phase 5: Code Review & PR

| Command | Purpose |
|---------|---------|
| `/issue <n> review` | Run code review checklist, create PR |

This command:
1. Runs all checks (tests, lint, build, mutation, E2E)
2. Identifies tech debt (tracked in output, **not created as issues yet**)
3. Creates PR linked to the issue

### Phase 6: PR Review (Human Decision Point)

| Command | Purpose |
|---------|---------|
| `/pr-review <n>` | Review PR against coding standards |
| `/pr-review <n> accept` | Merge PR, close issue, create tech debt issues, cleanup |
| `/pr-review <n> reject "feedback"` | Create rework task list from feedback |

**On Accept:**
- Squash merge to main
- Delete remote branch
- Close linked issues
- Prompt to create tech debt issues for deferred items
- **Remove local worktree**
- Return to main

**On Reject:**
- Parse feedback into actionable rework tasks
- Create TodoWrite task list
- Agent works through rework
- Returns to `/issue <n> review` when done

---

## Epics (Complex Features)

For work requiring 10+ tasks or multiple related issues, use an **epic**:

### Epic Structure

```
roadmap/
└── {epic-name}/
    ├── epic.md           # Epic overview, links to sub-issues
    ├── NNN-phase.md      # Phase plans (optional, for very large epics)
    └── reviews/          # Code review records
```

### Epic Workflow

1. Create parent GitHub issue with `epic` label
2. Break into sub-issues, each linked to parent
3. Each sub-issue follows the standard workflow
4. Epic tracks overall progress

| Command | Purpose |
|---------|---------|
| `/prepare-plan` | Prepare epic phase for implementation |
| `/review-plan` | Review epic phase compliance |

---

## Worktree Management

All work happens in isolated worktrees for parallel development.

### Structure

```
C:\Users\User\git\jcollard\
├── LuaInTheWeb/                    # Main worktree (main branch)
├── LuaInTheWeb-issue-42/           # Worktree for issue #42
└── LuaInTheWeb-issue-15/           # Worktree for issue #15
```

### Commands

| Command | Purpose |
|---------|---------|
| `/worktree list` | List all active worktrees |
| `/worktree create <n>` | Create worktree for issue #n |
| `/worktree remove <n>` | Remove worktree for issue #n |
| `/worktree status` | Show status of all worktrees |

### Lifecycle

1. **Created**: Automatically by `/issue <n> begin` (after plan approval)
2. **Used**: Agent works in worktree, separate Claude Code session
3. **Removed**: Automatically by `/pr-review <n> accept` after merge

---

## Tech Debt Handling

Tech debt follows a **identify → decide → create** flow:

| Phase | What Happens |
|-------|--------------|
| `/code-review` | Tech debt identified and listed in output |
| `/pr-review <n>` | Tech debt shown in review summary |
| Work continues | May fix tech debt before accept |
| `/pr-review <n> accept` | Prompted: "Create issues for deferred tech debt?" |

This prevents:
- Creating issues for things fixed in same PR
- Creating issues for rejected PRs
- Noise from premature issue creation

---

## Development Practices

### TDD Cycle (Red-Green-Refactor-Mutate)

1. **RED**: Write failing test first
2. **GREEN**: Minimum code to pass
3. **REFACTOR**: Improve while green
4. **MUTATE**: Scoped mutation tests (>= 80%)

### Checkpoints

**After each implementation item:**
- [ ] Tests pass
- [ ] `npm run test:mutation:scope "path/to/files/**"` >= 80%

**At MILESTONE markers:**
- [ ] Run `/milestone`
- [ ] E2E tests written and passing

**Before PR (`/issue <n> review`):**
- [ ] All tests pass: `npm run test`
- [ ] Full mutation: `npm run test:mutation` > 80%
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] E2E passes: `npm run test:e2e`

---

## Quick Reference

| I want to... | Command |
|--------------|---------|
| See project status | `/status` |
| Start next available issue | `/issue next` |
| Start a specific issue | `/issue <n> begin` |
| Evaluate an unclear issue | `/issue <n> eval` |
| Create PR for my work | `/issue <n> review` |
| Review a PR | `/pr-review <n>` |
| Merge an approved PR | `/pr-review <n> accept` |
| Reject PR with feedback | `/pr-review <n> reject "feedback"` |
| See full workflow | `/workflow` |
| See TDD guidelines | `/tdd` |
| See mutation testing guide | `/mutation-test` |
| List worktrees | `/worktree list` |

---

## Command Reference

### Issue Management
- `/issue <n>` - View issue details and complexity
- `/issue <n> eval` - Evaluate and define unclear issue
- `/issue <n> begin` - Plan, approve, then start work
- `/issue <n> review` - Code review and create PR
- `/issue next` - Auto-select next issue
- `/issue next <type>` - Auto-select by type

### PR Management
- `/pr-review <n>` - Review PR
- `/pr-review <n> accept` - Merge, cleanup, create tech debt
- `/pr-review <n> reject "feedback"` - Create rework tasks

### Epic Management (Complex Features)
- `/prepare-plan` - Prepare epic phase
- `/review-plan` - Review epic phase
- `/begin` - Start epic phase implementation

### Worktree Management
- `/worktree list` - List worktrees
- `/worktree create <n>` - Create worktree
- `/worktree remove <n>` - Remove worktree
- `/worktree status` - Show worktree status

### Development Guidelines
- `/workflow` - Full workflow reference
- `/tdd` - TDD guidelines
- `/mutation-test` - Mutation testing guidelines
- `/e2e` - E2E testing guidelines
- `/code-review` - Code review checklist
- `/milestone` - E2E checkpoint
