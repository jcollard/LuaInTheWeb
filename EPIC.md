# Epic #20: File API / Workspace

**Status:** In Progress (2/5 complete)
**Branch:** epic-20
**Created:** 2025-12-13
**Last Updated:** 2025-12-13

## Overview

Enable users to work with files on their actual computer (not just browser localStorage) by implementing the File System Access API and adding workspace management features.

**Goals:**
- Implement File System Access API backend for IFileSystem
- Create workspace management UI (tabs, dialogs)
- Integrate workspaces with shell and file explorer
- Graceful fallback for unsupported browsers

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Workspace Manager                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │ Virtual FS  │  │  Local FS   │  │  Remote FS  │     │
│  │(localStorage)│  │ (File API) │  │  (future)   │     │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘     │
│         │                │                │             │
│         └────────────────┼────────────────┘             │
│                          ▼                              │
│                   IFileSystem                           │
│                          │                              │
│         ┌────────────────┼────────────────┐            │
│         ▼                ▼                ▼            │
│    Shell Commands   Lua Scripts    File Explorer       │
└─────────────────────────────────────────────────────────┘
```

## Architecture Decisions

### AD-1: Cache-Based Sync Wrapper (from #198)

**Decision:** Use a cache-based synchronous wrapper for the async File System Access API.

**Rationale:** The existing `IFileSystem` interface is synchronous, but the File System Access API is entirely async. To avoid breaking changes throughout the codebase, we'll:
1. Pre-load directory structure into an in-memory cache on initialization
2. Synchronous read operations read from cache
3. Write operations update cache immediately and queue async writes

**Trade-offs:**
- (+) No changes to existing commands or shell
- (+) Consistent behavior with virtual filesystem
- (-) Cache must be kept in sync with disk
- (-) Large directories may have memory impact

### AD-2: Graceful Browser Degradation (from #198)

**Decision:** Support Chromium browsers (Chrome, Edge, Opera) with graceful fallback for others.

**Browser Support:**
| Browser | Support |
|---------|---------|
| Chrome/Edge 105+ | Full |
| Opera 91+ | Full |
| Firefox | Virtual workspace only |
| Safari | Virtual workspace only |
| Mobile | Virtual workspace only |

**Global Coverage:** ~34% of users have full support

### AD-3: Session-Only Permissions (from #198)

**Decision:** Use session-only permissions (user re-grants on page reload).

**Rationale:** Persistent permissions are Chrome-only and add complexity. Clear UX messaging about re-granting is simpler and more portable.

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #198 | File System Access API Research | ✅ Complete | - | See [research doc](docs/file-system-access-api-research.md) |
| #199 | FileSystemAccessAPI IFileSystem Implementation | ✅ Complete | 199-filesystemaccessapi-ifilesystem-implementation | Merged in PR #205 |
| #200 | Workspace State Management | ⏳ Pending | - | Depends on #199 |
| #201 | Workspace UI Components | ⏳ Pending | - | Depends on #200 |
| #202 | Shell Multi-Workspace Integration | ⏳ Pending | - | Depends on #199, #200, #201 |

**Status Legend:**
- ⏳ Pending - Not yet started
- 🔄 In Progress - Currently being worked on
- ✅ Complete - Merged to epic branch
- ❌ Blocked - Has unresolved blockers

## Dependencies

**Dependency Graph:**
```
#198 (Research)
  │
  ▼
#199 (FS Implementation)
  │
  ├──────────────┐
  ▼              ▼
#200 (State)   (also needed by #202)
  │
  ▼
#201 (UI)
  │
  ▼
#202 (Shell Integration) ← depends on #199, #200, #201
```

## Progress Log

<!-- Updated after each sub-issue completion -->

### 2025-12-13
- **#199 Complete** - FileSystemAccessAPI IFileSystem Implementation
  - Merged PR #205 to epic-20
  - Cache-based synchronous wrapper over async File System Access API
  - 68 unit tests, 81.58% mutation score
  - Type augmentations for FileSystemDirectoryHandle iterator methods
- Epic started
- Foundation already complete from Epic #140:
  - IFileSystem interface
  - ExternalFileSystem adapter
  - Path utilities
  - All commands use filesystem abstraction
- **#198 Complete** - File System Access API Research
  - GO decision: API is suitable for local workspace feature
  - Browser support: ~34% (Chromium-only)
  - Key decisions: cache-based sync wrapper, graceful fallback, session permissions
  - Full research: [docs/file-system-access-api-research.md](docs/file-system-access-api-research.md)

## Key Files

### Existing (from Epic #140)
- `packages/shell-core/src/types.ts` - IFileSystem interface
- `packages/shell-core/src/createFileSystemAdapter.ts` - Adapter factory
- `packages/shell-core/src/pathUtils.ts` - Path utilities

### New (to be created)
- `packages/shell-core/src/FileSystemAccessAPIFileSystem.ts` - New FS implementation
- `lua-learning-website/src/hooks/useWorkspaceManager.ts` - Workspace state
- `lua-learning-website/src/components/WorkspaceTabs/` - UI components
- `lua-learning-website/src/components/AddWorkspaceDialog/` - UI components

## Open Questions

<!-- Questions that arise during implementation -->

1. ~~How to handle permission re-requests on page reload for local workspaces?~~
   - **Resolved (AD-3):** Use clear UX messaging. Show "reconnect" button for previously-used workspaces.
2. ~~Should we support persistent permissions (Chrome-only feature)?~~
   - **Resolved (AD-3):** No. Session-only permissions are simpler and more portable.

## Blockers

(none)
