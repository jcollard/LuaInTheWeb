# Epic #184: Add better lua formatter / lua syntax and editor experience

**Status:** In Progress (0/3 complete)
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
- **StyLua WASM library**: Using `@johnnymorganz/stylua` for code formatting
  - Production-ready, battle-tested formatter (2000+ GitHub stars)
  - WASM version works in browsers via dynamic import
  - Uses dynamic import pattern to work around verbatimModuleSyntax TypeScript constraints

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #185 | Lua Code Formatter | 🔄 In Progress | 185-lua-formatter | Using StyLua WASM library |
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
