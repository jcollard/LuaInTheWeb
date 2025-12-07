# Architecture

This document describes the high-level architecture of LuaInTheWeb.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Browser                               │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   React     │  │  CodeMirror │  │      xterm.js       │  │
│  │   App       │  │   Editor    │  │     Terminal        │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │             │
│         └────────────────┼─────────────────────┘             │
│                          │                                   │
│                    ┌─────▼─────┐                            │
│                    │  wasmoon  │                            │
│                    │   (Lua    │                            │
│                    │  Runtime) │                            │
│                    └───────────┘                            │
└─────────────────────────────────────────────────────────────┘
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
