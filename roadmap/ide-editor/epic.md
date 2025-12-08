# Epic: IDE-Style Code Editor

**Status**: Completed
**Author**: Claude & Joseph
**Created**: Sun, Dec 7, 2025
**Updated**: Mon, Dec 8, 2025
**Completed**: Dec 8, 2025

## Summary

Transform the Lua Playground into a full-featured, VS Code-style IDE experience at `/editor` with an Explorer, Editor, Terminal, and REPL. The editor should also be embeddable without the Explorer for code examples and challenges.

## Goals

1. **VS Code familiarity** - Students learn real-world shortcuts and workflows
2. **Embeddability** - Editor can be embedded in tutorials and challenges
3. **Future collaboration** - Architecture supports shared editing (Yjs + y-monaco)
4. **Professional feel** - Resizable panels, file explorer, integrated terminal

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Editor | Monaco Editor | VS Code shortcuts, collaboration support, familiar UX |
| Collaboration (future) | Yjs + y-monaco | CRDT-based, proven at scale |
| Routing | React Router | Industry standard, supports `/editor` route |
| Panel System | Custom or allotment | Resizable, VS Code-like splits |

## Child Roadmap Items

| # | Plan | Status | Dependencies | Description |
|---|------|--------|--------------|-------------|
| 0 | [Foundation Refactoring](./000-foundation.md) | **Completed** | None | Extract hooks, add React Router, setup Monaco |
| 1 | [Embeddable Editor](./001-embeddable.md) | **Completed** | Phase 0 | Standalone editor component for examples/challenges |
| 2 | [Panel Layout System](./002-panels.md) | **Completed** | Phase 0 | Resizable split panel infrastructure |
| 3 | [IDE Shell](./003-ide-shell.md) | **Completed** | Phases 1, 2 | Full IDE layout at `/editor` route |
| 4 | [Explorer Panel](./004-explorer.md) | **Completed** | Phase 3 | File tree with virtual filesystem |
| 5 | [Explorer UX Polish](./005-explorer-polish.md) | **Completed** | Phase 4 | Bug fixes and UX improvements for file explorer |

## Dependency Graph

```
Phase 0: Foundation
    │
    ├──────────────────┐
    ▼                  ▼
Phase 1: Embeddable   Phase 2: Panels
    │                  │
    └────────┬─────────┘
             ▼
      Phase 3: IDE Shell
             │
             ▼
      Phase 4: Explorer
```

## Architecture Overview

### Component Hierarchy (Target State)

```
<App>
  <Router>
    <Route path="/" element={<Home />} />
    <Route path="/tutorials" element={<Tutorials />} />
    <Route path="/editor" element={<IDELayout />} />
  </Router>
</App>

<IDELayout>
  ├── <PanelGroup direction="horizontal">
  │   ├── <Panel> <Explorer /> </Panel>
  │   ├── <PanelResizeHandle />
  │   ├── <Panel> <CodeEditor /> </Panel>
  │   ├── <PanelResizeHandle />
  │   └── <Panel>
  │       ├── <Terminal />
  │       └── <Repl />
  │   </Panel>
  └── </PanelGroup>
</IDELayout>

<EmbeddableEditor>  <!-- For tutorials/challenges -->
  ├── <CodeEditor />
  └── <OutputPanel /> (optional)
</EmbeddableEditor>
```

### Hooks (Target State)

```typescript
// Core Lua execution
useLuaEngine() → { engine, isReady, execute, reset }

// Monaco editor state
useMonacoEditor() → { editor, value, setValue, language }

// Virtual filesystem (Phase 4)
useFileSystem() → { files, openFile, saveFile, createFile, deleteFile }
```

## Success Criteria

- [x] `/editor` route loads VS Code-style IDE
- [x] All VS Code shortcuts work (Ctrl+D, Alt+Up/Down, Ctrl+/, etc.)
- [x] Panels are resizable and persist layout
- [x] Editor is embeddable with `<EmbeddableEditor code="..." />`
- [x] Existing Playground functionality preserved
- [x] Mobile-responsive (panels stack vertically)
- [x] Performance: Editor loads in < 2 seconds

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Monaco bundle size | Slower initial load | Lazy loading, code splitting |
| Monaco mobile support | Poor mobile UX | Test early, consider fallback |
| Scope creep | Delayed delivery | Strict phase boundaries |

## Out of Scope (For Now)

- LSP / IntelliSense for Lua
- Git integration
- Extensions/plugins system
- Cloud file storage
- Real-time collaboration (architecture supports it, implementation later)

---

## Progress Tracking

### Phase 0: Foundation
- [x] Completed (Dec 7, 2025)

### Phase 1: Embeddable Editor
- [x] Completed (Dec 7, 2025)

### Phase 2: Panel Layout System
- [x] Completed (Dec 7, 2025)

### Phase 3: IDE Shell
- [x] Completed (Dec 7, 2025)

### Phase 4: Explorer Panel
- [x] Completed (Dec 8, 2025)

### Phase 5: Explorer UX Polish
- [x] Completed (Dec 8, 2025)
