# Epic #20: File API / Workspace

**Status:** In Progress (4/5 complete)
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
┌─────────────────────────────────────────────────────────────────┐
│                      Workspace Manager                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  /my-files   │  │   /project   │  │  /research   │   ...    │
│  │ (Virtual FS) │  │ (Local FS)   │  │ (Virtual FS) │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           ▼                                     │
│                  CompositeFileSystem                            │
│              (routes by path prefix)                            │
│                           │                                     │
│                           ▼                                     │
│                     IFileSystem                                 │
│                           │                                     │
│          ┌────────────────┼────────────────┐                   │
│          ▼                ▼                ▼                   │
│     Shell Commands   Lua Scripts    File Explorer              │
└─────────────────────────────────────────────────────────────────┘
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

### AD-4: Multi-Mount Workspace Architecture (from #200)

**Decision:** Use multi-mount architecture where multiple workspaces are simultaneously accessible at different paths.

**Architecture:**
- Each workspace is mounted at a unique path (e.g., `/my-files`, `/project`)
- `CompositeFileSystem` routes operations to the correct workspace based on path prefix
- Virtual root `/` lists all mount points as directories
- No "active workspace" concept - the shell's cwd determines context

**Mount Path Generation:**
- Workspace name → slug: "My Files" → `/my-files`
- Collision handling: `/project`, `/project-2`, `/project-3`
- Default workspace always at `/my-files`

**Trade-offs:**
- (+) Multiple workspaces visible and accessible simultaneously
- (+) Shell navigation naturally determines workspace context
- (+) Consistent Unix-like filesystem model
- (-) Slightly more complex than single-active model

## Sub-Issues

| # | Title | Status | Branch | Notes |
|---|-------|--------|--------|-------|
| #198 | File System Access API Research | ✅ Complete | - | See [research doc](docs/file-system-access-api-research.md) |
| #199 | FileSystemAccessAPI IFileSystem Implementation | ✅ Complete | 199-filesystemaccessapi-ifilesystem-implementation | Merged in PR #205 |
| #200 | Workspace State Management | ✅ Complete | 200-workspace-state-management | useWorkspaceManager + CompositeFileSystem (AD-4) |
| #201 | Workspace UI Components | ✅ Complete | 201-workspace-ui-components | WorkspaceTabs + AddWorkspaceDialog + FileExplorer integration |
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
- **#201 Complete** - Workspace UI Components
  - Created `WorkspaceTabs` component for workspace navigation
  - Created `AddWorkspaceDialog` for creating new workspaces (virtual and local)
  - Integrated workspace UI into `FileExplorer` component
  - Added `workspaceProps` to `FileExplorerProps` for optional workspace management
  - Integrated `useWorkspaceManager` hook in `IDELayout`
  - Added E2E tests for workspace UI flows
  - Full theme support (light/dark mode)
- **#200 Complete (Updated)** - Workspace State Management with Multi-Mount Architecture
  - Created `CompositeFileSystem` in shell-core (routes paths to mounted filesystems)
  - Created `useWorkspaceManager` hook for multi-workspace management
  - Created `virtualFileSystemFactory` for workspace-isolated localStorage filesystems
  - **Multi-mount architecture (AD-4):** Workspaces mounted at unique paths (/my-files, /project)
  - Features: add/remove workspaces, mount path generation, localStorage persistence
  - No "active workspace" - shell cwd determines context via CompositeFileSystem
  - Local workspaces marked as 'disconnected' on page reload (handle re-request required)
  - Legacy data migration: rootPath → mountPath
  - 111 unit tests (66 CompositeFileSystem + 45 useWorkspaceManager)
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

### Created (from #199, #200)
- `packages/shell-core/src/FileSystemAccessAPIFileSystem.ts` - File System Access API implementation
- `packages/shell-core/src/CompositeFileSystem.ts` - Multi-mount filesystem router
- `lua-learning-website/src/hooks/useWorkspaceManager.ts` - Workspace state management hook
- `lua-learning-website/src/hooks/workspaceTypes.ts` - Workspace type definitions
- `lua-learning-website/src/hooks/virtualFileSystemFactory.ts` - Workspace-isolated virtual filesystem

### To Be Created (#201, #202)
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
