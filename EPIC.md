# Epic #119: Shell Core Package Extraction

**Status:** In Progress (1/6 complete)
**Branch:** epic-119
**Created:** 2025-12-10
**Last Updated:** 2025-12-10 13:48

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
| #121 | Extract shell types and utilities | ⏳ Pending | - | - |
| #122 | Extract CommandRegistry and filesystem adapter | ⏳ Pending | - | - |
| #123 | Extract shell commands (cd, pwd, ls, help) | ⏳ Pending | - | - |
| #124 | Integrate shell-core into editor | ⏳ Pending | - | - |
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

## Key Files

<!-- Populated as files are created/modified -->

- `package.json` - Root workspace configuration
- `packages/shell-core/package.json` - Shell-core package definition
- `packages/shell-core/tsconfig.json` - TypeScript configuration
- `packages/shell-core/vitest.config.ts` - Test configuration
- `packages/shell-core/src/index.ts` - Package entry point

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
