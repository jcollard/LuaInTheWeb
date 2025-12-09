# Issue Next

Auto-select the next issue to work on based on priority and status.

**Invoked by**: `/issue next` or `/issue next <type>`

**Input**: Optional type filter from `$ARGUMENTS`

**Valid types:** `tech-debt`, `bug`, `enhancement`, `roadmap`

---

## Step 1: Check Current Branch Status

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

---

## Step 2: Fetch Issues from Project Board

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

---

## Step 3: Filter and Sort Issues

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

---

## Step 4: Analyze Issues for Clarity

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

---

## Step 5: Select First Clear Issue

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

---

## Step 6: Display Selected Issue

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

---

## Step 7: Begin Work on Selected Issue

Automatically proceed to create the worktree using the Python script:

```bash
python scripts/worktree-create.py <number>
```

The script handles:
1. Checking if worktree already exists (reports path if so)
2. Fetching issue title from GitHub
3. Creating slugified branch name
4. Creating worktree with npm install and mutation cache seeding
5. Updating issue status to "In Progress" in GitHub Project

After script completes, instruct user to open new Claude Code session in worktree:

```
### Next Steps

Open a new Claude Code session in the worktree:
```bash
cd <worktree-path>
claude
```

Then run:
```bash
/issue <number> begin
```
```

When user opens new session in worktree and runs `/issue <number> begin` again, it will:
- Generate implementation plan
- Wait for approval
- Create/checkout branch
- Inject TDD context
- Create task list
- Begin implementation
