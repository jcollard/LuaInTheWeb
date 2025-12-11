# Epic #119: Shell Core Package Extraction

**Status:** In Progress (4/6 complete, 1 in progress)
**Branch:** epic-119
**Created:** 2025-12-10
**Last Updated:** 2025-12-10 16:58

## Overview

Extract the shell infrastructure into an independent `@lua-learning/shell-core` package to enable:
- Isolated testing (faster feedback, clearer coverage)
- Independent versioning
- Cleaner architectural boundaries
- Reuse potential (CLI, tutorials, other contexts)

### Context

The shell infrastructure in `src/shell/` is already ~95% decoupled from the editor with clean abstractions:
- `IFileSystem` interface for filesystem operations
- `createFileSystemAdapter` bridges editor filesystem to shell
- Commands are pure logic with no editor dependencies
- Only `ShellTerminal.tsx` connects to IDE context

### Package Structure

```
LuaInTheWeb/
├── packages/
│   └── shell-core/              # Independent shell package
│       ├── src/
│       │   ├── commands/
│       │   ├── types.ts
│       │   ├── CommandRegistry.ts
│       │   ├── createFileSystemAdapter.ts
│       │   ├── parseCommand.ts
│       │   ├── pathUtils.ts
│       │   └── index.ts
│       ├── tests/
│       ├── package.json
│       ├── tsconfig.json
│       └── vitest.config.ts
│
└── lua-learning-website/        # Editor (imports shell-core)
    ├── src/components/ShellTerminal/  # Integration wrapper
    └── package.json             # Depends on shell-core
```

## Architecture Decisions

<!-- Document key decisions as work progresses -->

(none yet)

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #120 | Initialize shell-core package structure | ✅ Complete | 120-initialize-shell-core | Merged PR #126 |
| #121 | Extract shell types and utilities | ✅ Complete | 121-extract-shell-types-and-utilities | Merged PR #127 |
| #122 | Extract CommandRegistry and filesystem adapter | ✅ Complete | 122-extract-commandregistry-and-filesystem-adapter | Merged PR #128 |
| #123 | Extract shell commands (cd, pwd, ls, help) | ✅ Complete | 123-extract-shell-commands | Merged PR #129 |
| #124 | Integrate shell-core into editor | 🔄 In Progress | 124-integrate-shell-core-into-editor | Shell tab in BottomPanel |
| #125 | Shell-core documentation and cleanup | ⏳ Pending | - | - |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-10
- Epic started
- **#120 Complete**: Initialized shell-core package structure
  - Created `packages/shell-core/` with src, tests directories
  - Configured package.json, tsconfig.json, vitest.config.ts
  - Set up npm workspaces at root level
  - Verified build and test pass
  - Merged PR #126 to epic-119
- **#121 Complete**: Extract shell types and utilities
  - Created `types.ts` with core interfaces (IFileSystem, Command, CommandResult, etc.)
  - Created `pathUtils.ts` with path manipulation functions
  - Created `parseCommand.ts` with command string parser
  - Added 67 tests with 85.63% mutation score
  - Merged PR #127 to epic-119
- **#122 Complete**: Extract CommandRegistry and filesystem adapter
  - Created `CommandRegistry.ts` - manages command registration, lookup, and execution
  - Created `createFileSystemAdapter.ts` - bridges external filesystems to IFileSystem interface
  - Added 55 tests (122 total)
  - Mutation scores: CommandRegistry 100%, createFileSystemAdapter 91.14%
  - Merged PR #128 to epic-119
- **#123 Complete**: Extract shell commands (cd, pwd, ls, help)
  - Created `commands/pwd.ts` - print working directory
  - Created `commands/cd.ts` - change directory with path resolution
  - Created `commands/ls.ts` - list directory contents with sorting (dirs first)
  - Created `commands/help.ts` - display help for commands (uses CommandRegistry)
  - Created `commands/index.ts` - exports and `registerBuiltinCommands()` helper
  - Added 59 tests (181 total)
  - Mutation scores: pwd 100%, cd 100%, ls 100%, help 93.10%, commands overall 97.53%
  - Merged PR #129 to epic-119
- **#124 In Progress**: Integrate shell-core into editor
  - Added `@lua-learning/shell-core` as workspace dependency
  - Added `isDirectory` method to `useFileSystem` hook
  - Created `useShell.ts` hook that integrates shell-core with editor filesystem
  - Created `ShellTerminal.tsx` component using xterm.js and useShell
  - Added Shell tab to BottomPanel (alongside Terminal and REPL)
  - Exposed `fileSystem` through IDEContext for shell integration

## Key Files

<!-- Populated as files are created/modified -->

- `package.json` - Root workspace configuration
- `packages/shell-core/package.json` - Shell-core package definition
- `packages/shell-core/tsconfig.json` - TypeScript configuration
- `packages/shell-core/vitest.config.ts` - Test configuration
- `packages/shell-core/stryker.config.json` - Mutation testing configuration
- `packages/shell-core/src/index.ts` - Package entry point with exports
- `packages/shell-core/src/types.ts` - Core interfaces (IFileSystem, Command, etc.)
- `packages/shell-core/src/pathUtils.ts` - Path manipulation utilities
- `packages/shell-core/src/parseCommand.ts` - Command string parser
- `packages/shell-core/src/CommandRegistry.ts` - Command registration and execution
- `packages/shell-core/src/createFileSystemAdapter.ts` - External filesystem adapter
- `packages/shell-core/src/commands/pwd.ts` - pwd command implementation
- `packages/shell-core/src/commands/cd.ts` - cd command implementation
- `packages/shell-core/src/commands/ls.ts` - ls command implementation
- `packages/shell-core/src/commands/help.ts` - help command factory
- `packages/shell-core/src/commands/index.ts` - Command exports and registration helper
- `lua-learning-website/src/hooks/useShell.ts` - Shell hook integrating shell-core with editor
- `lua-learning-website/src/components/ShellTerminal/ShellTerminal.tsx` - Shell terminal UI
- `lua-learning-website/src/components/ShellTerminal/types.ts` - Shell terminal types
- `lua-learning-website/src/components/ShellTerminal/index.ts` - Shell terminal exports

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
