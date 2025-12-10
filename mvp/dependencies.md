# Dependency Analysis

## Dependency Graph

```
                    ┌─────────────────────────────────────────────┐
                    │      FOUNDATION LAYER ✅ COMPLETE           │
                    │         (All items merged to main)          │
                    └─────────────────────────────────────────────┘
                                        │
            ┌───────────────────────────┴───────────────────────────┐
            │                                                       │
            ▼                                                       ▼
    ┌───────────────┐                                      ┌───────────────┐
    │  #12 - CSS    │                                      │ #33 - Hook +  │
    │  Modules ✅   │                                      │ Home/End ✅   │
    │  (S) DONE     │                                      │ (M) PR #112   │
    └───────────────┘                                      └───────┬───────┘
                                                                   │
                                                                   ▼
                              ┌────────────────────────────────────────────┐
                              │  #14 - Unix Terminal (Epic)                │
                              │  ├── #102 - Command infra + cd, pwd, ls    │
                              │  ├── #103 - mkdir, cat, open               │
                              │  ├── #104 - lua execution + REPL           │
                              │  └── #105 - Ctrl+C process control         │
                              └───────────────────┬────────────────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  #20 - File API /      │
                              │  Workspace (XL)        │
                              │  Local fs access,      │
                              │  workspace management  │
                              └───────────┬────────────┘
                                          │
                                          ▼
                              ┌────────────────────────┐
                              │  #26 - Markdown        │
                              │  Reader (L)            │
                              │  Render .md in editor  │
                              └────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────┐
    │                     INDEPENDENT STREAM                          │
    │              (Can be developed in parallel)                     │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────────────────────────┐
                        │  #82 - Menu Bar (Epic)                     │
                        │  ├── #106 - MenuBar architecture           │
                        │  ├── #107 - File menu                      │
                        │  ├── #108 - Edit menu                      │
                        │  ├── #109 - Settings menu                  │
                        │  ├── #110 - Keyboard navigation            │
                        │  └── #111 - Integration + E2E tests        │
                        └────────────────────────────────────────────┘


    ┌─────────────────────────────────────────────────────────────────┐
    │                  OPTIONAL / FUTURE                              │
    └─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌────────────────────────┐
                        │  #25 - Git Support     │
                        │  (XL) - NOT MVP        │
                        │  Depends on: #14, #20  │
                        └────────────────────────┘
```

## Dependency Explanations

### #33 → #14 (Hook + Home/End → Unix Terminal) ✅ CLEARED
- **Status**: ✅ #33 completed (PR #112) - #14 can now proceed
- **Note**: #100 (Home/End keys) was consolidated into #33 and delivered
- **Result**: Foundation complete, terminal epic ready to start

### #14 → #20 (Unix Terminal → File API)
- **Why**: Shell commands (ls, cd, cat) need filesystem abstraction
- **Risk if skipped**: Would need to refactor filesystem integration
- **Recommendation**: Design filesystem abstraction during #14, implement fully in #20

### #20 → #26 (File API → Markdown Reader)
- **Why**: Need to load .md files from filesystem
- **Risk if skipped**: Markdown reader would only work with localStorage files
- **Recommendation**: Complete #20 first for full filesystem support

### #82 (Menu Bar) - Independent
- **Why**: Pure UI addition, doesn't touch terminal or filesystem
- **Opportunity**: Can be developed in parallel with terminal stream
- **Recommendation**: Good candidate for parallel development

## Execution Order Options

### Option A: Sequential (Conservative)
```
#12 → #33 → #14 (sub-issues) → #20 → #26 → #82 (sub-issues)
```
- **Pros**: No merge conflicts, clear progress
- **Cons**: Slower, no parallelization

### Option B: Two Parallel Streams (Recommended)
```
Foundation: #12 → #33
Then parallel:
  Stream A: #14 (#102→#103→#104→#105) → #20 → #26
  Stream B: #82 (#106→#107/#108/#109→#110→#111)
```
- **Pros**: Faster completion, #82 is independent
- **Cons**: Requires coordination for merge timing

### Option C: Maximum Parallelization
```
Foundation: #12, #33 (parallel if touching different files)
Then:
  Stream A: #14 sub-issues → #20 → #26
  Stream B: #82 sub-issues (#107-#109 can be parallel after #106)
```
- **Pros**: Fastest
- **Cons**: Requires careful coordination

## Recommended Approach: Option B

1. **Phase 1 - Foundation** ✅ COMPLETE
   - ✅ #12 CSS Modules - Done
   - ✅ #33 Hook Integration + Home/End Keys - Done (PR #112)

2. **Phase 2 - Parallel Development** ← CURRENT PHASE
   - **Stream A**: #14 Epic (#102→#103→#104→#105) → #20 → #26
   - **Stream B**: #82 Epic (#106→#107/#108/#109→#110→#111)

3. **Merge Strategy**
   - ✅ Foundation items merged to main
   - #82 sub-issues can merge as epic branch or to main (independent)
   - Terminal stream (#14) sub-issues merge to epic branch, then epic to main
   - Merge #20 and #26 to main when complete

## Risk Analysis

| Risk | Impact | Mitigation |
|------|--------|------------|
| #14 is too large | High | Already broken into 4 sub-issues (#102-#105) |
| File API browser support | Medium | Design abstraction, localStorage fallback |
| #82 conflicts with main | Low | Independent code paths, merge frequently |
| Scope creep on terminal | High | Define MVP command set strictly in sub-issues |
