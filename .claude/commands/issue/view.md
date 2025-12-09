# Issue View

Display issue details and complexity assessment.

**Invoked by**: `/issue <number>` (no subcommand)

**Input**: Issue number from `$ARGUMENTS`

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

## Step 4: Suggest Next Steps

End with:

```
---

**Next steps:**
- Run `/issue <number> begin` to start working on this issue
- Or explore the codebase first to understand the scope
```

---

## Example

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
