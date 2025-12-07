# Roadmap

This directory contains implementation plans for features and improvements.

## Creating a New Plan

1. Copy `_template.md` to a new file named after your feature (e.g., `user-authentication.md`)
2. Fill out all sections of the template
3. Get plan approval before implementation begins
4. Update status as work progresses

## Plan States

- **Draft**: Plan is being developed, not ready for review
- **Ready for Review**: Plan is complete and awaiting approval
- **Approved**: Plan is approved, implementation can begin
- **In Progress**: Implementation is underway
- **Completed**: Feature is fully implemented and tested
- **Abandoned**: Plan was not pursued (document why)

## Current Plans

### Epics

| Epic | Status | Description |
|------|--------|-------------|
| [IDE-Style Code Editor](./ide-editor-epic.md) | Draft | VS Code-style IDE at `/editor` with Explorer, Editor, Terminal, REPL |

### Active Phases

| Plan | Status | Dependencies | Description |
|------|--------|--------------|-------------|
| [Phase 0: Foundation](./ide-editor-000-foundation.md) | Draft | None | Extract hooks, add React Router, setup Monaco |
| [Phase 1: Embeddable Editor](./ide-editor-001-embeddable.md) | Draft | Phase 0 | Standalone editor for examples/challenges |
| [Phase 2: Panel Layout](./ide-editor-002-panels.md) | Draft | Phase 0 | Resizable VS Code-style panels |
| [Phase 3: IDE Shell](./ide-editor-003-ide-shell.md) | Draft | Phases 1, 2 | Full IDE layout at `/editor` route |
| [Phase 4: Explorer](./ide-editor-004-explorer.md) | Draft | Phase 3 | File tree with virtual filesystem |

## Completed Plans

| Plan | Completed | Description |
|------|-----------|-------------|
| *None yet* | - | - |
