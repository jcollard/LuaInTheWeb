# Phase 4: Explorer Panel

**Status**: Completed
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 8, 2025
**Parent Epic**: [IDE-Style Code Editor](./ide-editor-epic.md)

## Summary

Implement a file explorer panel with a virtual filesystem, enabling multi-file Lua projects. Users can create, rename, delete files and organize code across multiple modules.

## Problem Statement

Currently, the editor only supports a single file. Real-world Lua projects use multiple files with `require()`. Students need to:
- Create and organize multiple files
- Use Lua's module system
- See their project structure visually

## Proposed Solution

1. Create a virtual filesystem (in-memory, persisted to localStorage)
2. Build a file tree component mimicking VS Code's explorer
3. Implement Lua's `require()` to work with the virtual filesystem
4. Add file tabs for open files

## Requirements

### Functional Requirements

- [ ] File tree displays folder/file hierarchy
- [ ] Create new file/folder via context menu or button
- [ ] Rename files/folders inline
- [ ] Delete files/folders with confirmation
- [ ] Click file to open in editor
- [ ] Multiple files open as tabs
- [ ] Dirty indicator for unsaved changes
- [ ] `require("module")` loads from virtual filesystem
- [ ] Persist filesystem to localStorage

### Non-Functional Requirements

- [ ] Supports 100+ files without lag
- [ ] Keyboard navigation in file tree
- [ ] Accessible (screen reader support)
- [ ] Drag-and-drop to move files (stretch goal)

## Technical Design

### Architecture

```
Virtual Filesystem (localStorage)
        │
        ▼
┌─────────────────────────────────────────┐
│  useFileSystem() hook                    │
│  - files: Map<path, content>            │
│  - createFile, deleteFile, renameFile   │
│  - readFile, writeFile                  │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  FileExplorer component                  │
│  - FileTree (recursive)                  │
│  - FileTreeItem (file or folder)        │
│  - NewFileDialog                         │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  EditorPanel                             │
│  - TabBar (open files)                  │
│  - CodeEditor (current file)            │
└─────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────┐
│  Lua require() override                  │
│  - Intercepts require("module")         │
│  - Reads from virtual filesystem        │
│  - Caches loaded modules                │
└─────────────────────────────────────────┘
```

### Virtual Filesystem Design

```typescript
// File system structure
interface VirtualFile {
  name: string
  content: string
  createdAt: number
  updatedAt: number
}

interface VirtualFolder {
  name: string
  children: Map<string, VirtualFile | VirtualFolder>
}

interface FileSystemState {
  root: VirtualFolder
  version: number  // for change detection
}

// Hook API
interface UseFileSystemReturn {
  // State
  files: FileSystemState

  // File operations
  createFile: (path: string, content?: string) => void
  readFile: (path: string) => string | null
  writeFile: (path: string, content: string) => void
  deleteFile: (path: string) => void
  renameFile: (oldPath: string, newPath: string) => void

  // Folder operations
  createFolder: (path: string) => void
  deleteFolder: (path: string) => void

  // Utilities
  exists: (path: string) => boolean
  listDirectory: (path: string) => string[]
  getTree: () => TreeNode[]  // for rendering

  // Persistence
  exportProject: () => string  // JSON
  importProject: (json: string) => void
}
```

### File Tree Component

```typescript
interface FileTreeProps {
  tree: TreeNode[]
  selectedPath: string | null
  onSelect: (path: string) => void
  onCreateFile: (parentPath: string) => void
  onCreateFolder: (parentPath: string) => void
  onRename: (path: string) => void
  onDelete: (path: string) => void
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'folder'
  children?: TreeNode[]
  isExpanded?: boolean
}
```

### Lua require() Override

```typescript
// In useLuaEngine, override require to use virtual FS
const setupRequire = (engine: LuaEngine, fs: UseFileSystemReturn) => {
  engine.global.set('__virtual_require', (moduleName: string) => {
    // Try moduleName.lua
    let content = fs.readFile(`${moduleName}.lua`)

    // Try moduleName/init.lua
    if (!content) {
      content = fs.readFile(`${moduleName}/init.lua`)
    }

    if (!content) {
      throw new Error(`module '${moduleName}' not found`)
    }

    return content
  })

  await engine.doString(`
    local loaded = {}
    local original_require = require

    function require(modname)
      if loaded[modname] then
        return loaded[modname]
      end

      local content = __virtual_require(modname)
      local fn = load(content, modname)
      local result = fn()
      loaded[modname] = result or true
      return loaded[modname]
    end
  `)
}
```

### Tab Bar Component

```typescript
interface TabBarProps {
  tabs: TabInfo[]
  activeTab: string  // path
  onSelect: (path: string) => void
  onClose: (path: string) => void
}

interface TabInfo {
  path: string
  name: string
  isDirty: boolean
}
```

## New Components

### useFileSystem Hook

```
src/hooks/
├── useFileSystem.ts           # Virtual filesystem hook
├── useFileSystem.test.ts      # Hook tests
└── index.ts                   # Update barrel exports
```

### FileExplorer

```
src/components/FileExplorer/
├── FileExplorer.tsx           # Pure UI - main explorer container
├── FileExplorer.module.css    # Scoped styles
├── FileExplorer.test.tsx      # Component tests
├── useFileExplorer.ts         # Hook for explorer state (expanded nodes, selection)
├── useFileExplorer.test.ts    # Hook tests
├── types.ts                   # FileExplorerProps interface
└── index.ts                   # Barrel exports
```

### FileTree

```
src/components/FileTree/
├── FileTree.tsx               # Pure UI - recursive tree component
├── FileTree.module.css        # Scoped styles
├── FileTree.test.tsx          # Component tests
├── types.ts                   # TreeNode, FileTreeProps interfaces
└── index.ts                   # Barrel exports
```

### FileTreeItem

```
src/components/FileTreeItem/
├── FileTreeItem.tsx           # Pure UI - single tree item (file or folder)
├── FileTreeItem.module.css    # Scoped styles
├── FileTreeItem.test.tsx      # Component tests
├── types.ts                   # FileTreeItemProps interface
└── index.ts                   # Barrel exports
```

### ContextMenu

```
src/components/ContextMenu/
├── ContextMenu.tsx            # Pure UI - right-click menu
├── ContextMenu.module.css     # Scoped styles
├── ContextMenu.test.tsx       # Component tests
├── useContextMenu.ts          # Hook for menu positioning/visibility
├── useContextMenu.test.ts     # Hook tests
├── types.ts                   # ContextMenuProps interface
└── index.ts                   # Barrel exports
```

### TabBar

```
src/components/TabBar/
├── TabBar.tsx                 # Pure UI - file tabs
├── TabBar.module.css          # Scoped styles
├── TabBar.test.tsx            # Component tests
├── useTabBar.ts               # Hook for tab state management
├── useTabBar.test.ts          # Hook tests
├── types.ts                   # TabBarProps, TabInfo interfaces
└── index.ts                   # Barrel exports
```

### ConfirmDialog

```
src/components/ConfirmDialog/
├── ConfirmDialog.tsx          # Pure UI - confirmation modal
├── ConfirmDialog.module.css   # Scoped styles
├── ConfirmDialog.test.tsx     # Component tests
├── types.ts                   # ConfirmDialogProps interface
└── index.ts                   # Barrel exports
```

## Edge Cases to Handle

- [ ] **Empty filesystem**: Show "No files" message with "Create file" prompt
- [ ] **File name validation**: Reject invalid characters (/, \, :, *, ?, ", <, >, |)
- [ ] **Duplicate names**: Prevent creating file/folder with same name in same directory
- [ ] **Deep nesting**: Support at least 10 levels of folder nesting
- [ ] **Long file names**: Truncate with ellipsis, show full name on hover
- [ ] **Large files**: Warn when file exceeds 100KB
- [ ] **localStorage quota**: Detect and warn when approaching 5MB limit
- [ ] **Concurrent edits**: Handle rapid file operations gracefully
- [ ] **Special Lua files**: Handle init.lua as folder entry point for require()
- [ ] **Circular requires**: Detect and prevent infinite require() loops
- [ ] **Missing files**: Graceful error when require() can't find module
- [ ] **Unsaved changes**: Prompt before closing tab with dirty file
- [ ] **Delete folder with files**: Require confirmation, list affected files
- [ ] **Rename open file**: Update tab and editor state
- [ ] **Empty folder**: Allow creating and displaying empty folders

## Implementation Plan

### Step 1: Create useFileSystem Hook

**Tests First:**
1. [ ] **TEST**: useFileSystem initializes with empty root folder
2. [ ] **TEST**: createFile creates file at given path
3. [ ] **TEST**: readFile returns file content
4. [ ] **TEST**: writeFile updates file content
5. [ ] **TEST**: deleteFile removes file
6. [ ] **TEST**: renameFile moves file to new path
7. [ ] **TEST**: createFolder creates folder at given path
8. [ ] **TEST**: deleteFolder removes folder and contents
9. [ ] **TEST**: exists returns true for existing paths
10. [ ] **TEST**: listDirectory returns children of folder
11. [ ] **TEST**: getTree returns hierarchical tree structure
12. [ ] **TEST**: State persists to localStorage
13. [ ] **TEST**: State loads from localStorage on init
14. [ ] **TEST**: Invalid file names are rejected
15. [ ] **TEST**: Duplicate names in same folder are rejected

**Implementation:**
16. [ ] Create useFileSystem.ts in src/hooks
17. [ ] Implement VirtualFile and VirtualFolder interfaces
18. [ ] Implement all CRUD operations
19. [ ] Add localStorage persistence with debouncing
20. [ ] Export from hooks/index.ts

**Verification:**
21. [ ] All tests pass
22. [ ] Lint passes

### Step 2: Create FileTreeItem Component

**Tests First:**
1. [ ] **TEST**: FileTreeItem renders file name
2. [ ] **TEST**: FileTreeItem renders folder name with chevron
3. [ ] **TEST**: FileTreeItem shows file icon for files
4. [ ] **TEST**: FileTreeItem shows folder icon for folders
5. [ ] **TEST**: FileTreeItem highlights when selected
6. [ ] **TEST**: FileTreeItem calls onClick when clicked
7. [ ] **TEST**: FileTreeItem calls onToggle when folder chevron clicked
8. [ ] **TEST**: FileTreeItem calls onContextMenu on right-click
9. [ ] **TEST**: FileTreeItem supports inline rename mode
10. [ ] **TEST**: FileTreeItem has correct aria-labels

**Implementation:**
11. [ ] Create FileTreeItem folder structure
12. [ ] Implement types.ts with FileTreeItemProps interface
13. [ ] Implement FileTreeItem.tsx as pure component
14. [ ] Add FileTreeItem.module.css with VS Code-like styling
15. [ ] Create index.ts barrel exports

**Verification:**
16. [ ] All tests pass
17. [ ] Lint passes

### Step 3: Create FileTree Component

**Tests First:**
1. [ ] **TEST**: FileTree renders empty state when no files
2. [ ] **TEST**: FileTree renders flat list of files
3. [ ] **TEST**: FileTree renders nested folders
4. [ ] **TEST**: FileTree expands folder when clicked
5. [ ] **TEST**: FileTree collapses folder when clicked again
6. [ ] **TEST**: FileTree highlights selected file
7. [ ] **TEST**: FileTree calls onSelect when file clicked
8. [ ] **TEST**: FileTree renders recursively for deep nesting
9. [ ] **TEST**: FileTree keyboard navigation (up/down arrows)
10. [ ] **TEST**: FileTree keyboard enter to select/toggle

**Implementation:**
11. [ ] Create FileTree folder structure
12. [ ] Implement types.ts with TreeNode, FileTreeProps interfaces
13. [ ] Implement FileTree.tsx as recursive component
14. [ ] Add FileTree.module.css
15. [ ] Create index.ts barrel exports

**Verification:**
16. [ ] All tests pass
17. [ ] Lint passes

### Step 4: Create ContextMenu Component

**Tests First:**
1. [ ] **TEST**: ContextMenu renders at specified position
2. [ ] **TEST**: ContextMenu renders menu items
3. [ ] **TEST**: ContextMenu calls onSelect when item clicked
4. [ ] **TEST**: ContextMenu closes when clicking outside
5. [ ] **TEST**: ContextMenu closes on Escape key
6. [ ] **TEST**: useContextMenu returns show/hide functions
7. [ ] **TEST**: useContextMenu tracks position
8. [ ] **TEST**: ContextMenu is keyboard navigable

**Implementation:**
9. [ ] Create ContextMenu folder structure
10. [ ] Implement types.ts with ContextMenuProps interface
11. [ ] Implement useContextMenu.ts hook
12. [ ] Implement ContextMenu.tsx as pure component
13. [ ] Add ContextMenu.module.css
14. [ ] Create index.ts barrel exports

**Verification:**
15. [ ] All tests pass
16. [ ] Lint passes

### Step 5: Create ConfirmDialog Component

**Tests First:**
1. [ ] **TEST**: ConfirmDialog renders title and message
2. [ ] **TEST**: ConfirmDialog renders confirm and cancel buttons
3. [ ] **TEST**: ConfirmDialog calls onConfirm when confirmed
4. [ ] **TEST**: ConfirmDialog calls onCancel when cancelled
5. [ ] **TEST**: ConfirmDialog closes on Escape key
6. [ ] **TEST**: ConfirmDialog traps focus within modal
7. [ ] **TEST**: ConfirmDialog has correct aria attributes

**Implementation:**
8. [ ] Create ConfirmDialog folder structure
9. [ ] Implement types.ts with ConfirmDialogProps interface
10. [ ] Implement ConfirmDialog.tsx as pure component
11. [ ] Add ConfirmDialog.module.css
12. [ ] Create index.ts barrel exports

**Verification:**
13. [ ] All tests pass
14. [ ] Lint passes

### Step 6: Create FileExplorer Component

**Tests First:**
1. [ ] **TEST**: FileExplorer renders FileTree
2. [ ] **TEST**: FileExplorer renders "New File" button
3. [ ] **TEST**: FileExplorer renders "New Folder" button
4. [ ] **TEST**: FileExplorer opens context menu on right-click
5. [ ] **TEST**: FileExplorer handles file selection
6. [ ] **TEST**: FileExplorer handles file creation
7. [ ] **TEST**: FileExplorer handles file deletion with confirm
8. [ ] **TEST**: FileExplorer handles file rename
9. [ ] **TEST**: useFileExplorer manages expanded folders state
10. [ ] **TEST**: useFileExplorer manages selected path state

**Implementation:**
11. [ ] Create FileExplorer folder structure
12. [ ] Implement types.ts with FileExplorerProps interface
13. [ ] Implement useFileExplorer.ts hook
14. [ ] Implement FileExplorer.tsx composing FileTree and ContextMenu
15. [ ] Add FileExplorer.module.css
16. [ ] Create index.ts barrel exports

**Verification:**
17. [ ] All tests pass
18. [ ] Lint passes

### Step 7: Create TabBar Component

**Tests First:**
1. [ ] **TEST**: TabBar renders list of tabs
2. [ ] **TEST**: TabBar highlights active tab
3. [ ] **TEST**: TabBar shows dirty indicator (*) for unsaved tabs
4. [ ] **TEST**: TabBar calls onSelect when tab clicked
5. [ ] **TEST**: TabBar calls onClose when close button clicked
6. [ ] **TEST**: TabBar scrolls horizontally when overflow
7. [ ] **TEST**: useTabBar manages open tabs state
8. [ ] **TEST**: useTabBar tracks dirty state per tab
9. [ ] **TEST**: useTabBar handles tab close with dirty check

**Implementation:**
10. [ ] Create TabBar folder structure
11. [ ] Implement types.ts with TabBarProps, TabInfo interfaces
12. [ ] Implement useTabBar.ts hook
13. [ ] Implement TabBar.tsx as pure component
14. [ ] Add TabBar.module.css with VS Code-like styling
15. [ ] Create index.ts barrel exports

**Verification:**
16. [ ] All tests pass
17. [ ] Lint passes

### Step 8: Integrate FileExplorer into SidebarPanel

**Tests First:**
1. [ ] **TEST**: SidebarPanel renders FileExplorer when explorer active
2. [ ] **TEST**: SidebarPanel passes filesystem hook to FileExplorer
3. [ ] **TEST**: SidebarPanel handles file selection event

**Implementation:**
4. [ ] Update SidebarPanel to render FileExplorer
5. [ ] Connect to IDEContext for file selection
6. [ ] Update SidebarPanel tests

**Verification:**
7. [ ] All tests pass
8. [ ] Lint passes

### Step 9: Integrate TabBar into EditorPanel

**Tests First:**
1. [ ] **TEST**: EditorPanel renders TabBar
2. [ ] **TEST**: EditorPanel shows editor for active tab
3. [ ] **TEST**: EditorPanel syncs code changes with file
4. [ ] **TEST**: EditorPanel prompts before closing dirty tab

**Implementation:**
5. [ ] Update EditorPanel to include TabBar
6. [ ] Connect tab selection to file loading
7. [ ] Update EditorPanel styles
8. [ ] Update EditorPanel tests

**Verification:**
9. [ ] All tests pass
10. [ ] Lint passes

### Step 10: Update IDEContext with Filesystem

**Tests First:**
1. [ ] **TEST**: IDEContext provides filesystem hook
2. [ ] **TEST**: IDEContext tracks open files
3. [ ] **TEST**: IDEContext tracks active file path
4. [ ] **TEST**: IDEContext handles openFile action
5. [ ] **TEST**: IDEContext handles closeFile action
6. [ ] **TEST**: IDEContext saves file on code change (debounced)

**Implementation:**
7. [ ] Add useFileSystem to IDEContext
8. [ ] Add open files state management
9. [ ] Implement openFile and closeFile actions
10. [ ] Add auto-save with debouncing
11. [ ] Update IDEContext tests

**Verification:**
12. [ ] All tests pass
13. [ ] Lint passes

### Step 11: Implement Lua require() Override

**Tests First:**
1. [ ] **TEST**: require("module") loads module.lua from root
2. [ ] **TEST**: require("folder.module") loads folder/module.lua
3. [ ] **TEST**: require("folder") loads folder/init.lua
4. [ ] **TEST**: require caches loaded modules
5. [ ] **TEST**: require throws for missing module
6. [ ] **TEST**: require handles circular dependencies gracefully
7. [ ] **TEST**: Cleared cache on engine reset

**Implementation:**
8. [ ] Create setupVirtualRequire function in useLuaEngine
9. [ ] Implement module path resolution
10. [ ] Implement module caching
11. [ ] Wire up to filesystem hook
12. [ ] Update useLuaEngine tests

**Verification:**
13. [ ] All tests pass
14. [ ] Lint passes

### Step 12: End-to-End Integration

**Tests First:**
1. [ ] **TEST**: Create file in explorer → opens in editor
2. [ ] **TEST**: Edit file in editor → shows dirty indicator
3. [ ] **TEST**: Save file → clears dirty indicator
4. [ ] **TEST**: Delete file → closes tab if open
5. [ ] **TEST**: require() in terminal loads file from explorer
6. [ ] **TEST**: Refresh page → filesystem persists

**Implementation:**
7. [ ] Wire all components together
8. [ ] Test full user flows manually
9. [ ] Fix any integration issues

**Verification:**
10. [ ] All tests pass
11. [ ] Full flow works in browser

### Step 13: Polish and Keyboard Navigation

**Tests First:**
1. [ ] **TEST**: File icons render correctly by extension
2. [ ] **TEST**: F2 key triggers rename on selected item
3. [ ] **TEST**: Delete key triggers delete on selected item
4. [ ] **TEST**: Enter key opens file or toggles folder
5. [ ] **TEST**: Arrow keys navigate tree

**Implementation:**
6. [ ] Add file extension icons (lua, txt, json)
7. [ ] Implement keyboard shortcuts in FileExplorer
8. [ ] Add visual polish (hover states, transitions)
9. [ ] Ensure accessibility compliance

**Verification:**
10. [ ] All tests pass
11. [ ] Keyboard navigation works
12. [ ] Lint passes

## E2E Testing

### Test Page

- **Route**: `/editor` (main feature route - tests the actual Explorer integration)
- **E2E tests validate real user workflows**

### E2E Test Cases

Location: `e2e/file-explorer.spec.ts`

- [ ] **E2E**: File explorer panel displays in sidebar
- [ ] **E2E**: Create new file via button - file appears in tree
- [ ] **E2E**: Create new folder via button - folder appears in tree
- [ ] **E2E**: Click file in tree - opens in editor with tab
- [ ] **E2E**: Edit file content - dirty indicator appears in tab
- [ ] **E2E**: Close dirty tab - confirmation dialog appears
- [ ] **E2E**: Right-click file - context menu appears with options
- [ ] **E2E**: Rename file via context menu - inline edit works
- [ ] **E2E**: Delete file via context menu - confirmation then removes
- [ ] **E2E**: Create nested folder structure - renders correctly
- [ ] **E2E**: Multiple tabs - switch between open files
- [ ] **E2E**: Run code with require() - loads module from filesystem
- [ ] **E2E**: Refresh page - filesystem persists
- [ ] **E2E**: Keyboard navigation - arrow keys navigate tree
- [ ] **E2E**: F2 key - triggers rename on selected file
- [ ] **E2E**: Delete key - triggers delete on selected file

## Testing Strategy

### Unit Tests (per component)

| Component | Tests |
|-----------|-------|
| useFileSystem | init, createFile, readFile, writeFile, deleteFile, renameFile, createFolder, deleteFolder, exists, listDirectory, getTree, persistence, validation |
| FileTreeItem | renders name, icons, selection, click handlers, context menu, rename mode, aria-labels |
| FileTree | empty state, flat list, nested folders, expand/collapse, selection, keyboard nav |
| ContextMenu | position, items, selection, click outside, escape key, keyboard nav |
| ConfirmDialog | title/message, buttons, callbacks, escape key, focus trap, aria attrs |
| FileExplorer | renders tree, buttons, context menu, CRUD handlers, useFileExplorer hook |
| TabBar | renders tabs, active highlight, dirty indicator, select/close handlers, overflow scroll |
| require() override | module loading, path resolution, caching, errors, circular deps |

### Integration Tests

- [ ] Create file → appears in tree → opens in editor
- [ ] Select file → opens in editor → edit → dirty indicator
- [ ] Delete file → closes tab if open
- [ ] Rename open file → tab updates
- [ ] require("module") → loads from filesystem
- [ ] Refresh page → filesystem persists → files reload

### Manual Testing Checklist

- [ ] Create 10+ file nested project structure
- [ ] Multi-file Lua project with require() works
- [ ] Rename/delete workflow flows naturally
- [ ] Context menu positions correctly near viewport edges
- [ ] Tab overflow scrolling works smoothly
- [ ] Keyboard-only navigation is possible
- [ ] Screen reader announces tree structure correctly

## Example Multi-File Project

```
project/
├── main.lua
├── utils/
│   ├── math.lua
│   └── string.lua
└── game/
    ├── init.lua
    └── player.lua
```

```lua
-- main.lua
local math_utils = require("utils.math")
local game = require("game")

print(math_utils.add(1, 2))
game.start()

-- utils/math.lua
local M = {}
function M.add(a, b) return a + b end
return M

-- game/init.lua
local player = require("game.player")
local M = {}
function M.start() player.spawn() end
return M

-- game/player.lua
local M = {}
function M.spawn() print("Player spawned!") end
return M
```

## Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| localStorage size limits | Data loss | Medium | Warn at 4MB, offer export |
| Complex require() edge cases | Broken modules | Medium | Test standard patterns thoroughly |
| Performance with many files | Slow UI | Low | Virtualize file tree if needed |

## Dependencies

- Phase 3: IDE Shell (IDEContext, EditorPanel must exist)

## Future Enhancements (Out of Scope)

- Cloud storage sync
- Git integration
- File search (Ctrl+P)
- Find in files (Ctrl+Shift+F)
- Drag-and-drop reordering

## Success Metrics

- [ ] Can create 10+ file project
- [ ] require() works across files
- [ ] Filesystem survives page refresh
- [ ] No data loss on normal usage

---

## Approval

- [x] Technical Review
- [x] TDD Compliance Review
- [x] Component Structure Review
- [x] E2E Testing Plan Review
