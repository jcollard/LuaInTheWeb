# Epic #324: Explore moving files for read-only workspaces to public/ and using manifest rather than adding them to ts files

**Status:** In Progress (3/5 complete)
**Branch:** epic-324
**Created:** 2025-12-18
**Last Updated:** 2025-12-18T16:41:18Z

## Overview

Currently, read-only workspace content (examples, documentation, built-in libraries) is embedded directly in TypeScript files as string constants (e.g., `examplesContent.ts` with 3600+ lines). This has several drawbacks:
- Large TS files that are difficult to maintain
- No syntax highlighting when editing content
- Content changes require recompiling TypeScript
- Harder to externally manage/version content

### Proposed Solution

Migrate to a manifest-based approach (already used for book content):
1. Move content files to `public/` directory structure
2. Create `manifest.json` for each workspace type
3. Use existing `fetchBookContent()` pattern to load content dynamically

### Workspaces to Migrate

| Workspace | Current Location | Target Location |
|-----------|-----------------|-----------------|
| Examples | `examplesContent.ts` (~3600 lines) | `public/examples/` |
| Libraries | `libraryDocumentation.ts` | `public/libs/` |
| Docs | `luaStdlibMarkdown/` | `public/docs/` |

### Reference Implementation

- See `public/adventures-in-lua-book/manifest.json` for manifest format
- See `hooks/bookFetcher.ts` for fetch implementation

## Architecture Decisions

<!-- Document key decisions as work progresses -->

1. **Separate text and binary content**: The `WorkspaceContent` interface separates text files (`Record<string, string>`) from binary files (`Record<string, Uint8Array>`) for type safety.
2. **Extension-based binary detection**: Binary files are identified by extension (`.png`, `.jpg`, `.jpeg`, `.gif`, `.bmp`, `.webp`, `.ico`) using case-insensitive matching.

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #328 | Create shared workspace fetcher infrastructure | ✅ Complete | 328-create-shared-workspace-fetcher-infrastructure | Merged PR #334 |
| #329 | Migrate Examples workspace to public/ | ✅ Complete | 329-migrate-examples-workspace-to-public | Merged PR #338 |
| #330 | Migrate Docs workspace to public/ | ✅ Complete | 330-migrate-docs-workspace-to-public | Pending PR |
| #331 | Migrate Library workspace to public/ | ⏳ Pending | - | Depends on #328 |
| #332 | Cleanup and verify read-only workspace migration | ⏳ Pending | - | Depends on #328, #329, #330, #331 |

**Status Legend:**
- ⏳ Pending - Not yet started
- ⏷ In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Dependency Graph

```
#328 (Shared Fetcher)
  ├── #329 (Examples)
  ├── #330 (Docs)
  └── #331 (Library)
        └── #332 (Cleanup) ← requires all above
```

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-18
- Epic started
- #328: Created workspaceFetcher.ts with text and binary file support
- #328: Completed - merged PR #334 to epic-324
- #329: Migrated examples workspace to public/ (~116KB bundle reduction)
- #329: Completed - merged PR #338 to epic-324
- #330: Migrated docs workspace to public/docs/ (shell.md, canvas.md, lua/*.md)
- #330: Deleted luaStdlibMarkdown/ (~1235 lines) and canvasDocumentation.ts
- #330: Created docsFetcher.ts with 100% mutation score
- #330: Docs workspace now loads asynchronously like examples/book

## Key Files

<!-- Populated as files are created/modified -->

- `src/hooks/workspaceFetcher.ts` - Generic workspace content fetcher with text/binary support
- `src/hooks/workspaceFetcher.test.ts` - Unit tests (20 tests, 80% mutation score)
- `src/hooks/docsFetcher.ts` - Docs workspace content fetcher (100% mutation score)
- `src/hooks/useDocsWorkspaceLoader.ts` - Hook to async load docs workspace
- `public/docs/manifest.json` - Manifest for docs workspace files
- `public/docs/*.md` - Static documentation files (shell.md, canvas.md, lua/*.md)

## Open Questions

<!-- Questions that arise during implementation -->

(none)

## Blockers

(none)
