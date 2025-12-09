# Epic #58: Add light/dark mode theme switcher for the editor

**Status:** In Progress (1/5 complete)
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
| #61 | Theme core layout components (sidebar, panels, tabs) | ⏳ Pending | - | - |
| #62 | Theme terminal and REPL components | ⏳ Pending | - | - |
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

## Key Files

- `src/styles/themes.css` - CSS custom properties for light/dark themes + transitions
- `src/contexts/ThemeContext.tsx` - ThemeProvider component
- `src/contexts/useTheme.ts` - useTheme hook
- `src/contexts/types.ts` - Theme and ThemeContextValue types
- `src/contexts/context.ts` - ThemeContext creation
- `src/contexts/index.ts` - Public exports
- `src/main.tsx` - ThemeProvider integration

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)

## Tech Debt

| # | Description | Priority | Notes |
|---|-------------|----------|-------|
| #75 | Scope theme transitions to specific components instead of global `*` selector | Low | Address at end of epic if performance issues observed |
