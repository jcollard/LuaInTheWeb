# Epic #183: Improve Browser Responsiveness During Long-Running Lua Loops

**Status:** In Progress (1/4 complete)
**Branch:** epic-183
**Created:** 2025-12-13
**Last Updated:** 2025-12-13

## Overview

Infinite or long-running Lua loops (e.g., `while i > 0 do i = i + 1; print(i) end`) cause browser unresponsiveness because wasmoon's `engine.doString()` blocks the JavaScript event loop until completion. The current stop mechanism only works when the process is waiting on `io.read()`.

**Solution Components:**
1. **Debug Hook with Instruction Counting** - Use Lua's `debug.sethook` to periodically check instruction count and prompt users to continue or stop
2. **Output Throttling** - Batch `print()` outputs at ~60fps to reduce DOM pressure
3. **Configurable Limits** - Allow customization for rare cases needing extended execution

## Architecture Decisions

<!-- Document key decisions as work progresses -->

### Line Hooks vs Count Hooks (#192)
- **Decision**: Use line-based debug hooks (`"l"`) instead of count-based hooks
- **Reason**: wasmoon's count hooks don't fire; line hooks work correctly
- **Impact**: Counting is per-line rather than per-instruction, but still effective

### Synchronous Callbacks (#192)
- **Decision**: `onInstructionLimitReached` must be synchronous (return boolean, not Promise)
- **Reason**: Lua debug hooks can't await async JS functions ("attempt to yield across a C-call boundary")
- **Impact**: UI prompts must use synchronous patterns (e.g., `confirm()` or pre-set flags)

### Explicit Hook Setup (#192)
- **Decision**: Callers must wrap user code with `__setup_execution_hook()` and `__clear_execution_hook()`
- **Reason**: Debug hooks don't persist across `engine.doString()` calls in wasmoon
- **Impact**: Processes (#194) will handle hook setup/teardown

## Sub-Issues

| # | Title | Status | Dependencies | Notes |
|---|-------|--------|--------------|-------|
| #192 | Add Execution Control Infrastructure to LuaEngineFactory | ✅ Complete | - | Merged PR #203 |
| #193 | Add Output Throttling to Print Callback | ⏳ Pending | - | - |
| #194 | Integrate Stop Request and Continuation Prompt into Processes | ⏳ Pending | #192 | - |
| #195 | Add Comprehensive Tests for Execution Control | ⏳ Pending | #192, #193, #194 | - |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-13
- Epic started
- Started work on #192: Add Execution Control Infrastructure to LuaEngineFactory
- Completed #192: Merged PR #203 to epic-183

## Key Files

<!-- Populated as files are created/modified -->

- `packages/lua-runtime/src/LuaEngineFactory.ts` - Core engine with debug hooks and output throttling
- `packages/lua-runtime/src/LuaReplProcess.ts` - REPL process with stop/continuation support
- `packages/lua-runtime/src/LuaScriptProcess.ts` - Script process with stop/continuation support

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
