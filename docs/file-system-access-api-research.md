# File System Access API Research

**Issue:** #198
**Epic:** #20 - File API / Workspace
**Date:** 2025-12-13
**Status:** Complete

## Executive Summary

**Recommendation: GO** - The File System Access API is suitable for implementing local workspace functionality with appropriate fallbacks.

### Key Findings

| Aspect | Status | Notes |
|--------|--------|-------|
| API Maturity | Stable | Core APIs stable in Chromium browsers |
| Browser Support | Limited | ~34% global (Chromium-only) |
| Security Model | Strong | User gesture + permission required |
| IFileSystem Fit | Good | Async wrapper needed |
| Fallback Strategy | Clear | Graceful degradation possible |

---

## 1. API Capabilities

### Core Interfaces

| Interface | Purpose | Availability |
|-----------|---------|--------------|
| `FileSystemHandle` | Base class for file/directory handles | Chromium 86+ |
| `FileSystemFileHandle` | Read/write individual files | Chromium 86+ |
| `FileSystemDirectoryHandle` | Directory operations | Chromium 86+ |
| `FileSystemWritableFileStream` | Async file writing | Chromium 86+ |

### Key Methods

#### Directory Selection
```typescript
// Request directory access (requires user gesture)
const dirHandle = await window.showDirectoryPicker({
  id: 'workspace',           // Remember last directory
  mode: 'readwrite',         // Read + write access
  startIn: 'documents'       // Starting location hint
});
```

#### Directory Operations
```typescript
// List contents (async iterator)
for await (const [name, handle] of dirHandle.entries()) {
  console.log(handle.kind, name); // 'file' or 'directory'
}

// Get subdirectory
const subDir = await dirHandle.getDirectoryHandle('subdir', { create: true });

// Get file
const fileHandle = await dirHandle.getFileHandle('file.lua', { create: true });

// Delete entry
await dirHandle.removeEntry('filename');
```

#### File Operations
```typescript
// Read file
const file = await fileHandle.getFile();
const content = await file.text();

// Write file
const writable = await fileHandle.createWritable();
await writable.write('content');
await writable.close();
```

### Recursive Traversal Pattern
```typescript
async function* listRecursive(dir: FileSystemDirectoryHandle): AsyncGenerator<FileEntry> {
  for await (const [name, handle] of dir.entries()) {
    if (handle.kind === 'file') {
      yield { name, type: 'file', path: name };
    } else {
      yield { name, type: 'directory', path: name };
      yield* listRecursive(handle);
    }
  }
}
```

---

## 2. Browser Compatibility Matrix

| Browser | Support | Version | Notes |
|---------|---------|---------|-------|
| Chrome | Full | 105+ | Partial 86-104 |
| Edge | Full | 105+ | Partial 86-104 |
| Opera | Full | 91+ | Partial 72-90 |
| Firefox | None | - | No plans to implement |
| Safari | None | - | No support |
| Chrome Android | None | - | Mobile not supported |
| Safari iOS | None | - | Mobile not supported |

**Global Support:** ~34% of users

### Implications

- **Desktop Chromium browsers** are the target audience for local workspace feature
- **Non-Chromium browsers** will see "virtual workspace only" mode
- **Mobile browsers** will not have local workspace capability

---

## 3. Security Model

### Requirements

1. **Secure Context (HTTPS)**: API only available over HTTPS
2. **User Gesture**: `showDirectoryPicker()` must be triggered by user action (click, etc.)
3. **Explicit Permission**: User must select directory in native file picker
4. **Mode-Based Access**: Read-only or read-write permission specified at request time

### Permission Persistence

- **Session Only**: Permissions last until tab is closed (by default)
- **Persistent Permissions**: Available in Chrome via `navigator.permissions.query()`
- **Re-Request on Reload**: User must re-grant access after page refresh

### Error Cases

| Error | Cause | User Action |
|-------|-------|-------------|
| `AbortError` | User cancelled picker | Show friendly message |
| `SecurityError` | Not HTTPS or no user gesture | Show requirements |
| `NotAllowedError` | Permission denied | Explain permission need |
| `NotFoundError` | File/directory deleted externally | Refresh or re-select |

---

## 4. IFileSystem Integration Analysis

### Current Interface (Synchronous)
```typescript
interface IFileSystem {
  getCurrentDirectory(): string
  setCurrentDirectory(path: string): void
  exists(path: string): boolean
  isDirectory(path: string): boolean
  isFile(path: string): boolean
  listDirectory(path: string): FileEntry[]
  readFile(path: string): string
  writeFile(path: string, content: string): void
  createDirectory(path: string): void
  delete(path: string): void
}
```

### Challenge: Sync vs Async

The File System Access API is **entirely asynchronous**, but `IFileSystem` is **synchronous**.

### Proposed Solution: Cache-Based Sync Wrapper

```typescript
class FileSystemAccessAPIFileSystem implements IFileSystem {
  private cache: Map<string, CachedEntry> = new Map();
  private handle: FileSystemDirectoryHandle;
  private cwd: string = '/';

  // Pre-load directory structure into cache
  async initialize(handle: FileSystemDirectoryHandle): Promise<void> {
    await this.loadDirectory('/', handle);
  }

  // Synchronous operations read from cache
  exists(path: string): boolean {
    return this.cache.has(this.resolvePath(path));
  }

  // Write operations update cache + queue async write
  writeFile(path: string, content: string): void {
    this.cache.set(path, { type: 'file', content });
    this.queueWrite(path, content); // Async, but don't wait
  }
}
```

### Alternative: Async IFileSystem

Could introduce `IAsyncFileSystem` interface, but this requires changes throughout the codebase (commands, shell, etc.).

**Recommendation:** Start with cache-based sync wrapper for minimal disruption.

---

## 5. Fallback Strategy

### Detection
```typescript
function isFileSystemAccessSupported(): boolean {
  return 'showDirectoryPicker' in window;
}
```

### User Experience by Browser

| Browser | Experience |
|---------|------------|
| Chrome/Edge | Full local workspace support |
| Firefox/Safari | Virtual workspace only, tooltip explains limitation |
| Mobile | Virtual workspace only |

### UI Approach

1. **"Add Workspace" Button** - Always visible
2. **On Click (unsupported)**: Show informative dialog explaining browser limitation
3. **On Click (supported)**: Open directory picker

### Messaging Example
```
"Local workspace requires Chrome, Edge, or Opera.
Your browser supports virtual workspaces stored in your browser."
```

---

## 6. Performance Considerations

### Large Directories

- **Lazy Loading**: Only load directory contents when accessed
- **Incremental Updates**: Cache invalidation on write operations
- **Progress Indication**: Show loading state for large directories

### File Watching

- **Not Supported**: No native file watching in File System Access API
- **Workaround**: Manual refresh button or polling (expensive)
- **Future**: `FileSystemObserver` is experimental, not ready

### Memory Management

- Cache size limits for very large workspaces
- Consider IndexedDB for persistence of file handles

---

## 7. Known Limitations

| Limitation | Impact | Mitigation |
|------------|--------|------------|
| No file watching | Changes outside browser not detected | Manual refresh |
| Permission on reload | User re-prompted after refresh | Clear UX messaging |
| Async-only API | IFileSystem is sync | Cache-based wrapper |
| Chromium-only | 34% browser support | Graceful fallback |
| No mobile | Mobile users excluded | Virtual workspace |
| Sensitive dirs blocked | Can't access system dirs | Expected behavior |

---

## 8. Implementation Approach

### Phase 1: Core Implementation (#199)
1. Create `FileSystemAccessAPIFileSystem` class
2. Implement cache-based sync wrapper
3. Handle async initialization
4. Error handling and permission management

### Phase 2: State Management (#200)
1. Workspace model with type discriminator
2. Active workspace tracking
3. Handle persistence (IndexedDB)

### Phase 3: UI Components (#201)
1. Workspace tabs
2. Add workspace dialog
3. Permission status indicators

### Phase 4: Integration (#202)
1. Shell context switching
2. File explorer integration
3. Browser detection messaging

---

## 9. Recommendation

### GO Decision Rationale

1. **Target Audience Fit**: LuaInTheWeb targets developers/learners, who predominantly use Chrome/Edge
2. **Clean Fallback**: Virtual workspace provides full functionality for unsupported browsers
3. **IFileSystem Compatibility**: Cache-based wrapper preserves existing architecture
4. **Future-Proof**: API is standardizing; Firefox may eventually implement

### Risks & Mitigations

| Risk | Probability | Mitigation |
|------|-------------|------------|
| Cache sync issues | Medium | Careful invalidation, user refresh option |
| Permission UX confusion | Low | Clear messaging, help tooltips |
| Performance on large dirs | Low | Lazy loading, size limits |

### Success Criteria

- [ ] Local workspace works in Chrome/Edge/Opera
- [ ] Graceful degradation in Firefox/Safari
- [ ] Clear messaging about browser requirements
- [ ] No breaking changes to existing commands

---

## References

- [MDN File System API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
- [MDN showDirectoryPicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)
- [WHATWG File System Spec](https://fs.spec.whatwg.org/)
- [Can I Use: Native Filesystem API](https://caniuse.com/native-filesystem-api)
