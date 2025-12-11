# Architecture

This document describes the high-level architecture of LuaInTheWeb.

## System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                          Browser                                  │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌───────────────────────────┐ │
│  │   React     │  │  CodeMirror │  │        xterm.js           │ │
│  │   App       │  │   Editor    │  │  Terminal / Shell / REPL  │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────┬─────────────┘ │
│         │                │                       │               │
│         └────────────────┼───────────────────────┘               │
│                          │                                       │
│         ┌────────────────┼────────────────┐                      │
│         │                │                │                      │
│   ┌─────▼─────┐   ┌──────▼──────┐  ┌──────▼──────┐              │
│   │  wasmoon  │   │ shell-core  │  │ Virtual FS  │              │
│   │   (Lua    │   │ (Commands,  │  │ (In-memory  │              │
│   │  Runtime) │   │  Registry)  │  │  files)     │              │
│   └───────────┘   └─────────────┘  └─────────────┘              │
└──────────────────────────────────────────────────────────────────┘
```

## Package Structure

The project uses npm workspaces with a monorepo structure:

```
LuaInTheWeb/
├── packages/
│   └── shell-core/              # Independent shell package
│       ├── src/
│       │   ├── commands/        # Built-in commands (cd, ls, pwd, help)
│       │   ├── types.ts         # Core interfaces
│       │   ├── CommandRegistry.ts
│       │   ├── createFileSystemAdapter.ts
│       │   ├── parseCommand.ts
│       │   └── pathUtils.ts
│       └── tests/
│
└── lua-learning-website/        # Main web application
    ├── src/
    │   ├── components/
    │   │   └── ShellTerminal/   # Shell UI component
    │   └── hooks/
    │       └── useShell.ts      # Shell integration hook
    └── package.json
```

## Core Components

### App.tsx

The main application component. Handles:
- Navigation between views (Home, Tutorials, Examples, Playground)
- Top-level routing and layout

### LuaPlayground.tsx

The code editor mode for writing and executing Lua scripts:
- Integrates CodeMirror for syntax-highlighted editing
- Executes code via wasmoon
- Displays output in terminal

### LuaRepl.tsx

Interactive REPL (Read-Eval-Print Loop) for command-line-style interaction:
- Line-by-line Lua execution
- Command history
- Immediate feedback

### BashTerminal.tsx

Terminal emulator component using xterm.js:
- Multi-line input support (Shift+Enter)
- Command history navigation (arrow keys)
- Cursor positioning and editing
- ANSI color support
- Interactive input handling (io.read support)

### ShellTerminal.tsx

Shell interface for file system navigation, built on shell-core:
- Uses xterm.js for terminal UI
- Integrates with virtual filesystem via useShell hook
- Supports built-in commands: `pwd`, `cd`, `ls`, `help`
- Extensible command system via CommandRegistry

## Shell-Core Package

The `@lua-learning/shell-core` package provides the core shell infrastructure, extracted for:
- **Isolated testing**: Faster feedback, clearer coverage
- **Independent versioning**: Can version separately from main app
- **Cleaner architecture**: No UI dependencies
- **Reuse potential**: CLI tools, tutorials, other contexts

### Key Abstractions

**IFileSystem Interface**: Decouples shell commands from filesystem implementation
```typescript
interface IFileSystem {
  getCurrentDirectory(): string
  setCurrentDirectory(path: string): void
  exists(path: string): boolean
  isDirectory(path: string): boolean
  listDirectory(path: string): FileEntry[]
  // ... and more
}
```

**CommandRegistry**: Manages command registration and execution
```typescript
const registry = new CommandRegistry()
registerBuiltinCommands(registry)
registry.execute('ls', ['-la'], filesystem)
```

**createFileSystemAdapter**: Bridges external filesystems to IFileSystem
```typescript
const fs = createFileSystemAdapter(editorFileSystem, '/')
```

### Shell Integration Flow

1. `useShell` hook initializes CommandRegistry and filesystem adapter
2. User types command in ShellTerminal
3. Command is parsed via `parseCommand()`
4. Registry executes command against filesystem
5. Result (stdout/stderr/exitCode) displayed in terminal

## Data Flow

1. User writes code in CodeMirror editor
2. User clicks "Run" or presses shortcut
3. Code is passed to wasmoon Lua runtime
4. wasmoon executes Lua in WebAssembly sandbox
5. Output is captured and displayed in xterm terminal

## Key Design Decisions

### WebAssembly Lua Runtime

We use wasmoon to run Lua in the browser because:
- No server required - all execution is client-side
- Secure sandboxed execution
- Full Lua 5.4 compatibility
- Good performance

### xterm.js for Terminal

xterm.js provides:
- Authentic terminal experience
- ANSI escape code support
- Efficient rendering
- Interactive input capabilities

## State Management

Currently using React's built-in state (useState, useRef). As the application grows, consider:
- React Context for shared state
- Zustand for more complex state management

## Future Architecture Considerations

- **Tutorial System**: Will need content management and progress tracking
- **User Accounts**: May require backend services
- **Code Sharing**: May require backend for persistence
