# Epic Command

Manage GitHub issue-based epics. Start epics, track progress, and coordinate multi-issue feature development.

## Usage

```
/epic <number>           # Show epic overview & progress
/epic <number> begin     # Start epic: create branch, worktree, and EPIC-<n>.md
/epic <number> next      # Start next sub-issue with epic context
/epic <number> status    # Show detailed status with dependency graph
/epic <number> review    # Create PR to main when all sub-issues complete
```

---

## Argument Parsing

Parse `$ARGUMENTS`:
- First token: Epic issue number (required)
- Second token (optional): Subcommand (`begin`, `next`, `status`, `review`)

---

## Routing

Based on the parsed arguments, use the **Read tool** to load the appropriate subcommand file, then follow its instructions:

| Arguments | Action |
|-----------|--------|
| `<number> begin` | Read `.claude/commands/epic/begin.md` |
| `<number> next` | Read `.claude/commands/epic/next.md` |
| `<number> status` | Read `.claude/commands/epic/status.md` |
| `<number> review` | Read `.claude/commands/epic/review.md` |
| `<number>` (no subcommand) | Read `.claude/commands/epic/view.md` |

After reading the file, execute the instructions with the epic number from `$ARGUMENTS`.

---

## Epic Detection

Before routing, verify the issue is an epic (not a regular issue or sub-issue).

**An issue is an epic if its body contains:**
```markdown
## Sub-Issues
```
With issue references like `#60`, `#61`, etc.

**Check:**
```bash
gh issue view <number> --json body | node scripts/jq.js ".body"
```

If the issue body does NOT contain `## Sub-Issues`, output:

```
## Not an Epic

Issue #<number> is not an epic. Epics must have a "## Sub-Issues" section listing child issues.

**To make this an epic**, edit the issue body to include:
```markdown
## Sub-Issues
- #<child-issue-1>
- #<child-issue-2>
```

Then run `/epic <number>` again.

**Or use the regular issue commands:**
- `/issue <number>` - View issue details
- `/issue <number> begin` - Start working on issue
```

Then STOP - do not proceed to subcommand routing.

---

## Error Handling

| Error | Response |
|-------|----------|
| No arguments | "Usage: `/epic <number>`, `/epic <number> begin`, `/epic <number> next`" |
| Issue not found | "Issue #<number> not found. Check the issue number and try again." |
| Not an epic | See "Not an Epic" message above |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: begin, next, status, review" |
