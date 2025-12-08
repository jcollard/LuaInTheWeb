# Issue Command

Work with GitHub issues. Fetch details, assess complexity, and begin implementation.

## Usage

```
/issue <number>           # Show issue details + complexity assessment
/issue <number> begin     # Create branch and start working on the issue
/issue <number> review    # Create PR for the issue and run code review
/issue next               # Auto-select and start next tech debt issue
```

## Arguments

The command accepts an issue number (or "next") and optional subcommand:
- `$ARGUMENTS` contains the full argument string (e.g., "13", "13 begin", or "next")

Parse the arguments:
- First token: Issue number OR "next" keyword
- Second token: Subcommand (optional: "begin" or "review")

If the first token is "next", jump directly to **Step 7: Auto-Select Next Issue**.

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

### 5a. Create Branch from Issue

**FIRST**, create and checkout a branch linked to the issue:

```bash
gh issue develop <number> --checkout
```

This creates a branch named `<number>-<issue-title-slug>` and checks it out.
The branch is automatically linked to the issue for tracking.

If the branch already exists, checkout the existing branch instead:
```bash
git checkout <number>-<issue-title-slug>
```

### 5b. Inject Development Context

Run these commands to inject full development guidelines:

```
/tdd
```

This ensures the TDD cycle (Red-Green-Refactor-Mutate) guidelines are loaded.

### 5c. For Simple Issues (1-3 tasks)

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

### 5d. For Medium Issues (4-5 tasks)

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

### 5e. For Complex Issues (6+ tasks or architectural)

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

## Step 6: Review and Create PR (Review Mode)

If subcommand is "review" (`/issue 13 review`):

### 6a. Run Code Review

First, run the code review checklist:

```
/code-review
```

This validates all tests pass, lint passes, and build succeeds.

### 6b. Create Pull Request

After code review passes, create a PR linked to the issue:

```bash
gh pr create --title "<Issue Title>" --body "$(cat <<'EOF'
## Summary
<Brief summary of changes - 1-3 bullet points>

## Test plan
<How to verify the changes work>

Fixes #<number>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

The `Fixes #<number>` syntax automatically closes the issue when the PR is merged.

### 6c. Output PR URL

After PR creation, output:

```
## PR Created for Issue #<number>

**PR URL**: <pr-url>

The PR is linked to issue #<number> and will auto-close it when merged.

**Next steps:**
- Review the PR on GitHub
- Request reviews if needed
- Merge when approved
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

### Branch Created
Created and checked out branch: 13-repl-ux-issues-in-editor-context

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

### Example: Creating PR for Issue

```
/issue 13 review

## Code Review for Issue #13

Running /code-review...
✓ All 634 tests pass
✓ Lint passes
✓ Build succeeds
✓ E2E tests pass

## Creating PR for Issue #13

Creating pull request...

## PR Created for Issue #13

**PR URL**: https://github.com/jcollard/LuaInTheWeb/pull/16

The PR is linked to issue #13 and will auto-close it when merged.

**Next steps:**
- Review the PR on GitHub
- Request reviews if needed
- Merge when approved
```

---

## Error Handling

| Error | Response |
|-------|----------|
| No issue number provided | "Usage: `/issue <number>`, `/issue <number> begin`, or `/issue next`" |
| Issue not found | "Issue #<number> not found. Check the issue number and try again." |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: begin, review, next" |
| GitHub CLI not available | "GitHub CLI (gh) is required. Install from https://cli.github.com" |

---

## Step 7: Auto-Select Next Issue (Next Mode)

If the first argument is "next" (`/issue next`):

### 7a. Check Current Branch Status

First, check if already working on an issue:

```bash
git branch --show-current
```

If the branch name matches the pattern `<number>-*` (e.g., `13-fix-repl-ux`), extract the issue number and report:

```
## Already Working on Issue

You're currently on branch `<branch-name>` which is linked to issue #<number>.

**Options:**
- Continue working on this issue
- Run `/issue <number> review` when ready to create a PR
- Switch to main and run `/issue next` again to pick a new issue:
  ```bash
  git checkout main && git pull
  ```
```

Then STOP - do not proceed further.

### 7b. Fetch Tech Debt Issues

If on `main` or `master`, fetch open tech debt issues sorted by creation date (oldest first):

```bash
gh issue list --label "tech-debt" --state open --json number,title,body,labels,createdAt --limit 10
```

If no tech debt issues found:

```
## No Tech Debt Issues Available

There are no open tech debt issues to work on.

**Options:**
- Run `/tech-debt` to review if there's hidden tech debt
- Check for other open issues: `gh issue list --state open`
```

Then STOP.

### 7c. Analyze Issues for Clarity

For each issue (starting from oldest), check if it needs clarification by looking for:

**Clarity Blockers (skip this issue):**
- Label: `needs-clarification`, `needs-discussion`, `blocked`, `question`
- Body contains: "TODO:", "TBD", "unclear", "need to decide", "options:", "should we"
- Body is empty or less than 50 characters
- Title contains: "?", "discuss", "investigate"

**Clear Issue Indicators (can proceed):**
- Has specific steps or acceptance criteria
- Has code snippets or file paths
- Has a `<!-- tech-debt-id: -->` marker
- Body length > 100 characters with actionable content

### 7d. Select First Clear Issue

Find the first issue that doesn't have clarity blockers.

If all issues need clarification:

```
## All Tech Debt Issues Need Clarification

Found <count> tech debt issues, but all need clarification before work can begin:

| # | Title | Blocker |
|---|-------|---------|
| <number> | <title> | <reason> |
...

**Options:**
- Pick one to clarify: `/issue <number>` to view details
- Add clarification to an issue on GitHub, then run `/issue next` again
```

Then STOP.

### 7e. Display Selected Issue

When a clear issue is found:

```
## Auto-Selected Issue #<number>

**Title**: <title>
**Created**: <date>
**Labels**: <labels>

### Description
<body - first 500 chars>

### Clarity Check
✓ Issue has clear requirements
✓ No clarification labels
✓ Actionable content detected
```

### 7f. Begin Work on Selected Issue

Automatically proceed to begin mode (same as `/issue <number> begin`):

1. Create and checkout branch:
```bash
gh issue develop <number> --checkout
```

2. Inject TDD context:
```
/tdd
```

3. Run complexity analysis and create task list (from Step 3 and Step 5)

4. Output:
```
## Starting Issue #<number>: <title>

### Branch Created
Created and checked out branch: <branch-name>

### Tasks
[TodoWrite creates tasks based on issue body]

Starting with task 1...
```

---

## Example: /issue next

### When Already on Issue Branch

```
/issue next

## Already Working on Issue

You're currently on branch `18-cleanup-unused-exports` which is linked to issue #18.

**Options:**
- Continue working on this issue
- Run `/issue 18 review` when ready to create a PR
- Switch to main and run `/issue next` again to pick a new issue
```

### When Tech Debt Available

```
/issue next

## Checking for Current Work...
Current branch: main ✓

## Fetching Tech Debt Issues...
Found 3 open tech debt issues.

## Analyzing Issues for Clarity...
- #15: "Remove deprecated API calls" - ✓ Clear
- #19: "Investigate performance issues?" - ✗ Needs investigation
- #21: "TBD: Refactor state management" - ✗ Has TBD marker

## Auto-Selected Issue #15

**Title**: Remove deprecated API calls
**Created**: Dec 5, 2025
**Labels**: tech-debt, medium

### Description
Several API calls in `src/utils/api.ts` use deprecated endpoints...

### Clarity Check
✓ Issue has clear requirements
✓ No clarification labels
✓ Actionable content detected

## Starting Issue #15: Remove deprecated API calls

### Branch Created
Created and checked out branch: 15-remove-deprecated-api-calls

### Tasks
1. [ ] Identify all deprecated API calls in src/utils/api.ts
2. [ ] Update to new endpoints
3. [ ] Add tests for updated calls
4. [ ] Run mutation tests

Starting with task 1...
```
