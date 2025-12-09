# Epic Status

Show detailed epic status including dependency graph, progress log, and key decisions.

**Invoked by**: `/epic <number> status`

**Input**: Epic issue number from `$ARGUMENTS`

---

## Overview

The status command provides comprehensive epic information:
- Full sub-issue breakdown with detailed state
- Architecture decisions made during development
- Progress log with timeline
- Key files created/modified
- Open questions and blockers
- Dependency visualization (if defined)

This is more detailed than `/epic <n>` (view).

---

## Step 1: Gather All Information

### From GitHub:

```bash
# Epic issue details
gh issue view <number> --json title,body,state,labels,createdAt,updatedAt

# Each sub-issue details
gh issue view <sub-number> --json title,state,number,labels,assignees
```

### From EPIC.md (if in epic worktree):

```bash
cat EPIC.md
```

### From Git:

```bash
# List all branches related to this epic
git branch -a | grep -E "(epic-<number>|<sub-number>-)"

# List worktrees
git worktree list

# Recent commits on epic branch
git log epic-<number> --oneline -10
```

---

## Step 2: Build Status Report

```
## Epic #<number>: <title>

**Created**: <createdAt>
**Last Updated**: <updatedAt from EPIC.md or GitHub>
**Branch**: epic-<number>
**Worktree**: <path if exists>

---

### Progress Overview

```
[████████████░░░░░░░░] 60% (3/5 complete)
```

| Metric | Count |
|--------|-------|
| Total Sub-Issues | <count> |
| Completed | <count> |
| In Progress | <count> |
| Pending | <count> |
| Blocked | <count> |

---

### Sub-Issues Detail

| # | Title | Status | Assignee | Branch | PR |
|---|-------|--------|----------|--------|-----|
| #<sub1> | <title> | ✅ Complete | <user> | <branch> | #<pr> |
| #<sub2> | <title> | 🔄 In Progress | <user> | <branch> | - |
| #<sub3> | <title> | ⏳ Pending | - | - | - |
| #<sub4> | <title> | ❌ Blocked | - | - | - |

<If any blocked:>
#### Blocked Issues
- #<sub4>: <blocker reason from EPIC.md or "Unknown">

---

### Architecture Decisions

<From EPIC.md ## Architecture Decisions section>

<If none:>
(No architecture decisions documented yet)

<If has decisions:>
1. **<Decision Title>** (<date>)
   <Decision description>

2. **<Decision Title>** (<date>)
   <Decision description>

---

### Progress Log

<From EPIC.md ## Progress Log section>

<Timeline format:>
#### <date>
- <event>
- <event>

#### <earlier-date>
- <event>

---

### Key Files

<From EPIC.md ## Key Files section>

<If populated:>
| File | Purpose |
|------|---------|
| `<file-path>` | <description> |

<If empty:>
(No key files documented yet)

---

### Open Questions

<From EPIC.md ## Open Questions section>

<If any:>
1. <question>
2. <question>

<If none:>
(No open questions)

---

### Git Activity

**Recent commits on epic-<number>:**
```
<git log output - last 10 commits>
```

**Related branches:**
- `epic-<number>` (main epic branch)
<For each sub-issue branch:>
- `<sub>-<slug>` → <status: active/merged/deleted>

---

### Next Actions

<Based on current state:>

<If has pending sub-issues:>
**Next sub-issue ready**: #<next-sub> - <title>
```bash
/epic <number> next
```

<If sub-issue in progress:>
**Continue current work**: #<current-sub> - <title>
```bash
cd ../LuaInTheWeb-issue-<current-sub>
```

<If all complete:>
**Ready for final review!**
```bash
/epic <number> review
```

<If blocked:>
**Resolve blockers first:**
- <blocker and suggested resolution>
```

---

## Step 3: Dependency Graph (Optional)

If EPIC.md contains a `## Dependencies` section with relationships:

```
### Dependency Graph

#<sub1> ──┬──► #<sub3>
          │
#<sub2> ──┘

Legend:
- #<sub1> and #<sub2> must complete before #<sub3>
- #<sub4> and #<sub5> can be done in parallel
```

If no dependencies defined:
```
### Dependencies
No explicit dependencies defined. Sub-issues can be completed in any order.
```

---

## Error Handling

| Error | Response |
|-------|----------|
| Epic not found | "Issue #<number> not found." |
| Not an epic | "Issue #<number> is not an epic." |
| EPIC.md not found | Show GitHub-only status, suggest running `/epic <n> begin` |
| Git commands fail | Fall back to GitHub-only information |
