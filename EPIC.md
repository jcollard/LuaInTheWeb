# Epic #184: Add better lua formatter / lua syntax and editor experience

**Status:** In Progress (1/3 complete)
**Branch:** epic-184
**Created:** 2025-12-13
**Last Updated:** 2025-12-13

## Overview

Improve the Lua code editor experience with professional-grade formatting, syntax highlighting, and auto-indentation features.

**Goals:**
- Provide a "Format" button to auto-format Lua code
- Enhance syntax highlighting to catch all Lua syntax constructs
- Add smart auto-indentation when pressing Enter

## Architecture Decisions

### #185 - Lua Code Formatter
- **StyLua WASM library**: Using `stylua-wasm` for code formatting
  - Production-ready, battle-tested formatter
  - Changed from `@johnnymorganz/stylua` to `stylua-wasm` for proper browser/Vite support
  - Uses `?url` import for WASM file loading with Vite plugins
  - Toast notification on format errors for user feedback

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #185 | Lua Code Formatter | ✅ Complete | 185-lua-formatter | Merged in PR #204 |
| #186 | Improved Syntax Highlighting | ⏳ Pending | - | - |
| #187 | Auto-Indentation | ⏳ Pending | - | - |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Dependencies

None - all sub-issues can be implemented independently.

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-13
- Epic started
- PR created for #185: Lua Code Formatter (PR #204)
- Completed #185: Lua Code Formatter
- Merged PR #204 to epic-184

## Key Files

### #185 - Lua Code Formatter
- `src/utils/luaFormatter.ts` - StyLua wrapper utility
- `src/components/FormatButton/` - Format button component
- `src/components/EditorPanel/EditorPanel.tsx` - Integration
- `src/components/CodeEditor/CodeEditor.tsx` - Keyboard shortcut support
- `src/types/global.d.ts` - Window.monaco type declaration

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
