# Issue Command

Work with GitHub issues. Fetch details, assess complexity, and begin implementation.

> ⚠️ **Epic Detection:** This command automatically detects epics and redirects to `/epic`.

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

---

## Argument Parsing

Parse `$ARGUMENTS`:
- First token: Issue number OR "next" keyword
- Second token (optional): Subcommand (`begin`, `review`, `eval`) OR type filter (if first token is "next")

---

## Epic Detection (REQUIRED)

**Before routing**, check if the issue is an epic. An issue is an **epic** if its body contains `## Sub-Issues`.

```bash
gh issue view <number> --json body | node scripts/jq.js ".body"
```

**If the body contains `## Sub-Issues`**, output:

```
## This is an Epic

Issue #<number> is an epic with sub-issues. Use the `/epic` command instead:

| Command | Purpose |
|---------|---------|
| `/epic <number>` | View epic overview and progress |
| `/epic <number> begin` | Start the epic |
| `/epic <number> next` | Work on next sub-issue |
| `/epic <number> status` | View dependency graph |

**Run:** `/epic <number>` to continue.
```

Then **STOP** - do not proceed to subcommand routing.

---

## Routing

Based on the parsed arguments, use the **Read tool** to load the appropriate subcommand file, then follow its instructions:

| Arguments | Action |
|-----------|--------|
| `next` or `next <type>` | Read `.claude/commands/issue/next.md` |
| `<number> begin` | Read `.claude/commands/issue/begin.md` |
| `<number> eval` | Read `.claude/commands/issue/eval.md` |
| `<number> review` | Read `.claude/commands/issue/review.md` |
| `<number>` (no subcommand) | Read `.claude/commands/issue/view.md` |

After reading the file, execute the instructions with the issue number from `$ARGUMENTS`.

---

## Error Handling

| Error | Response |
|-------|----------|
| No arguments | "Usage: `/issue <number>`, `/issue <number> begin`, `/issue next`" |
| Issue not found | "Issue #<number> not found. Check the issue number and try again." |
| Unknown subcommand | "Unknown subcommand '<cmd>'. Available: begin, review, eval" |
| Invalid type filter | "Unknown type '<type>'. Available: tech-debt, bug, enhancement, roadmap" |
| **Is an epic** | Redirect to `/epic <number>` (see Epic Detection above) |
