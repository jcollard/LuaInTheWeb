# Epic #14: Unix / Linux like terminal

**Status:** In Progress (0/4 complete)
**Branch:** 14-epic-unix-linux-like-terminal
**Created:** 2025-12-09
**Last Updated:** 2025-12-09 (Working on #102)

## Overview

Transform the current output-only terminal into an interactive Unix/Linux-like shell. One of the goals of the class is for students to become more familiar with computers in general.

### Goals
- Provide a Unix/Linux style shell experience
- Enable students to learn command-line basics
- Integrate Lua execution into the terminal
- Potentially eliminate the need for a separate REPL tab

### Acceptance Criteria
- Shell prompt with working command input
- Basic navigation commands (cd, pwd, ls)
- File operation commands (mkdir, cat, open)
- Lua execution (lua {filename} or lua for REPL)
- Process control (Ctrl+C to kill running processes)
- Multiple terminal support (stretch goal)

## Architecture Decisions

<!-- Document key decisions as work progresses -->

### 1. Command Registry Pattern (Issue #102)
Implemented a registry-based command system where commands self-register with metadata:
- Commands are pure functions with `execute(args, context)` signature
- Registry provides lookup, listing, and validation
- Help command uses the registry for dynamic help generation
- Extensible: new commands just need to register with the registry

### 2. Filesystem Abstraction (Issue #102)
Created adapter pattern for filesystem operations:
- `IFileSystem` interface abstracts filesystem operations
- `createFileSystemAdapter` adapts existing `useFileSystem` hook
- Commands operate on abstract filesystem, enabling future File API support

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #102 | Terminal: Command infrastructure + cd, pwd, ls | 🔄 In Progress | 102-terminal-command-infrastructure-cd-pwd-ls | Phase 1 |
| #103 | Terminal: File commands - mkdir, cat, open | ⏳ Pending | - | Phase 2 |
| #104 | Terminal: Lua execution command with REPL mode | ⏳ Pending | - | Phase 3 |
| #105 | Terminal: Process control - Ctrl+C, job management | ⏳ Pending | - | Phase 4 |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

**Suggested order:** #102 → #103 → #104 → #105 (sequential phases)

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-09
- Epic started
- Started work on #102: Terminal: Command infrastructure + cd, pwd, ls

## Key Files

<!-- Populated as files are created/modified -->

### Shell Infrastructure (Issue #102)
- `src/shell/types.ts` - Command, ShellContext, IFileSystem interfaces
- `src/shell/CommandRegistry.ts` - Command registration and lookup
- `src/shell/parseCommand.ts` - Command input parser
- `src/shell/pathUtils.ts` - Path resolution utilities
- `src/shell/createFileSystemAdapter.ts` - Filesystem adapter
- `src/shell/index.ts` - Re-exports for shell module

### Commands (Issue #102)
- `src/shell/commands/pwd.ts` - Print working directory
- `src/shell/commands/cd.ts` - Change directory (with cd - support)
- `src/shell/commands/ls.ts` - List directory contents
- `src/shell/commands/help.ts` - Show help for commands

### Integration Layer
- `src/hooks/useShell.ts` - Shell hook for command execution
- `src/components/ShellTerminal/ShellTerminal.tsx` - Shell terminal component

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)

## Dependencies

| # | Title | Status |
|---|-------|--------|
| #33 | Refactor BashTerminal: Hook integration + Home/End keys | ✅ Complete |
| #12 | CSS: Migrate legacy CSS files to CSS modules | ✅ Complete |

All dependencies have been completed.

## Priority

**P2-Medium** - Core educational feature for teaching command-line basics

## Technical Notes

### Command Registry Pattern
Create a command registry that allows easy addition of new commands:
```typescript
interface Command {
  name: string;
  description: string;
  usage: string;
  execute: (args: string[], context: ShellContext) => Promise<CommandResult>;
}
```

### Filesystem Abstraction
Commands should work with an abstract filesystem interface to support future File API integration (#20):
```typescript
interface IFileSystem {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listDirectory(path: string): Promise<FileEntry[]>;
  // ...
}
```

### Future Commands (Low-hanging fruit)
After MVP, consider adding:
- `echo` - Print text
- `clear` - Clear terminal
- `help` - Show available commands
- `touch` - Create empty file
- `rm` - Remove file
- `cp` / `mv` - Copy/move files
- `grep` - Search in files
- `history` - Command history

## Tech Debt

<!-- Track tech debt items identified during epic work -->

(none yet)
