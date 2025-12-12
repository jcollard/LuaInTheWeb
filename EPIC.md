# Epic #140: [Epic] Shell Process Model with Lua Execution

**Status:** In Progress (2/4 complete)
**Branch:** epic-140
**Created:** 2025-12-12
**Last Updated:** 2025-12-12 05:07

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
| #172 | Lua Runtime Package | ⏳ Pending | - | Depends on #170 |
| #173 | Remove Legacy UI Components | ⏳ Pending | - | Depends on #171, #172 |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

**Implementation Order:**
```
#170 (interfaces) → #171 + #172 (parallel) → #173 (cleanup)
```

## Progress Log

<!-- Updated after each sub-issue completion -->

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

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
