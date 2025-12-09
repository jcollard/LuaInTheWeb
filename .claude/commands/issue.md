# Issue Command

Work with GitHub issues. Fetch details, assess complexity, and begin implementation.

## Usage

```
/issue <number>           # Show issue details + complexity assessment
/issue <number> begin     # Create branch and start working on the issue
/issue <number> review    # Create PR for the issue and run code review
/issue <number> eval      # Evaluate issue: estimate priority/effort/type, make concrete
/issue next               # Auto-select next issue (highest priority Todo)
/issue next <type>        # Auto-select next issue of specific type
```

**Type filter options:** `tech-debt`, `bug`, `enhancement`, `roadmap`

## Arguments

The command accepts an issue number (or "next") and optional subcommand:
- `$ARGUMENTS` contains the full argument string (e.g., "13", "13 begin", "next", or "next tech-debt")

Parse the arguments:
- First token: Issue number OR "next" keyword
- Second token: Subcommand (optional: "begin", "review", "eval") OR type filter (if first token is "next")

If the first token is "next":
- If second token exists and is a valid type (`tech-debt`, `bug`, `enhancement`, `roadmap`): filter by that type
- If no second token: fetch all types (highest priority Todo)
- Jump to **Step 7: Auto-Select Next Issue**

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

### 5a. Check Worktree Context

**FIRST**, determine if we're in a worktree and if the context is appropriate:

```bash
# Get current worktree path
git rev-parse --show-toplevel

# Check if this is a worktree (not the main repo)
git rev-parse --git-common-dir
```

**Worktree Detection Logic:**

1. **In issue-specific worktree** (path contains `issue-<n>`):
   - If `<n>` matches the requested issue: Proceed normally
   - If `<n>` doesn't match: Warn and suggest using the correct worktree

2. **In main worktree** (primary repo):
   - Suggest creating a worktree for parallel work (optional)
   - Proceed with branch creation if user continues

**If in wrong worktree:**

```
## Wrong Worktree

You're in the worktree for issue #<current>, but trying to work on issue #<requested>.

**Options:**
- Switch to the correct worktree: `cd ../LuaInTheWeb-issue-<requested>`
- Create a new worktree: `/worktree create <requested>`
- Or proceed here anyway (not recommended for parallel work)
```

**If in main worktree (optional suggestion):**

```
💡 **Tip**: For parallel development, consider using a worktree:
   `/worktree create <number>` - then open a new Claude Code session there

Continuing in main worktree...
```

### 5b. Create Branch from Issue

Create and checkout a branch linked to the issue:

```bash
gh issue develop <number> --checkout
```

This creates a branch named `<number>-<issue-title-slug>` and checks it out.
The branch is automatically linked to the issue for tracking.

If the branch already exists, checkout the existing branch instead:
```bash
git checkout <number>-<issue-title-slug>
```

### 5c. Update Project Status

Update the issue status to "In Progress" in the GitHub Project:

```bash
# Get the project item ID for this issue
gh project item-list 3 --owner jcollard --format json

# Find the item matching the issue number, then update its status
# Use gh project item-edit with the item ID and field ID
```

The project uses these Status values:
- `Concept` (id: f53885f8) - Needs more definition
- `Todo` (id: f75ad846) - Ready to work on
- `In Progress` (id: 47fc9ee4) - Actively being worked on
- `Done` (id: 98236657) - Completed

**Note**: Project field updates require knowing the item ID. If the issue isn't in the project yet, add it first:
```bash
gh project item-add 3 --owner jcollard --url "https://github.com/jcollard/LuaInTheWeb/issues/<number>"
```

### 5d. Inject Development Context

Run these commands to inject full development guidelines:

```
/tdd
```

This ensures the TDD cycle (Red-Green-Refactor-Mutate) guidelines are loaded.

### 5e. For Simple Issues (1-3 tasks)

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

### 5f. For Medium Issues (4-5 tasks)

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

### 5g. For Complex Issues (6+ tasks or architectural)

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

### 6b.1. Update Project Status to Review

Update the issue status to reflect it's in review (optional - can stay "In Progress" until merged):

The project will auto-update to "Done" when the issue is closed via the PR merge, if you have GitHub's built-in automation enabled.

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

## Step 6.5: Evaluate Issue (Eval Mode)

If subcommand is "eval" (`/issue 13 eval`):

This mode analyzes an issue to estimate its metadata fields and make the issue more actionable. The evaluation should be thoughtful and genuine - only raise questions, concerns, or suggestions when they are truly relevant.

### 6.5a. Fetch and Display Issue

Fetch the full issue details:

```bash
gh issue view <number> --json number,title,body,labels,state,createdAt
```

Display the current state:

```
## Evaluating Issue #<number>: <title>

**Current Labels**: <labels or "None">
**State**: <state>
**Created**: <date>

### Current Description
<full body>
```

### 6.5b. Analyze and Estimate Fields

Carefully read the issue and estimate:

#### Priority (P0-Critical to P3-Low)

| Priority | Criteria |
|----------|----------|
| P0-Critical | System broken, security issue, data loss, blocks all users |
| P1-High | Major functionality broken, significant user impact, blocking other work |
| P2-Medium | Important but not urgent, noticeable user impact, should be done soon |
| P3-Low | Nice to have, minor improvement, can wait |

#### Effort (T-shirt sizing)

| Effort | Criteria |
|--------|----------|
| XS | < 1 hour, trivial change, single file |
| S | 1-4 hours, simple change, 1-3 files |
| M | Half day to full day, moderate complexity, multiple files |
| L | 2-3 days, significant work, architectural consideration |
| XL | Week+, major feature, multiple components, needs planning |

#### Type

| Type | Indicators |
|------|------------|
| Bug | Something is broken, unexpected behavior, error, regression |
| Feature | New functionality, new capability, user-facing addition |
| Tech Debt | Code quality, refactoring, cleanup, performance, dependencies |
| Docs | Documentation, README, comments, examples |

### 6.5c. Assess Issue Clarity

Determine if the issue is actionable as written:

**Clear Issue Indicators:**
- Specific problem or goal described
- Steps to reproduce (for bugs)
- Acceptance criteria or definition of done
- Relevant file paths or code references
- Enough context to start work

**Unclear Issue Indicators:**
- Vague or ambiguous description
- Missing steps to reproduce
- Multiple unrelated concerns bundled together
- No clear success criteria
- Missing context about where/how

### 6.5d. Formulate Response

Output the evaluation:

```
## Issue Evaluation: #<number>

### Estimated Fields

| Field | Estimate | Reasoning |
|-------|----------|-----------|
| **Priority** | <P0-P3> | <brief reason based on impact/urgency> |
| **Effort** | <XS-XL> | <brief reason based on scope/complexity> |
| **Type** | <type> | <brief reason based on content> |
```

### 6.5e. Make Issue Concrete (if needed)

If the issue description could be improved, suggest a more concrete version:

```
### Suggested Improvements

The issue could be made more actionable. Here's a suggested revision:

---

<rewritten issue body that is clearer and more actionable>

---
```

**Guidelines for rewriting:**
- Keep the original intent
- Add structure (problem, solution, acceptance criteria)
- Be specific about what needs to change
- Include relevant file paths if known
- Add steps to reproduce for bugs
- Only rewrite if it genuinely adds value - skip this section if the issue is already clear

### 6.5f. Questions (Only If Genuinely Needed)

**IMPORTANT**: Only include this section if there are genuine ambiguities that would block implementation. Do NOT ask questions just to fill this section.

If questions are needed:

```
### Questions

Before this issue can be worked on, the following should be clarified:

1. <genuine question about scope, approach, or requirements>
2. <another question if needed>
```

Examples of valid questions:
- "Should the fix maintain backward compatibility with existing saved data?"
- "Is this a user-facing change that needs documentation?"
- "Which browsers need to be supported?"

Do NOT ask obvious questions or questions whose answers are in the issue.

### 6.5g. Concerns (Only If Real)

**IMPORTANT**: Only include this section if there are genuine concerns that should be considered. Do NOT manufacture concerns.

If concerns exist:

```
### Concerns

⚠️ <genuine concern about approach, risk, or trade-off>
```

Examples of valid concerns:
- "This change might affect performance in the hot path"
- "The proposed approach could break existing integrations"
- "This duplicates functionality in <other component>"

### 6.5h. Suggestions (Only If Valuable)

**IMPORTANT**: Only include this section if you have genuinely useful suggestions. Do NOT add suggestions just to have something.

If suggestions exist:

```
### Suggestions

💡 <actionable suggestion that adds value>
```

Examples of valid suggestions:
- "Consider combining this with issue #X which addresses the same area"
- "The <existing utility> could be extended to handle this case"
- "Adding a test for the edge case mentioned would prevent regression"

### 6.5i. Offer to Apply Changes

End with available actions:

```
---

**Actions available:**
- **Apply estimates**: I can update the issue's project fields with these estimates
- **Update description**: I can apply the suggested improvements to the issue body
- **Add labels**: I can add appropriate labels based on the type

Would you like me to apply any of these changes?
```

### 6.5j. Applying Changes (if requested)

If user wants to apply estimates, update the project board fields:

```bash
# Get project item ID
gh project item-list 3 --owner jcollard --format json

# Update Priority field (field ID: PVTSSF_lADOCQkuPc4A4Q2PzgfZvgI)
gh project item-edit --project-id <project-id> --id <item-id> --field-id PVTSSF_lADOCQkuPc4A4Q2PzgfZvgI --single-select-option-id <priority-option-id>

# Update Effort field
gh project item-edit --project-id <project-id> --id <item-id> --field-id <effort-field-id> --single-select-option-id <effort-option-id>

# Update Type field
gh project item-edit --project-id <project-id> --id <item-id> --field-id <type-field-id> --single-select-option-id <type-option-id>
```

If user wants to update the description:

```bash
gh issue edit <number> --body "<updated body>"
```

If user wants to add labels:

```bash
gh issue edit <number> --add-label "<type>"
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

### Example: Evaluating an Issue

```
/issue 25 eval

## Evaluating Issue #25: Improve error messages for invalid Lua syntax

**Current Labels**: None
**State**: Open
**Created**: Dec 8, 2025

### Current Description
When users enter invalid Lua code, the error messages are not helpful. We should improve them.

---

## Issue Evaluation: #25

### Estimated Fields

| Field | Estimate | Reasoning |
|-------|----------|-----------|
| **Priority** | P2-Medium | Improves UX but not blocking functionality |
| **Effort** | M | Need to parse wasmoon errors and map to user-friendly messages |
| **Type** | Feature | Adding new capability (better error messages) |

### Suggested Improvements

The issue could be made more actionable. Here's a suggested revision:

---

## Problem

When users enter invalid Lua syntax, wasmoon returns technical error messages that are hard for beginners to understand.

**Example current error:**
`[string "..."]:1: syntax error near 'end'`

## Proposed Solution

1. Intercept Lua compilation/runtime errors from wasmoon
2. Parse the error message to extract:
   - Line number
   - Error type (syntax, runtime, etc.)
   - Relevant code context
3. Display user-friendly error with:
   - Clear description of what went wrong
   - Suggestion for how to fix it
   - Highlight the problematic line

## Acceptance Criteria

- [ ] Syntax errors show friendly message with line number
- [ ] Common errors (missing `end`, unclosed string, etc.) have specific help text
- [ ] Error panel highlights the relevant line in the editor

---

### Questions

Before this issue can be worked on, the following should be clarified:

1. Should errors be localized or English-only for now?

---

**Actions available:**
- **Apply estimates**: I can update the issue's project fields with these estimates
- **Update description**: I can apply the suggested improvements to the issue body
- **Add labels**: I can add appropriate labels based on the type

Would you like me to apply any of these changes?
```

### Example: Eval with No Questions/Concerns Needed

```
/issue 18 eval

## Evaluating Issue #18: Remove unused CSS classes in LuaPlayground

**Current Labels**: tech-debt
**State**: Open
**Created**: Dec 7, 2025

### Current Description
The LuaPlayground.module.css file has accumulated unused CSS classes over time.
Clean up: .oldHeader, .deprecatedButton, .unusedWrapper

---

## Issue Evaluation: #18

### Estimated Fields

| Field | Estimate | Reasoning |
|-------|----------|-----------|
| **Priority** | P3-Low | Code cleanup, no user impact |
| **Effort** | XS | Simple deletion of 3 known classes |
| **Type** | Tech Debt | Code cleanup task |

The issue is already well-defined with specific classes to remove. No improvements needed.

---

**Actions available:**
- **Apply estimates**: I can update the issue's project fields with these estimates
- **Add labels**: I can add appropriate labels based on the type

Would you like me to apply any of these changes?
```

---

## Error Handling

| Error | Response |
|-------|----------|
| No issue number provided | "Usage: `/issue <number>`, `/issue <number> begin`, `/issue next`, or `/issue next <type>`" |
| Issue not found | "Issue #<number> not found. Check the issue number and try again." |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: begin, review, eval" |
| Invalid type filter | "Unknown type '<type>'. Available: tech-debt, bug, enhancement, roadmap" |
| GitHub CLI not available | "GitHub CLI (gh) is required. Install from https://cli.github.com" |

---

## Step 7: Auto-Select Next Issue (Next Mode)

Supports two modes:
- `/issue next` - Pick highest priority "Todo" issue (any type)
- `/issue next <type>` - Pick highest priority "Todo" issue of specific type

**Valid types:** `tech-debt`, `bug`, `enhancement`, `roadmap`

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

### 7b. Fetch Issues from Project Board

If on `main` or `master`, fetch open issues with their project status and priority:

```bash
# Fetch issues - optionally filter by label
# Without type filter:
gh issue list --state open --json number,title,body,labels,createdAt --limit 20

# With type filter (e.g., tech-debt):
gh issue list --label "<type>" --state open --json number,title,body,labels,createdAt --limit 20
```

Then get project data to check status and priority:

```bash
# Get project items with status and priority fields
gh project item-list 3 --owner jcollard --format json --limit 100
```

### 7b.1 Filter and Sort Issues

1. **Filter out non-Todo issues**: Skip issues with project status "Concept", "In Progress", or "Done"
   - Only include issues with status "Todo" (id: f75ad846)
   - Issues not in the project are treated as "Todo" candidates

2. **Sort by Priority**: Order by Priority field (P0-Critical first, then P1, P2, P3, then unset)
   - P0-Critical > P1-High > P2-Medium > P3-Low > (no priority)
   - Within same priority, sort by creation date (oldest first)

If no matching issues found:

```
## No Issues Available

<If type filter was used:>
There are no open <type> issues in "Todo" status.

<If no type filter:>
There are no open issues in "Todo" status.

**Options:**
- Run `/status` to see all project items and their status
- Check issues in "Concept" status that may need definition
- Run `/issue next <type>` to filter by a specific type
```

Then STOP.

### 7c. Analyze Issues for Clarity

For each issue (in priority order), check if it needs clarification by looking for:

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

Find the first issue (by priority order) that doesn't have clarity blockers.

If all issues need clarification:

```
## All Issues Need Clarification

Found <count> issues in "Todo" status, but all need clarification before work can begin:

| # | Title | Priority | Blocker |
|---|-------|----------|---------|
| <number> | <title> | <priority> | <reason> |
...

**Options:**
- Pick one to clarify: `/issue <number>` to view details
- Add clarification to an issue on GitHub, then run `/issue next` again
- Move unclear issues to "Concept" status in the project board
```

Then STOP.

### 7e. Display Selected Issue

When a clear issue is found:

```
## Auto-Selected Issue #<number>

**Title**: <title>
**Priority**: <priority or "Not set">
**Labels**: <labels>
**Created**: <date>

<If type filter was used:>
**Filter**: <type>

### Description
<body - first 500 chars>

### Selection Criteria
✓ Status: Todo
✓ Priority: <priority> (highest available)
✓ Issue has clear requirements
✓ No clarification labels
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

### When Issues Available (Any Type)

```
/issue next

## Checking for Current Work...
Current branch: main ✓

## Fetching Issues from Project Board...
Found 5 open issues in "Todo" status.

## Sorting by Priority...
| # | Title | Priority | Type |
|---|-------|----------|------|
| #15 | Remove deprecated API calls | P1-High | tech-debt |
| #22 | Add dark mode toggle | P2-Medium | enhancement |
| #19 | Fix input validation | P2-Medium | bug |

## Analyzing Issues for Clarity...
- #15: "Remove deprecated API calls" - ✓ Clear

## Auto-Selected Issue #15

**Title**: Remove deprecated API calls
**Priority**: P1-High
**Labels**: tech-debt
**Created**: Dec 5, 2025

### Description
Several API calls in `src/utils/api.ts` use deprecated endpoints...

### Selection Criteria
✓ Status: Todo
✓ Priority: P1-High (highest available)
✓ Issue has clear requirements
✓ No clarification labels

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

### With Type Filter

```
/issue next bug

## Checking for Current Work...
Current branch: main ✓

## Fetching Issues from Project Board...
Filtering by type: bug
Found 2 open bug issues in "Todo" status.

## Sorting by Priority...
| # | Title | Priority |
|---|-------|----------|
| #19 | Fix input validation | P2-Medium |
| #23 | Handle edge case in parser | P3-Low |

## Analyzing Issues for Clarity...
- #19: "Fix input validation" - ✓ Clear

## Auto-Selected Issue #19

**Title**: Fix input validation
**Priority**: P2-Medium
**Labels**: bug
**Created**: Dec 6, 2025
**Filter**: bug

### Description
The input validation in the form component doesn't handle...

### Selection Criteria
✓ Status: Todo
✓ Priority: P2-Medium (highest available for type: bug)
✓ Issue has clear requirements
✓ No clarification labels

## Starting Issue #19: Fix input validation

### Branch Created
Created and checked out branch: 19-fix-input-validation

### Tasks
1. [ ] Add validation for empty input
2. [ ] Add validation for special characters
3. [ ] Update tests

Starting with task 1...
```
