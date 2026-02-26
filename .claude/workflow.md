# Project Workflow

> **Canonical Source**: This is the single source of truth for the project workflow.
> Run `/workflow` to inject this content into any session.

## Overview

All work is tracked in the [GitHub Project Board](https://github.com/users/jcollard/projects/3).

### Status Definitions

| Status | Meaning | Triggered By |
|--------|---------|--------------|
| **Concept** | Idea needs research/definition before it's actionable | Manual |
| **Todo** | Well-defined, ready to be worked on | `/issue <n> eval` |
| **Blocked** | Waiting on dependencies or external factors | Manual |
| **In Progress** | Actively being worked on | `worktree-create.py` |
| **Needs Review** | PR created, awaiting review | `/issue <n> review` |
| **Done** | Completed and merged | `/pr-review <n> accept` |

### Project Fields

| Field | Values |
|-------|--------|
| **Priority** | P0-Critical, P1-High, P2-Medium, P3-Low |
| **Effort** | XS, S, M, L, XL (t-shirt sizing) |
| **Type** | Feature, Bug, Tech Debt, Docs |
| **Plan** | Link to roadmap plan (for epics only) |

---

## Branch Policy

> **Never commit directly to main.** All changes must go through branches and pull requests.

This policy ensures:
- **Code review**: Every change is reviewed before merging
- **Issue tracking**: All work is linked to issues for traceability
- **Audit trail**: Complete history of decisions and discussions
- **CI validation**: All changes pass automated checks before merge

**Required workflow:**
1. All work must be associated with an issue
2. Create a feature branch (via worktree or manually)
3. Make changes in the feature branch
4. Create a pull request for review
5. Merge only after approval and CI passes

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
│  /issue <n>                   [Status: Todo]                         │
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
│       │                     Creates worktree → [Status: In Progress] │
│       ▼                                                              │
│  [TDD Work]                 ← Red-Green-Refactor-Mutate cycle        │
│       │                                                              │
│       ▼                                                              │
│  /issue <n> review          ← Code review + create PR                │
│       │                       → [Status: Needs Review]               │
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
│  [Status: Done]                                                      │
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
- Create TaskCreate task list
- Agent works through rework
- Returns to `/issue <n> review` when done

---

## Review Guidelines

> **IMPORTANT:** Before starting any code review (`/pr-review`, `/code-review`, or `/issue <n> review`),
> the reviewer MUST state the review criteria and confirm with the user before proceeding.

### Pre-Review Confirmation

Before reviewing, output this confirmation:

```
## Review Criteria Checklist

I will review this PR against the following criteria:

**Code Quality:**
- [ ] Read ALL changed files thoroughly
- [ ] Verify tests perform real testing (not just coverage)
- [ ] Check best practices are followed
- [ ] Identify DRY violations (duplicate code)
- [ ] Identify SOLID principle violations

**Architecture:**
- [ ] UI components are pure (no business logic)
- [ ] All logic extracted into custom hooks
- [ ] Proper separation of concerns

**TypeScript:**
- [ ] No `any` types
- [ ] Explicit return types on public functions
- [ ] Props interfaces defined

**Testing:**
- [ ] Tests accompany code changes
- [ ] AAA pattern used (Arrange-Act-Assert)
- [ ] Edge cases and error cases covered
- [ ] Tests are colocated with components
- [ ] Mutation score >= 80% on changed code

**Security:**
- [ ] No user input rendered as HTML without sanitization
- [ ] No secrets in code
- [ ] Input validation present at boundaries

**Additional Checks:**
- [ ] Error handling is explicit with user-friendly messages
- [ ] Performance considerations (unnecessary re-renders, memory leaks)
- [ ] Accessibility (ARIA labels, keyboard navigation)
- [ ] Naming is clear and intention-revealing

Shall I proceed with the review?
```

Wait for user confirmation before starting the review.

### Review Criteria Details

#### 1. Read All Files
- Examine every changed file in the PR
- Don't skip files based on assumptions
- Understand the full scope of changes

#### 2. Real Testing (Not Just Coverage)
Verify tests actually validate behavior:

| Bad (Coverage Only) | Good (Real Testing) |
|---------------------|---------------------|
| `expect(result).toBeDefined()` | `expect(result.name).toBe('expected')` |
| `expect(fn).toHaveBeenCalled()` | `expect(fn).toHaveBeenCalledWith(expectedArgs)` |
| Just checking no errors thrown | Checking specific return values and side effects |

#### 3. Best Practices
- Code follows project coding standards
- Consistent patterns used throughout
- No anti-patterns introduced

#### 4. DRY (Don't Repeat Yourself)
Look for:
- Duplicate code blocks that could be extracted
- Similar logic in multiple places
- Copy-pasted code with minor variations

#### 5. SOLID Principles

| Principle | Check For |
|-----------|-----------|
| **S**ingle Responsibility | Each function/class does one thing |
| **O**pen/Closed | Extended through composition, not modification |
| **L**iskov Substitution | Subtypes work where parent types expected |
| **I**nterface Segregation | No unused dependencies on interfaces |
| **D**ependency Inversion | Depend on abstractions, not concretions |

#### 6. Architecture Compliance
Per project standards:
- UI components contain NO business logic
- All logic lives in custom hooks
- Components are pure: props in, JSX out

#### 7. Test Quality Checks
- Tests should fail if the code breaks
- Tests cover the "what" not the "how"
- Mock only external dependencies
- Integration tests verify component interactions

#### 8. Security Review
- XSS: No `dangerouslySetInnerHTML` without sanitization
- Injection: User input validated before use
- Secrets: No API keys, passwords, or tokens in code
- External data: Validated at system boundaries

### Review Output Format

After reviewing, provide:

1. **Summary** - What the PR does
2. **Files Reviewed** - Table with assessment per file
3. **Blocking Issues** - Must fix before merge
4. **Suggestions** - Non-blocking improvements
5. **Positive Observations** - What the PR does well
6. **Checklist Results** - Status per category
7. **Recommendation** - APPROVE / REQUEST_CHANGES / COMMENT

---

## Issue Types: Regular vs Epic

**IMPORTANT:** Before starting work, identify the issue type:

| Issue Type | How to Identify | Command to Use |
|------------|-----------------|----------------|
| **Regular Issue** | No `## Sub-Issues` section | `/issue <n>` |
| **Epic** | Has `## Sub-Issues` section with linked issues | `/epic <n>` |

> ℹ️ **Using `/issue` on an epic will auto-redirect** to `/epic` with guidance.

---

## Epics (Complex Features)

For work requiring 10+ tasks or multiple related issues, use an **epic**:

### Epic Detection

An issue is an **epic** if its body contains:
```markdown
## Sub-Issues
- #60 - First sub-issue
- #61 - Second sub-issue
```

### Epic Workflow

```
/epic <n>           ← View epic overview & progress
/epic <n> begin     ← Start epic: create worktree + EPIC-<n>.md tracking
/epic <n> next      ← Start next sub-issue with epic context
/epic <n> status    ← Show dependency graph & progress
/epic <n> review    ← Create PR when all sub-issues complete
```

**Flow:**
1. `/epic <n> begin` - Creates epic worktree and tracking file
2. `/epic <n> next` - Starts first/next sub-issue (creates sub-worktree)
3. Work on sub-issue following standard TDD workflow
4. `/issue <n> review` - PR for sub-issue
5. Repeat steps 2-4 for each sub-issue
6. `/epic <n> review` - Final PR when all sub-issues merged

---

## Worktree Management

All work happens in isolated worktrees for parallel development.

### Structure

```
/home/user/git/
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

## Visual Verification

For user-facing changes, add a Visual Verification section to the issue to enable automated screenshot capture during PR review.

### Adding Visual Verification to an Issue

Add this section to your issue body:

```markdown
## Visual Verification
- /editor - Description of expected appearance
- /repl - Another route to capture
```

### Format

| Element | Description |
|---------|-------------|
| Route | Path to navigate (e.g., `/editor`, `/repl`) |
| Description | Optional note about expected state (after the route, separated by `-`) |

### What Happens

When you run `/issue <n> review`, the review script will:

1. **Check for Visual Verification section** in the issue body
2. **Build and start preview server** (reuses existing build if available)
3. **Capture screenshots** of each specified route (1280x720 viewport)
4. **Post screenshots** as a comment on the PR
5. **Continue normally** - this is non-blocking

### Example

Issue body:
```markdown
## Visual Verification
- /editor - Editor with welcome screen visible
- /repl - REPL with command prompt
```

During `issue-review.py` execution:
```
Running visual verification...
  Found 2 route(s) to capture
  ✓ /editor -> editor.png
  ✓ /repl -> repl.png
  [OK] Captured 2 screenshot(s)
  [OK] Screenshots posted to PR
```

### Notes

- Visual verification is **completely optional** - issues without the section skip it
- Screenshot capture is **non-blocking** - failures just log warnings
- Screenshots are saved to `.tmp/screenshots/` (gitignored)
- Useful for visual changes, new UI components, or layout modifications

---

## Tech Debt Handling

Tech debt follows a **identify → decide → create** flow:

> **IMPORTANT:** All issues created by agents must include `--project "LuaInTheWeb"` to ensure they appear on the [GitHub Project Board](https://github.com/users/jcollard/projects/3).

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
- [ ] Type check passes: `npx tsc -p lua-learning-website/tsconfig.app.json --noEmit 2>&1 | grep -v "@lua-learning/"` (must produce no output)
- [ ] Build succeeds: `npm run build` (may fail locally due to package issues — the tsc check above covers our code)
- [ ] E2E passes: `npm run test:e2e`

---

## Test Value Analysis

The workflow includes automated test value analysis at two points to ensure tests provide meaningful value.

### When It Runs

| Phase | Command | Behavior |
|-------|---------|----------|
| **Implementation** | `/issue <n> review` | **Blocking** - must fix or override |
| **PR Review** | `/pr-review <n>` | **Informational** - reviewer decides |

### Test Value Criteria

Tests are evaluated against these criteria:

| Criterion | HIGH Value | LOW Value (Blocking) |
|-----------|------------|----------------------|
| **AAA Pattern** | Clear Arrange-Act-Assert structure | No structure |
| **Meaningful Assertions** | Asserts specific values | Only `toBeDefined()` |
| **Tests Behavior** | Verifies outcomes | Only verifies existence |
| **No Duplicates** | Unique test purpose | Same behavior tested twice |
| **Test Names** | "should X when Y" | Vague ("test1", "works") |
| **Edge Cases** | Covers errors, boundaries | Only happy path |

### Blocking Issues

These issues **block PR creation** in `/issue <n> review`:
- Test has NO meaningful assertion (only `toBeDefined()`, `toBeTruthy()`)
- Test is exact duplicate of another test
- Test name is non-descriptive

To proceed despite blocking issues, type: `continue without fixing tests`

---

## Quick Reference

| I want to... | Command |
|--------------|---------|
| See project status | `/status` |
| **Regular Issues** | |
| Start next available issue | `/issue next` |
| Start a specific issue | `/issue <n> begin` |
| Evaluate an unclear issue | `/issue <n> eval` |
| Create PR for my work | `/issue <n> review` |
| **Epics (multi-issue features)** | |
| View epic progress | `/epic <n>` |
| Start an epic | `/epic <n> begin` |
| Work on next sub-issue | `/epic <n> next` |
| Epic dependency status | `/epic <n> status` |
| **PR Management** | |
| Review a PR | `/pr-review <n>` |
| Merge an approved PR | `/pr-review <n> accept` |
| Reject PR with feedback | `/pr-review <n> reject "feedback"` |
| **Other** | |
| See full workflow | `/workflow` |
| See TDD guidelines | `/tdd` |
| See mutation testing guide | `/mutation-test` |
| View tech debt | `/tech-debt` |
| List worktrees | `/worktree list` |

---

## Command Reference

### Issue Management (Regular Issues)
- `/issue <n>` - View issue details and complexity
- `/issue <n> eval` - Evaluate and define unclear issue
- `/issue <n> begin` - Plan, approve, then start work
- `/issue <n> review` - Code review and create PR
- `/issue next` - Auto-select next issue
- `/issue next <type>` - Auto-select by type

### Epic Management (Multi-Issue Features)

> Use `/epic` for issues with `## Sub-Issues` section

- `/epic <n>` - View epic overview and progress
- `/epic <n> begin` - Start epic: create worktree + tracking
- `/epic <n> next` - Start next sub-issue with context
- `/epic <n> status` - Show dependency graph and progress
- `/epic <n> review` - Create PR when all sub-issues complete

### PR Management
- `/pr-review <n>` - Review PR
- `/pr-review <n> accept` - Merge, cleanup, create tech debt
- `/pr-review <n> reject "feedback"` - Create rework tasks

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
- `/tech-debt` - View and manage tech debt items
