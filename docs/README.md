# Developer Documentation

Welcome to the LuaInTheWeb developer documentation. This directory contains all the information you need to contribute to the project.

## Quick Links

- [Getting Started](./getting-started.md) - Set up your development environment
- [Architecture](./architecture.md) - System design and component overview
- [Coding Standards](./coding-standards.md) - Component patterns, CSS modules, TypeScript
- [Testing Guide](./testing.md) - TDD practices and testing standards
- [Contributing](./contributing.md) - How to contribute to the project

## ANSI Graphics Editor

- [Editor Architecture](./ansi-graphics-editor.md) - Component hierarchy, state management, rendering pipeline
- [Editor Development Guide](./ansi-editor-development.md) - Adding tools, extending layers, testing patterns

## Lua API Documentation

- [LocalStorage API](./localstorage-api.md) - Persistent key-value storage for saving game data

## Prerequisites

Before getting started, ensure you have:

- Node.js 18+ and npm 9+
- Git
- **uv/uvx** for Code-Index-MCP (required for Claude Code workflow)

See [Getting Started](./getting-started.md) for detailed setup instructions including MCP configuration.

## Project Overview

LuaInTheWeb is a web-based Lua learning and practice platform that allows users to learn and execute Lua code directly in their browsers.

### Tech Stack

- **Frontend**: React 19 + TypeScript 5.9
- **Build Tool**: Vite 7
- **Lua Runtime**: wasmoon (WebAssembly-based Lua)
- **Code Editor**: CodeMirror
- **Terminal**: xterm.js

## Development Workflow

> **Branch Policy:** Never commit directly to main. All changes go through branches and PRs.

1. Check the [roadmap](../roadmap/) for current plans
2. Follow TDD practices (see [Testing Guide](./testing.md))
3. Run mutation tests to verify test quality
4. Submit PR for review

## Directory Structure

```
lua-learning-website/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── __tests__/      # Test files
├── public/             # Static assets
└── package.json        # Dependencies
```
