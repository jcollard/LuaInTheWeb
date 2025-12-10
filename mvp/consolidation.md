# Consolidation Analysis

## Completed Consolidations

### 1. Terminal Input Handling: #33 (includes #100)

**Status**: ✅ DONE

**What was consolidated**:
- #33: Integrate useBashTerminal hook with BashTerminal.tsx
- #100: Home/End keys do not navigate in REPL (CLOSED)

**Result**:
- #33 updated to include Home/End key navigation tasks
- #100 closed with reference to #33
- Single PR will handle both: hook integration + Home/End keys

**Estimated Effort**: M

---

### 2. Terminal Commands: #14 Epic with Sub-issues

**Status**: ✅ DONE

**Issue #14 Sub-issues Created**:
| # | Title | Depends On |
|---|-------|------------|
| #102 | Command infrastructure + cd, pwd, ls | - |
| #103 | File commands: mkdir, cat, open | #102 |
| #104 | Lua execution command with REPL mode | #102, #103 |
| #105 | Process control: Ctrl+C, job management | #102, #104 |

**Why This Structure**:
- Command infrastructure created once in #102
- Each subsequent issue builds on the infrastructure
- Clean dependency chain for sequential development

---

### 3. Menu Bar: #82 Epic with Sub-issues

**Status**: ✅ DONE

**Issue #82 Sub-issues Created**:
| # | Title | Depends On |
|---|-------|------------|
| #106 | MenuBar base component architecture | - |
| #107 | Implement File menu | #106 |
| #108 | Implement Edit menu | #106 |
| #109 | Implement Settings menu | #106 |
| #110 | Keyboard navigation | #106-#109 |
| #111 | Integration and E2E tests | All above |

**Why This Structure**:
- Architecture first (#106) enables parallel menu development
- Menus #107-#109 can potentially be developed in parallel
- Keyboard and E2E come last once features are stable

---

## Items Kept Separate

### #14 and #20 - Sequential, Not Merged

**Why Keep Separate**:
- Both are XL effort
- #14 can work with current localStorage filesystem
- #20 adds real filesystem - significant scope
- Merging would create an unmanageable mega-epic

**Interface Point**:
- #14 should use filesystem abstraction (IFileSystem interface)
- #20 implements the abstraction for File System Access API
- Clean separation allows testing #14 independently

---

### #82 Menu Bar - Fully Independent

**Why Keep Separate**:
- Zero code overlap with terminal work
- Different component area (top bar vs bottom panel)
- Can be developed, tested, merged independently
- Good for parallel development

---

### CSS Migration #12 - Do First

**Issue #12**: Migrate BashTerminal.css, LuaPlayground.css, LuaRepl.css, App.css

**Recommendation**:
- Do #12 FIRST to establish clean baseline
- Ensure all new work follows CSS modules pattern
- No consolidation needed - just prioritize early

---

### Tech Debt Items (#51, #70, #71, #72) - Keep Separate

**Why Keep Separate**:
- Small, focused fixes
- Different areas (Python scripts, templates)
- Can be done opportunistically
- Don't block or depend on MVP features

---

## Summary of Changes Made

| Action | Before | After |
|--------|--------|-------|
| Consolidate #33 + #100 | 2 separate issues | #33 (expanded), #100 closed |
| Break down #14 | 1 monolithic issue | Epic + 4 sub-issues (#102-#105) |
| Break down #82 | 1 issue with text list | Epic + 6 sub-issues (#106-#111) |

## Final Issue Map

```
Foundation:
  #12 - CSS Modules (S)
  #33 - BashTerminal Hook + Home/End (M) ← includes #100

Terminal Epic (#14):
  #102 - Command infrastructure + cd, pwd, ls
  #103 - File commands: mkdir, cat, open
  #104 - Lua execution + REPL mode
  #105 - Process control: Ctrl+C

Menu Bar Epic (#82):
  #106 - MenuBar architecture
  #107 - File menu
  #108 - Edit menu
  #109 - Settings menu
  #110 - Keyboard navigation
  #111 - Integration + E2E tests

Filesystem:
  #20 - File API / Workspace (XL)

Content:
  #26 - Markdown Reader (L)

Optional:
  #25 - Git Support (XL) - NOT MVP
```
