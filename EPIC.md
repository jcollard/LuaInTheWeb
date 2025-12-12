# Epic #140: [Epic] Shell Process Model with Lua Execution

**Status:** In Progress (5/6 complete)
**Branch:** epic-140
**Created:** 2025-12-12
**Last Updated:** 2025-12-12 11:03

## Overview

Create a unified shell experience where the `lua` command provides both script execution and interactive REPL functionality. This eliminates the need for separate REPL tab, Terminal tab, and Run button.

### Goals
- **Unified interface**: Shell becomes the single execution interface
- **Process model**: Each `lua` execution is its own interruptible process
- **Simplified UX**: Remove redundant UI components
- **Interface-based architecture**: Shell defines interfaces, lua-runtime implements them

### Architecture

**Package Structure:**
```
packages/
  shell-core/
    src/
      interfaces/
        ICommand.ts       # Simple commands (ls, cd, pwd)
        IProcess.ts       # Long-running processes
        ShellContext.ts   # Execution context for commands
      ProcessManager.ts   # Manages foreground process
      CommandRegistry.ts  # Registers commands (update existing)

  lua-runtime/            # NEW package
    src/
      LuaCommand.ts           # Implements ICommand
      LuaReplProcess.ts       # Implements IProcess (interactive REPL)
      LuaScriptProcess.ts     # Implements IProcess (script execution)
```

## Architecture Decisions

<!-- Document key decisions as work progresses -->

(none yet)

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #170 | Shell Interface Design | ✅ Complete | 170-shell-interface-design | Merged in PR #174 |
| #171 | Process Control UI | ✅ Complete | 171-process-control-ui | Merged in PR #175 |
| #172 | Lua Runtime Package | ✅ Complete | 172-lua-runtime-package | Merged in PR #176 |
| #178 | Process Raw Input Handling | ✅ Complete | 178-process-raw-input-handling | Merged in PR #182 |
| #179 | REPL Multi-line Input Support | ✅ Complete | 179-repl-multiline-input | Merged in PR #188 |
| #173 | Remove Legacy UI Components | ⏳ Pending | - | Depends on #178, #179 |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

**Implementation Order:**
```
#170 (interfaces) → #171 + #172 (parallel) → #178 + #179 (parallel) → #173 (cleanup)
```

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-12 11:03
- Scrapped #189: REPL Multi-line Cursor Editing
- Closed PR #190 and issue #189 as "not planned"
- Research showed this is an advanced feature that even Node.js and standard Python REPLs don't have
- Our current continuation mode with paste support matches Lua's official REPL behavior
- With text editor available for longer code, the complexity isn't justified
- Epic reduced from 7 to 6 sub-issues; #173 can now proceed

### 2025-12-12 09:59
- Completed #179: REPL Multi-line Input Support
- Merged PR #188 to epic-140
- Added Ctrl+V paste support for multi-line content
- Fixed error message newlines in REPL
- Added tests documenting long string delimiter edge case
- 6/7 sub-issues now complete

### 2025-12-12 08:14
- Started #179: REPL Multi-line Input Support
- Added `isCodeComplete()` to LuaEngineFactory for detecting incomplete Lua code
- Added multi-line input buffering to LuaReplProcess
- Shows `>> ` continuation prompt when code is incomplete
- Stores complete multi-line blocks as single history entries
- Added `cancelInput()` for canceling incomplete input
- 99 lua-runtime tests pass, 1148 website tests pass
- Mutation score: 82-87% for modified files
- Ready for PR

### 2025-12-12 07:56
- Completed #178: Process Raw Input Handling
- Merged PR #182 to epic-140
- Added KeyModifiers type and supportsRawInput/handleKey to IProcess interface
- Implemented command history navigation with arrow keys in LuaReplProcess
- 4/6 sub-issues now complete

### 2025-12-12 07:25
- Started work on #178: Process Raw Input Handling
- Created branch `178-process-raw-input-handling` from `epic-140`

### 2025-12-12 07:19
- Merged PR #176 to `epic-140`
- Sub-issue #172 complete
- Closed GitHub issue #172

### 2025-12-12 06:25
- Updated PR #176 with bug fixes from manual testing
- Fixed xterm cursor positioning (\n → \r\n conversion)
- Fixed Lua output newlines and added `> ` prompt
- Fixed nil output for undefined variables
- Added predev script for auto-rebuilding packages
- Created issues #178 (Process Raw Input Handling) and #179 (REPL Multi-line Input)
- Updated GitHub issue #140 with new sub-issues
- All 63 lua-runtime tests pass, all 1135 website tests pass
- PR #176 ready for review

### 2025-12-12 05:35
- Completed #172: Lua Runtime Package
- Created new `@lua-learning/lua-runtime` package
- Implemented LuaEngineFactory for shared Lua engine setup
- Implemented LuaReplProcess for interactive REPL mode (with io.read() support)
- Implemented LuaScriptProcess for script file execution
- Implemented LuaCommand implementing ICommand interface
- Added error formatting with [error] prefix
- Integrated lua command into shell via useShell hook
- All 58 lua-runtime tests pass, all 1135 website tests pass
- Build succeeds, lint passes
- Ready for PR

### 2025-12-12 05:07
- Merged PR #175 to `epic-140`
- Sub-issue #171 complete

### 2025-12-12 04:59
- Completed #171: Process Control UI
- Created useProcessManager hook for React state management
- Added StopButton component with stop icon
- Integrated stop button into ShellTerminal (visible when process running)
- Implemented input routing to processes
- Implemented Ctrl+C to stop running process
- All unit tests pass, mutation score 77.78% (surviving mutants are equivalent)
- Ready for PR

### 2025-12-12 04:47
- Started work on #171: Process Control UI
- Created branch `171-process-control-ui` from `epic-140`

### 2025-12-12 04:40
- Merged PR #174 to `epic-140`
- Sub-issue #170 complete

### 2025-12-12 04:15
- Completed #170: Shell Interface Design
- Created PR #174 targeting `epic-140`
- All interfaces, adapters, and ProcessManager implemented with 100% mutation coverage

### 2025-12-12 04:03
- Started work on #170: Shell Interface Design
- Created branch `170-shell-interface-design` from `epic-140`

### 2025-12-12
- Epic started
- Created sub-issues #170, #171, #172, #173
- Set up epic worktree

## Key Files

<!-- Populated as files are created/modified -->

### Interfaces
- `packages/shell-core/src/interfaces/ShellContext.ts` - Execution context for commands
- `packages/shell-core/src/interfaces/IProcess.ts` - Long-running process interface
- `packages/shell-core/src/interfaces/ICommand.ts` - Command interface returning IProcess | void
- `packages/shell-core/src/interfaces/index.ts` - Interface exports

### Process Management
- `packages/shell-core/src/ProcessManager.ts` - Manages foreground process lifecycle
- `packages/shell-core/src/adapters/LegacyCommandAdapter.ts` - Adapts legacy Command to ICommand

### Updated
- `packages/shell-core/src/CommandRegistry.ts` - Added ICommand support and executeWithContext
- `packages/shell-core/src/index.ts` - Exports new interfaces and classes

### UI Components (from #171)
- `lua-learning-website/src/hooks/useProcessManager.ts` - React hook wrapping ProcessManager
- `lua-learning-website/src/components/StopButton/StopButton.tsx` - Stop button component
- `lua-learning-website/src/components/ShellTerminal/ShellTerminal.tsx` - Updated with process control

### Lua Runtime Package (from #172)
- `packages/lua-runtime/src/LuaEngineFactory.ts` - Factory for creating Lua engines with callbacks
- `packages/lua-runtime/src/LuaReplProcess.ts` - Interactive REPL process (implements IProcess)
- `packages/lua-runtime/src/LuaScriptProcess.ts` - Script execution process (implements IProcess)
- `packages/lua-runtime/src/LuaCommand.ts` - Lua command (implements ICommand)
- `packages/lua-runtime/src/index.ts` - Public API exports

### Integration (from #172)
- `lua-learning-website/src/hooks/useShell.ts` - Updated with LuaCommand registration and executeCommandWithContext

### Process Key Handling (from #178)
- `packages/shell-core/src/interfaces/IProcess.ts` - Added KeyModifiers type, supportsRawInput, handleKey
- `packages/shell-core/src/ProcessManager.ts` - Added supportsRawInput() and handleKey() methods
- `packages/lua-runtime/src/LuaReplProcess.ts` - Implemented command history and handleKey() for arrow navigation
- `lua-learning-website/src/hooks/useProcessManager.ts` - Added supportsRawInput() and handleKey()
- `lua-learning-website/src/components/ShellTerminal/ShellTerminal.tsx` - Routes arrow keys to process

### Multi-line Input Support (from #179)
- `packages/lua-runtime/src/LuaEngineFactory.ts` - Added isCodeComplete() and CodeCompletenessResult type
- `packages/lua-runtime/src/LuaReplProcess.ts` - Added multi-line buffering, continuation mode, cancelInput()

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
