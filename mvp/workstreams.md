# Workstreams & Merge Strategy

## Parallel Workstreams

### Stream A: Terminal & Filesystem (Critical Path)

This is the main feature stream and the critical path for MVP.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STREAM A: Terminal & Filesystem                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Phase 1: Foundation (Sequential to main)                               │
│  ├── #12 CSS Modules (S) ─────────────────────────► merge to main       │
│  ├── #33 Hook Integration (M) ────────────────────► merge to main       │
│  └── #100 Home/End Keys (XS) ─────────────────────► merge to main       │
│                                                                         │
│  Phase 2: Terminal Epic                                                 │
│  └── #14 Unix Terminal (XL) ──────────────────────► merge to main       │
│       ├── Sub: Basic commands (cd, pwd, ls)                             │
│       ├── Sub: File commands (mkdir, cat, open)                         │
│       ├── Sub: Lua execution (lua {file})                               │
│       ├── Sub: REPL integration (lua with no args)                      │
│       └── Sub: Process control (Ctrl+C)                                 │
│                                                                         │
│  Phase 3: Filesystem                                                    │
│  └── #20 File API / Workspace (XL) ───────────────► merge to main       │
│       ├── Sub: Filesystem abstraction layer                             │
│       ├── Sub: File System Access API integration                       │
│       ├── Sub: Workspace management UI                                  │
│       └── Sub: Fallback for unsupported browsers                        │
│                                                                         │
│  Phase 4: Content                                                       │
│  └── #26 Markdown Reader (L) ─────────────────────► merge to main       │
│       ├── Sub: Markdown parsing/rendering                               │
│       └── Sub: Editor tab integration                                   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stream B: Menu Bar (Independent)

Can be developed entirely in parallel with Stream A.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STREAM B: Menu Bar (Independent)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  #82 Menu Bar Epic (6 sub-issues) ────────────────► merge to main       │
│  ├── Sub 1: MenuBar component architecture                              │
│  ├── Sub 2: File menu (New, Open, Save, Export)                         │
│  ├── Sub 3: Edit menu (Undo, Redo, Cut, Copy, Paste)                    │
│  ├── Sub 4: Settings menu (Theme, Font Size)                            │
│  ├── Sub 5: Keyboard navigation                                         │
│  └── Sub 6: Integration and E2E tests                                   │
│                                                                         │
│  Notes:                                                                 │
│  - No dependencies on Stream A                                          │
│  - Can merge sub-issues incrementally                                   │
│  - Theme switcher (#98) already exists - integrate with Settings menu   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Stream C: Tech Debt (Background/Between Features)

Lower priority items that can fill gaps.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        STREAM C: Tech Debt (Background)                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Workflow Improvements (can be done anytime):                           │
│  ├── #51 Fix update-pr.py bug (S)                                       │
│  ├── #70 Add --base validation (XS)                                     │
│  ├── #71 Extract EPIC.md template (XS)                                  │
│  └── #72 Epic merge main (S)                                            │
│                                                                         │
│  CI/CD (optional for MVP):                                              │
│  └── #92 GitHub Actions Screenshots (M)                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Timeline Visualization

```
Week    Stream A (Terminal)             Stream B (Menu)         Stream C (Debt)
────    ───────────────────             ───────────────         ───────────────
  1     #12 CSS ──► main                                        #51, #70, #71
        #33 Hook ──► main

  2     #100 Keys ──► main              #82 Start
        #14 Start (commands)            ├─ MenuBar arch

  3     #14 Continue                    ├─ File menu            #72
        ├─ file commands                ├─ Edit menu

  4     #14 Continue                    ├─ Settings menu
        ├─ lua execution                └─ Keyboard nav

  5     #14 Complete ──► main           #82 E2E ──► main

  6     #20 Start (filesystem)
        ├─ abstraction layer

  7     #20 Continue
        ├─ File API integration

  8     #20 Complete ──► main

  9     #26 Markdown ──► main

 10     Integration & Polish            (Complete)              #92 (optional)
```

---

## Merge Strategy

### General Rules

1. **Small items merge immediately** - #12, #100, #33 go straight to main
2. **Epics use worktrees** - #14, #20, #82 get dedicated worktrees
3. **Sub-issues merge to epic branch** - Then epic merges to main when complete
4. **Merge main into epic frequently** - Keep epic branches current

### Specific Merge Points

| Issue | Merge Target | Timing |
|-------|--------------|--------|
| #12 | main | Immediately when done |
| #33 | main | Immediately when done |
| #100 | main | Immediately when done |
| #14 | main | When all terminal commands work |
| #82 | main | When all menus + keyboard nav work |
| #20 | main | When workspace management works |
| #26 | main | When markdown renders in editor |

### Conflict Prevention

1. **Stream A and B don't overlap** - Different components
2. **Foundation work first** - CSS and hook changes before feature work
3. **Frequent main merges** - Especially in long-running epic branches

---

## Resource Allocation (if using multiple developers)

### Single Developer (Recommended Flow)
```
Sequential foundation → #14 (largest) → #82 (break) → #20 → #26
```

### Two Developers
```
Dev 1: Stream A (Foundation → #14 → #20 → #26)
Dev 2: Stream B (#82) → then help with Stream A
```

### With Parallel Claude Sessions
```
Session 1: Stream A - Terminal focus
Session 2: Stream B - Menu Bar epic
Coordinate: Merge timing, shared component updates
```

---

## Definition of Done (per stream)

### Stream A Complete When:
- [ ] All legacy CSS converted to modules (#12)
- [ ] BashTerminal uses useBashTerminal hook (#33)
- [ ] Home/End keys work in terminal (#100)
- [ ] Terminal has: cd, pwd, ls, mkdir, cat, open, lua, Ctrl+C (#14)
- [ ] Can open local directory as workspace (#20)
- [ ] Can render markdown files in editor (#26)

### Stream B Complete When:
- [ ] MenuBar component exists with File, Edit, Settings menus (#82)
- [ ] All menus have working items
- [ ] Keyboard navigation works (arrows, Enter, Escape)
- [ ] E2E tests pass

### MVP Complete When:
- [ ] All Stream A items done
- [ ] All Stream B items done
- [ ] Full E2E test suite passes
- [ ] Build succeeds with no errors
