# Epic #58: Add light/dark mode theme switcher for the editor

**Status:** In Progress (2/5 complete)
**Branch:** epic-58
**Created:** 2025-12-09
**Last Updated:** 2025-12-09

## Overview

Add support for light and dark mode themes in the editor, allowing users to switch between them. This will improve accessibility and user comfort, especially for users who prefer working in different lighting conditions.

## Architecture Decisions

- **CSS Variables approach**: Theme colors defined as CSS custom properties on `:root` with `[data-theme="dark"]` and `[data-theme="light"]` selectors
- **React Context pattern**: `ThemeProvider` wraps the app, `useTheme()` hook provides access
- **Persistence**: localStorage with key `lua-ide-theme`, falls back to system preference via `prefers-color-scheme`
- **File structure**: Follows IDEContext pattern with separate files for context, types, provider, and hook

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #60 | Create theme infrastructure (CSS variables, context, localStorage) | ✅ Complete | 60-create-theme-infrastructure | Merged PR #74 |
| #61 | Theme core layout components (sidebar, panels, tabs) | ✅ Complete | 61-theme-core-layout-components | Merged PR #84 |
| #62 | Theme terminal and REPL components | 📝 Needs Review | 62-theme-terminal-and-repl-components | PR #89 |
| #63 | Integrate Monaco Editor theme switching | ⏳ Pending | - | - |
| #64 | Add theme switcher UI control | ⏳ Pending | - | - |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- 📝 Needs Review - PR created, awaiting review
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

**Suggested order:** #60 → (#61, #62, #63 in parallel) → #64

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-09
- Epic started
- Started work on #60: Create theme infrastructure
- Completed #60 implementation, PR #74 created
- PR #74 merged, #60 complete
- Started work on #61: Theme core layout components
- Completed #61 implementation, PR #84 created
- Fixed file explorer theming (FileExplorer, FileTree, FileTreeItem CSS files)
- PR #84 merged, #61 complete
- Started work on #62: Theme terminal and REPL components
- Created xterm.js theme configuration (dark/light terminal themes)
- Updated BashTerminal to use useTheme() with dynamic theme switching
- Converted BashTerminal.css to CSS module with theme variables
- Converted LuaRepl.css to CSS module with theme variables
- Fixed xterm.js theme application (set theme after terminal.open())
- Themed BottomPanel terminal output (replaced hardcoded colors with CSS variables)
- Added E2E tests for terminal theme colors

## Key Files

- `src/styles/themes.css` - CSS custom properties for light/dark themes + transitions
- `src/contexts/ThemeContext.tsx` - ThemeProvider component
- `src/contexts/useTheme.ts` - useTheme hook
- `src/contexts/types.ts` - Theme and ThemeContextValue types
- `src/contexts/context.ts` - ThemeContext creation
- `src/contexts/index.ts` - Public exports
- `src/main.tsx` - ThemeProvider integration
- `src/components/ActivityBar/ActivityBar.module.css` - Themed activity bar styles
- `src/components/SidebarPanel/SidebarPanel.module.css` - Themed sidebar styles
- `src/components/IDELayout/IDELayout.module.css` - Themed layout styles
- `src/components/StatusBar/StatusBar.module.css` - Themed status bar styles
- `src/components/EditorPanel/EditorPanel.module.css` - Themed editor panel styles
- `src/components/TabBar/TabBar.module.css` - Themed tab bar styles
- `src/components/BottomPanel/BottomPanel.module.css` - Themed bottom panel styles
- `src/components/IDEResizeHandle/IDEResizeHandle.module.css` - Themed resize handle styles
- `src/components/FileExplorer/FileExplorer.module.css` - Themed file explorer styles
- `src/components/FileTree/FileTree.module.css` - Themed file tree styles
- `src/components/FileTreeItem/FileTreeItem.module.css` - Themed file tree item styles
- `e2e/theme-layout.spec.ts` - E2E tests for theme layout components
- `src/components/BashTerminal/terminalTheme.ts` - xterm.js dark/light theme configuration
- `src/components/BashTerminal/BashTerminal.module.css` - Themed terminal container styles
- `src/components/LuaRepl/LuaRepl.module.css` - Themed REPL container styles
- `src/components/BottomPanel/BottomPanel.module.css` - Themed bottom panel terminal output styles
- `e2e/theme-terminal.spec.ts` - E2E tests for terminal theme colors

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)

## Tech Debt

| # | Description | Priority | Notes |
|---|-------------|----------|-------|
| #75 | Scope theme transitions to specific components instead of global `*` selector | Low | Address at end of epic if performance issues observed |
