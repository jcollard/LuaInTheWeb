# Phase 4: Explorer Panel

**Status**: Draft
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Sun, Dec 7, 2025
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

## Implementation Plan

### Step 1: Create Virtual Filesystem Hook

1. [ ] Create `src/hooks/useFileSystem.ts`
2. [ ] Implement CRUD operations
3. [ ] Add localStorage persistence
4. [ ] Write comprehensive tests

### Step 2: Create File Tree Component

1. [ ] Create `FileTree.tsx` recursive component
2. [ ] Create `FileTreeItem.tsx` for individual items
3. [ ] Add expand/collapse folders
4. [ ] Add selection highlighting
5. [ ] Style like VS Code explorer

### Step 3: Add Context Menu

1. [ ] Create context menu component
2. [ ] Add "New File", "New Folder" options
3. [ ] Add "Rename", "Delete" options
4. [ ] Handle keyboard shortcuts (F2 rename, Delete)

### Step 4: Implement Tab Bar

1. [ ] Create `TabBar.tsx` component
2. [ ] Track open files in IDE context
3. [ ] Add close button with dirty check
4. [ ] Handle tab overflow (scroll or dropdown)

### Step 5: Wire Up Editor

1. [ ] Connect file selection to editor
2. [ ] Save file content on change (debounced)
3. [ ] Prompt before closing dirty tabs
4. [ ] Update tab dirty state

### Step 6: Implement Lua require()

1. [ ] Override require in useLuaEngine
2. [ ] Implement module path resolution
3. [ ] Add module caching
4. [ ] Test with multi-file project

### Step 7: Polish

1. [ ] Add file icons by extension
2. [ ] Add drag-and-drop (stretch)
3. [ ] Add keyboard navigation
4. [ ] Add project export/import

## Testing Strategy

### Unit Tests

- [ ] useFileSystem - CRUD operations
- [ ] useFileSystem - persistence
- [ ] useFileSystem - tree generation
- [ ] FileTree - renders hierarchy
- [ ] FileTree - expand/collapse
- [ ] FileTreeItem - selection
- [ ] TabBar - renders tabs
- [ ] TabBar - close with dirty check
- [ ] require() - finds modules
- [ ] require() - caches modules
- [ ] require() - handles errors

### Integration Tests

- [ ] Create file → appears in tree
- [ ] Select file → opens in editor
- [ ] Edit file → shows dirty indicator
- [ ] require() → loads from filesystem
- [ ] Refresh page → filesystem persists

### Manual Testing

- [ ] Create nested folder structure
- [ ] Multi-file Lua project with require()
- [ ] Rename/delete workflow
- [ ] Export/import project

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

- [ ] Technical Review
- [ ] Code Review Plan
- [ ] Testing Plan Review
