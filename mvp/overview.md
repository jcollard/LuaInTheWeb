# MVP Overview

## Issue Inventory

### Roadmap Features (MVP Required)

| # | Title | Effort | Priority | Status | Description |
|---|-------|--------|----------|--------|-------------|
| 14 | Unix/Linux Terminal | XL | P2 | Concept | Shell with cd, ls, pwd, mkdir, cat, open, lua commands + Ctrl+C |
| 20 | File API / Workspace | XL | P2 | Concept | Local filesystem access via File API, workspace management |
| 26 | Markdown Reader | L | P3 | Concept | Render markdown files in editor for assignments/projects |
| 82 | Top Bar Menu (Epic) | M-L | P2 | Open | File, Edit, Settings menus with keyboard navigation |

### Tech Debt (MVP Required) ✅ COMPLETE

| # | Title | Effort | Priority | Status | Description |
|---|-------|--------|----------|--------|-------------|
| 12 | CSS Modules Migration | S | P3 | ✅ Done | Migrated to CSS modules |
| 33 | BashTerminal Hook + Home/End Keys | M | P2 | ✅ Done (PR #112) | Hook integration + Home/End navigation (includes #100) |

> **Note**: #100 was consolidated into #33 and completed in PR #112

### Optional (Not MVP)

| # | Title | Effort | Priority | Status | Description |
|---|-------|--------|----------|--------|-------------|
| 25 | Git Support | XL | P3 | Concept | Git commands in browser terminal |

### Workflow Tech Debt (Lower Priority)

| # | Title | Effort | Priority | Description |
|---|-------|--------|----------|-------------|
| 51 | Fix update-pr.py bug | S | P2 | `push_branch` return condition uses `or` instead of `and` |
| 70 | Validate --base param | XS | P3 | Input validation in issue-review.py |
| 71 | Extract EPIC.md template | XS | P3 | Move template to separate file |
| 72 | Epic merge main | S | P2 | Auto-merge main into epic before sub-issues |
| 92 | GitHub Actions Screenshots | M | P3 | Automate visual verification in CI |

---

## Detailed Issue Analysis

### #14 - Unix/Linux Terminal (XL)

**Goal**: Transform current output-only terminal into interactive Unix-like shell

**Required Commands**:
- `cd` - Change directory
- `pwd` - Print working directory
- `ls` - List directory contents
- `mkdir` - Create directory
- `cat` - Display file contents
- `open {file}` - Open file in editor
- `lua {file}` - Execute Lua file (REPL if no file)
- `Ctrl+C` - Kill running process

**Key Considerations**:
- `lua` command as REPL could eliminate separate REPL tab
- Multiple terminal support would be valuable
- Natural extension point for additional Linux commands

**Sub-Issues**:
| # | Title |
|---|-------|
| #102 | Command infrastructure + cd, pwd, ls |
| #103 | File commands: mkdir, cat, open |
| #104 | Lua execution command with REPL mode |
| #105 | Process control: Ctrl+C, job management |

**Dependencies**:
- #33 should be completed first (hook integration + Home/End keys)

---

### #20 - File API / Workspace (XL)

**Goal**: Allow filesystem access beyond localStorage

**Features**:
- "Add Workspace" to access local directories
- File System Access API for directory handles
- Abstract filesystem interface (future: remote workspace support)

**Key Considerations**:
- Browser File System Access API has limited browser support (Chrome/Edge)
- Need fallback for unsupported browsers
- Should design abstraction layer for future remote filesystem

**Dependencies**:
- #14 (Terminal) should be mostly complete - shell commands need filesystem

---

### #26 - Markdown Reader (L)

**Goal**: Render markdown files for assignments/workbooks in editor

**Features**:
- Open .md files and render instead of showing raw text
- Support for typical assignment content
- Potentially embeddable code blocks

**Key Considerations**:
- Could use existing markdown library (marked, remark, etc.)
- Integration with editor tabs
- May need custom renderers for interactive elements

**Dependencies**:
- #20 (File API) - need to open markdown files from filesystem

---

### #82 - Top Bar Menu (Epic)

**Goal**: Add VS Code-style menu bar with File, Edit, Settings menus

**Sub-Issues**:
| # | Title |
|---|-------|
| #106 | MenuBar base component architecture |
| #107 | Implement File menu |
| #108 | Implement Edit menu |
| #109 | Implement Settings menu |
| #110 | Keyboard navigation |
| #111 | Integration and E2E tests |

**Key Considerations**:
- Already has light/dark theme switcher (#98) - Settings menu should integrate
- Should be modular for easy extension
- ARIA accessibility patterns required
- #107, #108, #109 can potentially be developed in parallel after #106

**Dependencies**:
- None - can develop independently (parallel with terminal work)

---

### #33 - BashTerminal Hook + Home/End Keys (M) ✅ COMPLETE

**Goal**: Connect existing tested hook to BashTerminal component AND add Home/End key navigation

> **Completed**: PR #112 merged on 2025-12-10

**What Was Delivered**:
- `handleHome`/`handleEnd` handlers in `useBashTerminal` hook (13 new tests, 90.65% mutation score)
- Home/End key detection in `BashTerminal.tsx` supporting multiple escape sequences
- New `executeTerminalCommands` utility (94.74% mutation score)
- Updated help text documenting Home/End shortcuts
- 3 E2E tests verifying navigation works

**Dependencies**:
- ✅ Done - #14 Terminal Epic can now proceed

---

### #12 - CSS Modules Migration (S) ✅ COMPLETE

**Goal**: Convert legacy CSS files to CSS modules

**Status**: ✅ Done - All legacy CSS files migrated or removed:
- ~~App.css~~ - Deleted (unused routes removed)
- ~~LuaPlayground.css~~ - Deleted (component removed)
- BashTerminal.css → Migrated to `BashTerminal.module.css`
- LuaRepl.css → Migrated to `LuaRepl.module.css`

**Dependencies**:
- ✅ Done - Established clean baseline for all new work
