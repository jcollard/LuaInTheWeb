# Epic #82: Create top bar menu - File | Edit | Settings

**Status:** In Progress (1/6 complete)
**Branch:** 82-epic-create-top-bar-menu-file-edit-settings
**Created:** 2025-12-09
**Last Updated:** 2025-12-09

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
| #106 | MenuBar: Base component architecture | ✅ Complete | 106-menubar-base-component-architecture | Completed 2025-12-09 |
| #107 | MenuBar: Implement File menu | ⏳ Pending | - | Phase 2: Menu Implementations |
| #108 | MenuBar: Implement Edit menu | ⏳ Pending | - | Phase 2: Menu Implementations |
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
| - | - | - | - |
