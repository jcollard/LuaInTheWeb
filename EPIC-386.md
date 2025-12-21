# Epic #386: Add tab / window splitting allowing multiple tabs to be shown and open at a time

**Status:** In Progress (1/6 complete)
**Branch:** epic-386
**Created:** 2025-12-20
**Last Updated:** 2025-12-20

## Overview

Currently, users can only view one tab at a time. When working on projects that reference multiple files or comparing code, users must switch back and forth between tabs, losing context.

Add the ability to split the editor area horizontally or vertically, allowing multiple tabs to be displayed simultaneously (similar to VS Code or JetBrains IDEs).

### Acceptance Criteria

- [ ] Users can split the current view horizontally (side-by-side)
- [ ] Users can split the current view vertically (top-bottom)
- [ ] Each split pane can have its own independent tab
- [ ] Split panes can be resized by dragging the divider
- [ ] Users can close a split pane (returning to single view)
- [ ] Focus state is clearly indicated for the active pane
- [ ] Layout state persists across page refreshes

## Architecture Decisions

<!-- Document key decisions as work progresses -->

1. **Split Layout State Management**: Using a custom `useSplitLayout` hook with React's `useState` for state management. The hook provides operations for splitting, closing, and moving tabs between groups.

2. **Group ID Generation**: Using timestamp + random string (`group-{timestamp}-{random}`) for unique group IDs rather than UUID to avoid additional dependencies.

3. **Tab Migration on Close**: When a group is closed, tabs are migrated to the previous group (or next if closing the first group). This ensures no tabs are lost.

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #396 | Core Split Infrastructure - useSplitLayout hook and types | :white_check_mark: Complete | 396-core-split-infrastructure | Merged in PR #402 |
| #397 | EditorGroup Component - Standalone editor group with TabBar | :hourglass_flowing_sand: Pending | - | Depends on #396 |
| #398 | SplitEditorLayout Integration - Integrate with IDELayout | :hourglass_flowing_sand: Pending | - | Depends on #396, #397 |
| #399 | Split Actions & UI - Context menu, close split, focus states | :hourglass_flowing_sand: Pending | - | Depends on #396, #397, #398 |
| #400 | Keyboard Shortcuts & Persistence - Split navigation and localStorage | :hourglass_flowing_sand: Pending | - | Depends on #396, #398, #399 |
| #401 | Testing Suite - Unit tests and E2E tests for split functionality | :hourglass_flowing_sand: Pending | - | Depends on all above |

**Status Legend:**
- :hourglass_flowing_sand: Pending - Not yet started
- :arrows_counterclockwise: In Progress - Currently being worked on
- :white_check_mark: Complete - Merged to epic branch
- :x: Blocked - Has unresolved blockers

## Dependency Graph

```
#396 Core Split Infrastructure (no dependencies)
  |
  v
#397 EditorGroup Component
  |
  v
#398 SplitEditorLayout Integration
  |
  v
#399 Split Actions & UI
  |
  v
#400 Keyboard Shortcuts & Persistence
  |
  v
#401 Testing Suite
```

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-20
- Epic started
- Created epic branch and worktree
- Generated EPIC-386.md tracking file
- Started work on #396: Core Split Infrastructure
- Created `useSplitLayout` hook with types and 27 unit tests (97%+ coverage)
- Completed #396: Core Split Infrastructure
- Merged PR #402 to epic-386

## Key Files

<!-- Populated as files are created/modified -->

- `src/components/SplitEditorLayout/types.ts` - Core type definitions (SplitLayout, EditorGroupInfo, SplitDirection)
- `src/components/SplitEditorLayout/useSplitLayout.ts` - Split layout state management hook
- `src/components/SplitEditorLayout/__tests__/useSplitLayout.test.ts` - Hook unit tests (27 tests)

## Open Questions

<!-- Questions that arise during implementation -->

- How should users initiate a split? (menu option, keyboard shortcut, drag tab?)
- Should there be a limit to the number of splits?
- How should splits be closed? (button, keyboard shortcut, context menu?)

## Blockers

(none)
