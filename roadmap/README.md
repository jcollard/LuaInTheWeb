# Roadmap

This directory contains implementation plans for features and improvements.

## Directory Structure

Epics and their phases are organized into subdirectories:

```
roadmap/
├── README.md           # This file
├── _template.md        # Template for new plans
└── {epic-name}/        # Epic directory
    ├── epic.md         # Epic overview
    ├── NNN-phase.md    # Phase plans
    └── reviews/        # Code review records
```

## Creating a New Plan

1. For a new epic: Create a directory `roadmap/{epic-name}/`
2. Copy `_template.md` to `{epic-name}/epic.md` or `{epic-name}/NNN-phase.md`
3. Fill out all sections of the template
4. Get plan approval before implementation begins
5. Update status as work progresses

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
| [IDE-Style Code Editor](./ide-editor/epic.md) | Completed | VS Code-style IDE at `/editor` with Explorer, Editor, Terminal, REPL |

### Active Phases

*No active phases - IDE-Style Code Editor epic is complete!*

## Completed Plans

| Plan | Completed | Description |
|------|-----------|-------------|
| [Phase 5: Explorer UX Polish](./ide-editor/005-explorer-polish.md) | Dec 8, 2025 | Bug fixes and UX improvements for file explorer |
| [Phase 4: Explorer](./ide-editor/004-explorer.md) | Dec 8, 2025 | File tree with virtual filesystem |
| [Phase 3: IDE Shell](./ide-editor/003-ide-shell.md) | Dec 7, 2025 | Full IDE layout at `/editor` route |
| [Phase 2: Panel Layout](./ide-editor/002-panels.md) | Dec 7, 2025 | Resizable VS Code-style panels |
| [Phase 1.5: E2E Testing Foundation](./ide-editor/001.5-e2e-tests.md) | Dec 7, 2025 | Playwright setup, E2E tests, test pages, documentation |
| [Phase 1: Embeddable Editor](./ide-editor/001-embeddable.md) | Dec 7, 2025 | Standalone editor for examples/challenges |
| [Phase 0: Foundation](./ide-editor/000-foundation.md) | Dec 7, 2025 | Extract hooks, add React Router, setup Monaco |
