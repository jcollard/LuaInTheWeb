# Phase 5: Explorer UX Polish

**Status**: Approved
**Author**: Claude & Joseph
**Created**: Mon, Dec 8, 2025
**Updated**: Mon, Dec 8, 2025
**Parent Epic**: [IDE-Style Code Editor](./epic.md)

## Summary

Fix bugs and improve UX in the file explorer, focusing on file creation workflow, tab state management, and error handling. These are polish items discovered after Phase 4 completion.

## Problem Statement

The file explorer has several UX issues that impact the user experience:

1. **Untitled file cannot be saved** - IDE loads with "untitled.lua" but there's no way to save it to the filesystem
2. **Silent failures on rename** - Renaming a file to an existing name fails without feedback
3. **Poor new file workflow** - Creating a file auto-names it "new-file.lua" which may conflict; should use inline rename
4. **Data loss on tab switch** - Editing a file and switching tabs loses unsaved changes
5. **No file moving** - Cannot move files between folders (drag-and-drop stretch goal from Phase 4)

## Proposed Solution

1. Remove the "untitled.lua" concept or provide a "Save As" flow
2. Show error messages when operations fail (rename conflicts, etc.)
3. New file creation should immediately enter inline rename mode with a unique default name
4. Track unsaved content per tab, restore when switching back
5. Implement drag-and-drop for file moving (optional, lower priority)

## Requirements

### Functional Requirements

- [ ] **BUG**: Remove or fix "untitled.lua" - either save to filesystem on first edit or provide Save As
- [ ] **BUG**: Show error toast/message when rename fails due to name conflict
- [ ] **BUG**: Show error toast/message when file creation fails due to name conflict
- [ ] **UX**: New file creation enters inline rename mode immediately
- [ ] **UX**: New file uses unique default name (e.g., "untitled-1.lua", "untitled-2.lua")
- [ ] **BUG**: Preserve unsaved changes when switching tabs (store in memory, not filesystem)
- [ ] **UX**: Prompt user before switching away from dirty tab (optional - VS Code doesn't do this)
- [ ] **FEATURE**: Drag-and-drop to move files between folders

### Non-Functional Requirements

- [ ] Error messages are clear and actionable
- [ ] No data loss during normal editor usage
- [ ] Consistent with VS Code behavior where applicable

## Technical Design

### Components Affected

- [ ] `IDEContext` - Track unsaved content per tab separately from filesystem
- [ ] `FileExplorer` - Handle new file creation with inline rename
- [ ] `useFileExplorer` - Manage rename state for newly created files
- [ ] `useFileSystem` - Return success/failure from operations (or throw errors)
- [ ] `TabBar` / `useTabBar` - Store unsaved content per tab

### Architecture

```
Current Flow (buggy):
Tab switch → Load file from filesystem → Previous edits lost

Fixed Flow:
Tab switch → Save current edits to memory map → Load new tab
          → If tab has unsaved memory content, use that instead of filesystem
```

### State Changes

```typescript
// In IDEContext or useTabBar
interface TabState {
  path: string
  name: string
  isDirty: boolean
  unsavedContent?: string  // NEW: Content that differs from filesystem
}

// Track unsaved content separately
const [unsavedContent, setUnsavedContent] = useState<Map<string, string>>(new Map())
```

### Error Handling

```typescript
// Option 1: Return success/failure
const success = filesystem.renameFile(oldPath, newPath)
if (!success) {
  showError("A file with that name already exists")
}

// Option 2: Throw and catch (current pattern)
try {
  filesystem.renameFile(oldPath, newPath)
} catch (error) {
  showError(error.message)
}
```

## New Components

### Toast (Error Notifications)

```
src/components/Toast/
├── Toast.tsx              # Pure UI - notification display
├── Toast.module.css       # Scoped styles
├── Toast.test.tsx         # Component tests
├── useToast.ts            # Hook for showing/hiding toasts
├── useToast.test.ts       # Hook tests
├── types.ts               # ToastProps, ToastType interfaces
└── index.ts               # Barrel exports
```

## Edge Cases to Handle

- [ ] **Tab switching with unsaved content**: Content must persist across rapid tab switches
- [ ] **Creating file while rename in progress**: Should complete or cancel current rename first
- [ ] **Renaming to same name**: Should be a no-op, not an error
- [ ] **Empty filename**: Reject with clear error message
- [ ] **Filename with invalid characters**: Reject with list of forbidden chars
- [ ] **Very long filenames**: Truncate display, allow full name
- [ ] **Creating file in non-existent folder**: Should not happen (UI only shows valid targets)
- [ ] **Drag file to same folder**: No-op, not an error
- [ ] **Drag file while editing**: Should save unsaved content first
- [ ] **Multiple rapid file creations**: Each should get unique name
- [ ] **Error toast overflow**: Stack or queue multiple errors gracefully
- [ ] **Tab close with unsaved changes**: Currently loses changes (addressed in Step 1)

## Implementation Plan

### Step 1: Fix Tab State Loss (HIGH PRIORITY)

**Tests First:**
1. [ ] **TEST**: Editing file A, switching to file B, switching back to A preserves edits
2. [ ] **TEST**: Dirty indicator persists across tab switches
3. [ ] **TEST**: Saving file clears unsaved content from memory

**Implementation:**
4. [ ] Add `unsavedContent` Map to track edits per tab
5. [ ] On tab switch, save current editor content to map
6. [ ] On tab select, load from unsavedContent map if exists, else from filesystem
7. [ ] On save, clear entry from unsavedContent map

**Verification:**
8. [ ] All tests pass
9. [ ] Manual test: edit, switch, switch back - edits preserved

### Step 2: Fix Error Handling

**Tests First:**
1. [ ] **TEST**: Renaming to existing name shows error message
2. [ ] **TEST**: Creating file with existing name shows error message
3. [ ] **TEST**: Error message clears after timeout or user action

**Implementation:**
4. [ ] Add error state to IDEContext or create useNotifications hook
5. [ ] Wrap filesystem operations in try/catch
6. [ ] Display error toast/banner on failure
7. [ ] Auto-dismiss after 5 seconds or on click

**Verification:**
8. [ ] All tests pass
9. [ ] Manual test: try to create duplicate file - see error

### Step 3: Improve New File Creation

**Tests First:**
1. [ ] **TEST**: New file button creates file and enters rename mode
2. [ ] **TEST**: Default name is unique (untitled-1.lua, untitled-2.lua, etc.)
3. [ ] **TEST**: Pressing Escape cancels creation and deletes the file
4. [ ] **TEST**: Pressing Enter confirms the name

**Implementation:**
5. [ ] Generate unique filename before creation
6. [ ] Create file in filesystem
7. [ ] Immediately trigger rename mode on the new file
8. [ ] Handle cancel (Escape) by deleting the newly created file

**Verification:**
9. [ ] All tests pass
10. [ ] Manual test: create multiple new files - unique names, inline rename works

### Step 4: Fix Untitled.lua Issue

**Tests First:**
1. [ ] **TEST**: IDE loads without untitled.lua if filesystem has files
2. [ ] **TEST**: IDE loads with welcome state if filesystem is empty
3. [ ] **TEST**: First file creation works from empty state

**Implementation:**
4. [ ] Remove hardcoded "untitled.lua" from initial state
5. [ ] Show welcome/empty state when no files exist
6. [ ] Guide user to create their first file

**Verification:**
7. [ ] All tests pass
8. [ ] Manual test: clear localStorage, reload - see empty state

### Step 5: Drag-and-Drop (Lower Priority)

**Tests First:**
1. [ ] **TEST**: File can be dragged
2. [ ] **TEST**: Folder accepts drop
3. [ ] **TEST**: Dropping file on folder moves it
4. [ ] **TEST**: Dropping file on root moves to root
5. [ ] **TEST**: Cannot drop folder into itself

**Implementation:**
6. [ ] Add draggable attribute to FileTreeItem
7. [ ] Add drop zone handling to folders
8. [ ] Implement moveFile in useFileSystem
9. [ ] Update file path and any open tabs

**Verification:**
10. [ ] All tests pass
11. [ ] Manual test: drag file between folders

## Testing Strategy

### Unit Tests

| Component | Tests |
|-----------|-------|
| IDEContext | unsaved content tracking, tab switch preserves edits |
| useFileSystem | error throwing on conflicts |
| FileExplorer | new file enters rename mode, unique naming |
| useTabBar | unsaved content per tab |

### Integration Tests

- [ ] Edit file → switch tab → switch back → edits preserved
- [ ] Create file with existing name → error shown → can retry
- [ ] Create new file → rename inline → file created with new name
- [ ] Drag file to folder → file moved → tabs updated

### Manual Testing Checklist

- [ ] Edit a file, switch tabs, switch back - changes preserved
- [ ] Try to rename file to existing name - see error
- [ ] Create new file - inline rename activates
- [ ] Create multiple new files - unique names generated
- [ ] Clear localStorage, reload - see empty/welcome state
- [ ] Drag file to different folder - file moves

## E2E Testing

### Test Page

- **Route**: `/editor` (main IDE route - no separate test page needed)
- **Location**: `e2e/explorer-polish.spec.ts`

### E2E Test Cases

- [ ] **E2E**: Edit file, switch to another tab, switch back - edits are preserved
- [ ] **E2E**: Edit file, switch tab, save original - dirty indicator clears correctly
- [ ] **E2E**: Create new file via toolbar - inline rename mode activates
- [ ] **E2E**: Create multiple new files - each gets unique default name
- [ ] **E2E**: Rename file to existing name - error toast appears
- [ ] **E2E**: Error toast auto-dismisses after timeout
- [ ] **E2E**: Clear localStorage, reload page - shows empty/welcome state
- [ ] **E2E**: Create first file from empty state - works correctly
- [ ] **E2E**: Drag file from one folder to another - file moves (if implemented)
- [ ] **E2E**: Cancel new file creation with Escape - file is not created

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Memory usage with many unsaved files | Performance | Low | Limit unsaved content size, warn user |
| Complex tab state management | Bugs | Medium | Thorough testing, simple state model |
| Drag-and-drop browser compatibility | Broken feature | Low | Test across browsers, graceful fallback |

## Dependencies

- Phase 4: Explorer Panel (completed)

## Success Metrics

- [ ] No data loss when switching tabs
- [ ] Clear error messages on all failure cases
- [ ] New file creation feels natural (inline rename)
- [ ] Can organize files into folders via drag-and-drop

---

## Approval

- [x] Technical Review
- [x] TDD Compliance Review
- [x] Testing Plan Review
- [x] E2E Testing Plan Review
