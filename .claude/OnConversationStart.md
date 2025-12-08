# Project Context

This file is automatically injected at the start of each Claude Code session.

## Project Overview

LuaInTheWeb is a web-based Lua learning and practice platform that allows users to learn and execute Lua code directly in their browsers.

**Tech Stack:** React 19 + TypeScript 5.9 + Vite 7 + wasmoon (WebAssembly Lua)

## Project Structure

```
lua-learning-website/
├── src/
│   ├── components/     # React components (LuaPlayground, LuaRepl, BashTerminal)
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── types/          # TypeScript type definitions
│   └── __tests__/      # Test files
├── public/             # Static assets
└── package.json        # Dependencies
```

## Documentation

Reference these docs for detailed information (do not load entire files unless needed):

- **Developer Guide**: [docs/README.md](docs/README.md)
- **Getting Started**: [docs/getting-started.md](docs/getting-started.md)
- **Architecture**: [docs/architecture.md](docs/architecture.md)
- **Coding Standards**: [docs/coding-standards.md](docs/coding-standards.md)
- **Testing Guide**: [docs/testing.md](docs/testing.md)
- **Contributing**: [docs/contributing.md](docs/contributing.md)

## Roadmap

- **Current Plans**: [roadmap/README.md](roadmap/README.md)
- **Plan Template**: [roadmap/_template.md](roadmap/_template.md)

For new features, create a plan in the roadmap directory before implementation.

## Development Practices

### Conventions

- **Python**: Always use `python` (not `python3`) for scripts
- **Timestamps**: When updating dates in files, use `date` command to get current timestamp

### Code Architecture

- **UI Components are PURE**: No business logic in UI components - only props, event wiring, and rendering
- **Logic in Hooks**: Extract all business logic into custom hooks for testability
- **CSS Modules**: Use CSS modules for style isolation; REUSE existing modules before creating new ones
- **Strict TypeScript**: No `any`, explicit types, prefer interfaces

See [docs/coding-standards.md](docs/coding-standards.md) for detailed guidelines.

### TDD is MANDATORY

This project follows strict Test-Driven Development:

1. **RED**: Write a failing test FIRST
2. **GREEN**: Write minimum code to pass
3. **REFACTOR**: Improve while tests pass

Use `/tdd` command for detailed TDD guidelines.

### Mutation Testing

Tests must be verified with mutation testing to ensure they actually catch bugs.

Use `/mutation-test` command for mutation testing guidelines.

### Before Completing Any Task

- [ ] Tests written BEFORE implementation
- [ ] All tests pass: `npm run test`
- [ ] Mutation score > 80%: `npm run test:mutation`
- [ ] Linting passes: `npm run lint`

## Commands

```bash
cd lua-learning-website
npm run dev           # Start development server
npm run test          # Run tests
npm run test:watch    # Watch mode
npm run test:mutation # Mutation testing
npm run build         # Build for production
npm run lint          # Run linter
```

## Special Commands

- `/tdd` - Inject TDD guidelines for current task
- `/mutation-test` - Inject mutation testing guidelines
- `/code-review` - Inject code review checklist
- `/new-feature` - Inject new feature development guidelines

## Continuation Policy
- NEVER stop to ask "Do you want to continue?" or "Should I proceed?"
- Work through the ENTIRE task list until completion
- If context gets full, auto-compact and continue working
- Only stop for actual blockers (missing info, errors, ambiguity)
- Avoid using bash commands that are not present in @settings.local.json or @.claude/settings.json 
- When you finish. Create another comprehensive ToDo Task List with remaining items and continue until there is nothing left to complete.