# Issue Command

Work with GitHub issues. Fetch details, assess complexity, and begin implementation.

## Usage

```
/issue <number>           # Show issue details + complexity assessment
/issue <number> begin     # Start working on the issue
```

## Arguments

The command accepts an issue number and optional subcommand:
- `$ARGUMENTS` contains the full argument string (e.g., "13" or "13 begin")

Parse the arguments:
- First token: Issue number (required)
- Second token: Subcommand (optional, currently only "begin")

---

## Step 1: Fetch Issue Details

```bash
gh issue view <number> --json number,title,body,labels,state,createdAt
```

If the issue doesn't exist, report the error and stop.

---

## Step 2: Display Issue Summary

Output the issue information:

```
## Issue #<number>: <title>

**Labels**: <labels>
**State**: <state>
**Created**: <date>

### Description
<body - first 500 chars or until "## " header>
```

---

## Step 3: Analyze Complexity

Parse the issue body to identify tasks and assess complexity.

### Task Identification

Look for:
- Numbered lists (1. 2. 3.)
- Bullet points (- or *)
- Headings that indicate separate work items
- Keywords: "fix", "add", "remove", "update", "create", "implement"

### Complexity Heuristics

| Factor | Simple | Complex |
|--------|--------|---------|
| Tasks identified | 1-3 | 4+ |
| Components mentioned | 1-2 | 3+ |
| New files needed | No | Yes |
| Architectural keywords | No | Yes (refactor, redesign, architecture) |
| Labels | bug, fix | feature, enhancement, refactor |

### Complexity Output

```
### Complexity Assessment

**Level**: Simple | Medium | Complex
**Tasks identified**: <count>
**Components affected**: <list or estimate>

**Reasoning**: <brief explanation>
```

---

## Step 4: Suggest Next Steps (Info Mode)

If no subcommand provided (`/issue 13`), end with:

```
---

**Next steps:**
- Run `/issue <number> begin` to start working on this issue
- Or explore the codebase first to understand the scope
```

---

## Step 5: Begin Implementation (Begin Mode)

If subcommand is "begin" (`/issue 13 begin`):

### 5a. Inject Development Context

**FIRST**, run these commands to inject full development guidelines:

```
/tdd
```

This ensures the TDD cycle (Red-Green-Refactor-Mutate) guidelines are loaded.

### 5b. For Simple Issues (1-3 tasks)

Create a TodoWrite task list and start immediately:

```
## Starting Issue #<number>

**Complexity**: Simple - Creating task list directly

### Implementation Plan
```

Use TodoWrite to create tasks based on identified work items.

Then begin implementation following the standard development flow:

### Development Practices (Always Apply)

**TDD Cycle (Red-Green-Refactor-Mutate):**
1. **RED**: Write a failing test first
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while tests pass
4. **MUTATE**: Run scoped mutation tests on changed files

**After each task:**
```bash
# Run scoped mutation tests
npm run test:mutation:scope "src/components/AffectedComponent/**"
```
- Mutation score must be >= 80% on new/modified files

**E2E Tests (if user-facing changes):**
- Add E2E tests for new user flows
- Run `npm run test:e2e` before completing

**Before marking issue complete:**
- [ ] All unit tests pass: `npm run test`
- [ ] Scoped mutation tests pass (>= 80%)
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] E2E tests pass (if applicable): `npm run test:e2e`

### 5c. For Medium Issues (4-5 tasks)

Create a brief plan before starting:

```
## Starting Issue #<number>

**Complexity**: Medium - Brief planning first

### Approach
1. <high-level step 1>
2. <high-level step 2>
3. <high-level step 3>

### Files to Modify
- <file1>
- <file2>

### Edge Cases
- <edge case 1>
- <edge case 2>
```

Then create TodoWrite tasks and begin implementation following the **Development Practices** above.

### 5d. For Complex Issues (6+ tasks or architectural)

Recommend creating a roadmap phase instead:

```
## Issue #<number> - Complex Issue Detected

**Complexity**: Complex
**Recommendation**: Consider creating a roadmap phase for this work.

### Why?
- <reasons based on analysis>

### Options:
1. Create a roadmap phase: Better for tracking, TDD compliance, review workflow
2. Proceed anyway: `/issue <number> begin --force`

Run `/new-feature` to create a proper roadmap phase for this work.
```

---

## Examples

### Example: Simple Bug Fix

```
/issue 13

## Issue #13: REPL UX issues in /editor context

**Labels**: bug, ux
**State**: Open
**Created**: Dec 8, 2025

### Description
The REPL component has several UX issues when embedded in the `/editor` IDE layout...

### Complexity Assessment

**Level**: Simple
**Tasks identified**: 3
**Components affected**: LuaRepl.tsx

**Reasoning**: Three distinct but related fixes in a single component. No architectural changes needed.

---

**Next steps:**
- Run `/issue 13 begin` to start working on this issue
```

### Example: Starting Work

```
/issue 13 begin

## Starting Issue #13: REPL UX issues

**Complexity**: Simple - Creating task list directly

### Tasks
[TodoWrite creates:]
1. [ ] Fix nested scrollbars in REPL panel
2. [ ] Remove unnecessary "Interactive REPL" and "Output" titles
3. [ ] Fix duplicate "Lua 5.4 REPL" welcome message

### Files to Modify
- src/components/LuaRepl/LuaRepl.tsx
- src/components/LuaRepl/LuaRepl.module.css (if needed)

Starting with task 1...
```

---

## Error Handling

| Error | Response |
|-------|----------|
| No issue number provided | "Usage: `/issue <number>` or `/issue <number> begin`" |
| Issue not found | "Issue #<number> not found. Check the issue number and try again." |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: begin" |
| GitHub CLI not available | "GitHub CLI (gh) is required. Install from https://cli.github.com" |
