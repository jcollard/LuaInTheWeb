# Epic #82: Create top bar menu - File | Edit | Settings

**Status:** In Progress (3/6 complete)
**Branch:** 82-epic-create-top-bar-menu-file-edit-settings
**Created:** 2025-12-09
**Last Updated:** 2025-12-10

## Overview

Add a top navigation bar with dropdown menus similar to VS Code and other desktop applications. The menu system should be modular to allow easy addition of new menus.

### Acceptance Criteria
- Top bar renders fixed at top of application
- Menu bar has File, Edit, and Settings menus
- Clicking a menu opens a dropdown with menu items
- Menu items are keyboard accessible (arrow keys, Enter, Escape)
- Menus close when clicking outside
- Menu system is modular (easy to add new menus)
- Follows existing CSS module patterns

### Proposed Menu Structure

**File Menu:** New File, Open File (future), Save, Export As...

**Edit Menu:** Undo, Redo, Cut / Copy / Paste, Select All

**Settings Menu:** Theme (Light/Dark), Font Size, Editor preferences

## Architecture Decisions

<!-- Document key decisions as work progresses -->

- **Component-based architecture**: MenuBar, Menu, MenuItem, MenuDivider as separate components
- **State management via custom hook**: `useMenuBar` hook handles open/close/toggle logic
- **Keyboard navigation**: Implemented with ArrowUp/ArrowDown/Enter/Escape in Menu component
- **ARIA roles**: menubar, menu, menuitem, separator for accessibility
- **CSS modules with theme variables**: Uses `--theme-*` CSS custom properties for theming

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #106 | MenuBar: Base component architecture | ✅ Complete | 106-menubar-base-component-architecture | Merged PR #116 |
| #107 | MenuBar: Implement File menu | ✅ Complete | 107-menubar-implement-file-menu | Merged PR #118 |
| #108 | MenuBar: Implement Edit menu | 🔄 In Progress | 108-menubar-implement-edit-menu | Phase 2: Menu Implementations |
| #109 | MenuBar: Implement Settings menu | ⏳ Pending | - | Phase 2: Menu Implementations |
| #110 | MenuBar: Keyboard navigation | ⏳ Pending | - | Phase 3: Polish |
| #111 | MenuBar: Integration and E2E tests | ⏳ Pending | - | Phase 3: Polish |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

**Suggested order:** #106 → (#107, #108, #109 in parallel) → #110 → #111

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-10
- Working on #108: MenuBar: Implement Edit menu
  - Created `useEditorCommands` hook (79% mutation score) for Monaco editor integration
  - Added `onMount` and `onCursorChange` callbacks to CodeEditor component
  - Wired Edit menu items to actual editor commands (undo, redo, cut, copy, paste, selectAll)
  - Menu items dynamically enable/disable based on editor state (hasUndo, hasRedo, hasSelection)
  - Added 5 E2E tests for Edit menu interactions
- Completed #107: MenuBar: Implement File menu - Merged PR #118
  - Created `useFileExport` hook (80% mutation score)
  - Added "Open File..." placeholder, "Export As..." menu items
  - Removed Ctrl+N shortcut (browsers block it for security)
  - Added E2E tests for File menu interactions
- Merged PR #116 for #106: MenuBar base component architecture
- Created tech debt issue #117 for Menu.tsx mutation score (66%)
- Updated #110 to include keyboard hook extraction task

### 2025-12-09
- Epic started
- Started work on #106: MenuBar base component architecture
- Completed #106: Created MenuBar, Menu, MenuItem, MenuDivider components
  - useMenuBar hook: 81.25% mutation score
  - MenuItem: 90% mutation score
  - Menu: 66% mutation score (accepted)
  - MenuBar: 80% mutation score
  - Integrated into IDELayout with File, Edit, View, Run, Settings menus
  - 79 unit tests, 11 E2E tests

## Key Files

<!-- Populated as files are created/modified -->

**Components:**
- `src/components/MenuBar/MenuBar.tsx` - Main container component
- `src/components/MenuBar/Menu.tsx` - Individual dropdown menu
- `src/components/MenuBar/MenuItem.tsx` - Menu item with action/shortcut support
- `src/components/MenuBar/MenuDivider.tsx` - Separator component
- `src/components/MenuBar/types.ts` - Type definitions
- `src/components/MenuBar/index.ts` - Barrel exports

**Hooks:**
- `src/hooks/useMenuBar.ts` - Menu state management
- `src/hooks/useEditorCommands.ts` - Monaco editor command integration for Edit menu

**Styles:**
- `src/components/MenuBar/*.module.css` - Theme-aware CSS modules

**Tests:**
- `e2e/menu-bar.spec.ts` - E2E tests

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)

## Tech Debt

| # | Description | Priority | Notes |
|---|-------------|----------|-------|
| #117 | Menu.tsx mutation score (66%) below threshold | Low | Will be addressed in #110 via hook extraction |
